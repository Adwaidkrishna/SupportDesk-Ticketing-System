import Ticket from '../../models/Ticket.js';
import { getIO } from '../../socket/socket.js';
import { createNotification, notifyRole } from '../notification.service.js';

/**
 * Service to reopen a RESOLVED ticket back to IN_PROGRESS.
 *
 * Allowed actors:
 * - Customer (ticket owner)
 * - Assigned Agent (ticket assignedTo)
 * - Admin
 *
 * Enforces:
 * - Ticket exists (404 if not).
 * - Caller authorization (403 if unauthorized customer or unrelated agent).
 * - Current status must be RESOLVED (400 if not).
 * - assignedTo remains unchanged.
 * - Emits real-time ticket:status event to canonical ticket room.
 * - Returns clean serialized ticket object.
 *
 * @param {string} ticketId - MongoDB ObjectId of the ticket
 * @param {string} userId - Authenticated user's ObjectId from JWT
 * @param {string} role - Authenticated user's role ('customer' | 'agent' | 'admin')
 * @returns {Promise<Object>} Updated ticket object
 */
export const reopenTicket = async (ticketId, userId, role) => {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    const error = new Error('Ticket not found');
    error.statusCode = 404;
    throw error;
  }

  const normalizedRole = (role || '').toLowerCase();

  // Authorize caller
  if (normalizedRole === 'admin') {
    // Admin is authorized
  } else if (normalizedRole === 'customer') {
    if (ticket.customerId.toString() !== userId.toString()) {
      const error = new Error('Access denied: You do not own this ticket');
      error.statusCode = 403;
      throw error;
    }
  } else if (normalizedRole === 'agent') {
    if (!ticket.assignedTo || ticket.assignedTo.toString() !== userId.toString()) {
      const error = new Error('Access denied: You are not assigned to this ticket');
      error.statusCode = 403;
      throw error;
    }
  } else {
    const error = new Error('Access denied: Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  // Validate state transition: only RESOLVED tickets can be reopened
  if (ticket.status !== 'RESOLVED') {
    const error = new Error(
      `Invalid state transition: Cannot reopen ticket with status ${ticket.status}. Only RESOLVED tickets can be reopened.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Reopen ticket back to IN_PROGRESS while preserving assignedTo
  ticket.status = 'IN_PROGRESS';
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
      assignedTo: ticket.assignedTo ? ticket.assignedTo._id.toString() : null,
    });
  } catch (socketErr) {
    console.warn('[Socket] Real-time status update broadcast skipped:', socketErr.message);
  }

  // Real-time notification: notify relevant other party
  const callerRole = (role || '').toLowerCase();
  const callerIdStr = userId.toString();

  if (callerRole === 'customer') {
    if (ticket.assignedTo) {
      createNotification({
        recipient: ticket.assignedTo._id || ticket.assignedTo,
        sender: userId,
        type: 'ticket_reopened',
        title: `Ticket #${ticket.ticketNumber} Reopened`,
        message: `Customer reopened ticket "${ticket.subject}".`,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        targetRoute: `/agent/tickets/${ticket.ticketNumber}`,
      }).catch((err) => console.warn('[Notification] Failed to notify agent on reopen:', err.message));
    } else {
      notifyRole('agent', {
        sender: userId,
        type: 'ticket_reopened',
        title: `Ticket #${ticket.ticketNumber} Reopened`,
        message: `Customer reopened unassigned ticket "${ticket.subject}".`,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        targetRoute: `/agent/tickets/${ticket.ticketNumber}`,
      }).catch((err) => console.warn('[Notification] Failed to notify agents on reopen:', err.message));
    }
  } else if (callerRole === 'agent') {
    const customerRecipientId = ticket.customerId?._id || ticket.customerId;
    if (customerRecipientId) {
      createNotification({
        recipient: customerRecipientId,
        sender: userId,
        type: 'ticket_reopened',
        title: `Ticket #${ticket.ticketNumber} Reopened`,
        message: `Agent reopened your ticket "${ticket.subject}".`,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        targetRoute: `/customer/tickets/${ticket.ticketNumber}`,
      }).catch((err) => console.warn('[Notification] Failed to notify customer on reopen:', err.message));
    }
  } else if (callerRole === 'admin') {
    const customerRecipientId = ticket.customerId?._id || ticket.customerId;
    if (customerRecipientId) {
      createNotification({
        recipient: customerRecipientId,
        sender: userId,
        type: 'ticket_reopened',
        title: `Ticket #${ticket.ticketNumber} Reopened`,
        message: `Admin reopened your ticket "${ticket.subject}".`,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        targetRoute: `/customer/tickets/${ticket.ticketNumber}`,
      }).catch((err) => console.warn('[Notification] Failed to notify customer on admin reopen:', err.message));
    }
    const assignedAgentId = ticket.assignedTo?._id || ticket.assignedTo;
    if (assignedAgentId && assignedAgentId.toString() !== callerIdStr) {
      createNotification({
        recipient: assignedAgentId,
        sender: userId,
        type: 'ticket_reopened',
        title: `Ticket #${ticket.ticketNumber} Reopened`,
        message: `Admin reopened ticket "${ticket.subject}".`,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        targetRoute: `/agent/tickets/${ticket.ticketNumber}`,
      }).catch((err) => console.warn('[Notification] Failed to notify agent on admin reopen:', err.message));
    }
  }

  return responseTicket;
};

export default reopenTicket;
