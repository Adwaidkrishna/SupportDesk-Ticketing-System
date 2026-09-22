import mongoose from 'mongoose';
import Ticket from '../../models/Ticket.js';
import User from '../../models/User.js';
import { getIO } from '../../socket/socket.js';
import { createNotification } from '../notification/index.js';

/**
 * Service for Admin to assign, reassign, or unassign an agent on a ticket.
 * Preserves the ticket's current status and lifecycle state.
 *
 * @param {string} ticketId - ObjectId string or ticket number
 * @param {string|null} agentId - Agent ObjectId string to assign, or null to unassign
 * @param {string} adminId - Authenticated admin's User ObjectId
 * @returns {Promise<Object>} Updated ticket object
 */
export const assignTicketAgent = async (ticketId, agentId, adminId) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(ticketId);
  const lookupQuery = isObjectId
    ? { $or: [{ _id: ticketId }, { ticketNumber: ticketId }] }
    : { ticketNumber: ticketId };

  const ticket = await Ticket.findOne(lookupQuery);

  if (!ticket) {
    const error = new Error('Ticket not found.');
    error.statusCode = 404;
    throw error;
  }

  let assignedAgentDoc = null;

  if (agentId) {
    assignedAgentDoc = await User.findOne({ _id: agentId, role: 'agent' });
    if (!assignedAgentDoc) {
      const error = new Error('Agent not found or user is not an agent.');
      error.statusCode = 404;
      throw error;
    }
    ticket.assignedTo = assignedAgentDoc._id;
  } else {
    ticket.assignedTo = null;
  }

  // Preserve existing ticket status without auto-transitioning
  await ticket.save();

  // Populate references for return
  await ticket.populate('customerId', 'name email avatar department phone');
  await ticket.populate('assignedTo', 'name email department availability role');
  await ticket.populate('categoryId', 'name description');

  // Real-time Socket.IO emission to canonical ticket room reusing existing ticket:status payload
  try {
    const io = getIO();
    io.to(`ticket:${ticket.ticketNumber}`).emit('ticket:status', {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      assignedTo: ticket.assignedTo ? ticket.assignedTo._id.toString() : null,
    });
  } catch (socketErr) {
    console.warn('[Socket] Real-time assignment broadcast skipped:', socketErr.message);
  }

  // Reuse existing notification system: notify the newly assigned agent
  if (assignedAgentDoc) {
    try {
      await createNotification({
        recipient: assignedAgentDoc._id,
        sender: adminId,
        type: 'ticket_assigned',
        title: `Ticket #${ticket.ticketNumber} Assigned`,
        message: `Ticket "${ticket.subject}" has been assigned to you by Administrator.`,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        targetRoute: `/agent/tickets/${ticket._id}`,
      });
    } catch (notifErr) {
      console.warn('[Notification] Failed to create assignment notification:', notifErr.message);
    }
  }

  return {
    ticket: {
      id: ticket._id.toString(),
      _id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      customer: ticket.customerId
        ? {
            id: ticket.customerId._id.toString(),
            name: ticket.customerId.name,
            email: ticket.customerId.email,
          }
        : null,
      category: ticket.categoryId
        ? {
            id: ticket.categoryId._id.toString(),
            name: ticket.categoryId.name,
          }
        : null,
      assignedTo: ticket.assignedTo
        ? {
            id: ticket.assignedTo._id.toString(),
            name: ticket.assignedTo.name,
            email: ticket.assignedTo.email,
            department: ticket.assignedTo.department,
          }
        : null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    },
  };
};

export default assignTicketAgent;
