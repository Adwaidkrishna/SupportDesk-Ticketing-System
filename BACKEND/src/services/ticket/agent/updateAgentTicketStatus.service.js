import Ticket from '../../../models/Ticket.js';
import { getIO } from '../../../socket/socket.js';
import { createNotification } from '../../notification/index.js';

/**
 * Service to update the status of an assigned ticket (Resolve or Close) by the assigned agent.
 *
 * Transitions allowed:
 * - IN_PROGRESS -> RESOLVED
 * - IN_PROGRESS -> CLOSED
 *
 * Enforces:
 * - Ticket exists (404 if not).
 * - Authenticated agent is the assigned agent (403 if unassigned or assigned to someone else).
 * - Current ticket status must be IN_PROGRESS (400 if invalid transition).
 * - Emits real-time ticket:status event to canonical ticket room.
 * - Returns clean serialized ticket object.
 *
 * @param {string} ticketId - MongoDB ObjectId of the ticket
 * @param {string} agentId - Authenticated agent's ObjectId from JWT
 * @param {'RESOLVED'|'CLOSED'} status - Desired target status
 * @returns {Promise<Object>} Updated ticket object
 */
export const updateAgentTicketStatus = async (ticketId, agentId, status) => {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    const error = new Error('Ticket not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify agent assignment
  if (!ticket.assignedTo || ticket.assignedTo.toString() !== agentId.toString()) {
    const error = new Error('Access denied: You are not assigned to this ticket');
    error.statusCode = 403;
    throw error;
  }

  // Enforce transition rule: only IN_PROGRESS tickets can be resolved or closed
  if (ticket.status !== 'IN_PROGRESS') {
    const error = new Error(
      `Invalid state transition: Cannot change status from ${ticket.status} to ${status}. Only IN_PROGRESS tickets can be resolved or closed.`
    );
    error.statusCode = 400;
    throw error;
  }

  ticket.status = status;
  if (status === 'RESOLVED') {
    const { recordResolution } = await import('../../sla/sla.service.js');
    await recordResolution(ticketId);
  }
  await ticket.save();

  // Populate references for safe return
  await ticket.populate('customerId', 'name email');
  await ticket.populate('categoryId', 'name description');
  await ticket.populate('assignedTo', 'name email');

  const responseTicket = {
    id: ticket._id.toString(),
    _id: ticket._id.toString(),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    customer: ticket.customerId
      ? {
          id: ticket.customerId._id.toString(),
          _id: ticket.customerId._id.toString(),
          name: ticket.customerId.name,
          email: ticket.customerId.email,
        }
      : null,
    categoryId: ticket.categoryId ? ticket.categoryId._id.toString() : null,
    category: ticket.categoryId
      ? {
          id: ticket.categoryId._id.toString(),
          _id: ticket.categoryId._id.toString(),
          name: ticket.categoryId.name,
          description: ticket.categoryId.description,
        }
      : null,
    assignedTo: ticket.assignedTo
      ? {
          id: ticket.assignedTo._id.toString(),
          _id: ticket.assignedTo._id.toString(),
          name: ticket.assignedTo.name,
          email: ticket.assignedTo.email,
        }
      : null,
    priority: ticket.priority,
    status: ticket.status,
    sla: ticket.sla,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };

  // Real-time Socket.IO emission to canonical ticket room
  try {
    const io = getIO();
    io.to(`ticket:${ticket.ticketNumber}`).emit('ticket:status', {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      assignedTo: agentId.toString(),
    });
  } catch (socketErr) {
    console.warn('[Socket] Real-time status update broadcast skipped:', socketErr.message);
  }

  // Real-time notification: notify the customer
  const customerRecipientId = ticket.customerId?._id || ticket.customerId;
  if (customerRecipientId) {
    const statusType = status === 'RESOLVED' ? 'ticket_resolved' : 'ticket_closed';
    const statusLabel = status === 'RESOLVED' ? 'Resolved' : 'Closed';
    createNotification({
      recipient: customerRecipientId,
      sender: agentId,
      type: statusType,
      title: `Ticket #${ticket.ticketNumber} ${statusLabel}`,
      message: `Your ticket "${ticket.subject}" has been marked as ${statusLabel.toLowerCase()}.`,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      targetRoute: `/customer/tickets/${ticket.ticketNumber}`,
    }).catch((err) => console.warn('[Notification] Failed to notify customer on status update:', err.message));
  }

  return responseTicket;
};

export default updateAgentTicketStatus;
