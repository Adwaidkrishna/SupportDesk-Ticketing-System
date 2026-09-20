import Ticket from '../../models/Ticket.js';
import { createNotification } from '../notification.service.js';

/**
 * Service to atomically claim an unassigned OPEN ticket by an authorized agent.
 *
 * Business rules:
 * - Only tickets where status is OPEN and assignedTo is null (or unset) can be claimed.
 * - Atomically sets assignedTo to current agent and status to IN_PROGRESS.
 * - Prevents race conditions where two agents attempt to claim concurrently.
 *
 * @param {string} ticketId - MongoDB ObjectId of the ticket
 * @param {string} agentId - Authenticated Agent's User ObjectId from JWT
 * @returns {Promise<Object>} Updated ticket data
 */
export const claimTicket = async (ticketId, agentId) => {
  // Atomic query matching claim criteria
  const query = {
    _id: ticketId,
    status: 'OPEN',
    $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
  };

  const update = {
    $set: {
      assignedTo: agentId,
      status: 'IN_PROGRESS',
    },
  };

  // Perform atomic update
  const updatedTicket = await Ticket.findOneAndUpdate(query, update, {
    returnDocument: 'after',
  })
    .populate('customerId', 'name email')
    .populate('categoryId', 'name description')
    .populate('assignedTo', 'name email')
    .lean();


  if (!updatedTicket) {
    // Determine precise failure reason
    const existingTicket = await Ticket.findById(ticketId).lean();

    if (!existingTicket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }

    if (existingTicket.assignedTo) {
      const err = new Error('Ticket has already been claimed by another agent');
      err.statusCode = 409;
      throw err;
    }

    if (existingTicket.status !== 'OPEN') {
      const err = new Error(`Ticket cannot be claimed because its status is ${existingTicket.status}`);
      err.statusCode = 409;
      throw err;
    }

    const err = new Error('Ticket is no longer available to claim');
    err.statusCode = 409;
    throw err;
  }

  const customer = updatedTicket.customerId
    ? {
        id: updatedTicket.customerId._id.toString(),
        _id: updatedTicket.customerId._id.toString(),
        name: updatedTicket.customerId.name,
        email: updatedTicket.customerId.email,
      }
    : null;

  const category = updatedTicket.categoryId
    ? {
        id: updatedTicket.categoryId._id.toString(),
        _id: updatedTicket.categoryId._id.toString(),
        name: updatedTicket.categoryId.name,
        description: updatedTicket.categoryId.description,
      }
    : null;

  const assignedTo = updatedTicket.assignedTo
    ? {
        id: updatedTicket.assignedTo._id.toString(),
        _id: updatedTicket.assignedTo._id.toString(),
        name: updatedTicket.assignedTo.name,
        email: updatedTicket.assignedTo.email,
      }
    : null;

  const ticketData = {
    id: updatedTicket._id.toString(),
    _id: updatedTicket._id.toString(),
    ticketNumber: updatedTicket.ticketNumber,
    subject: updatedTicket.subject,
    description: updatedTicket.description,
    status: updatedTicket.status,
    priority: updatedTicket.priority,
    customer,
    customerId: customer ? customer.id : null,
    category,
    categoryId: category ? category.id : null,
    assignedTo,
    createdAt: updatedTicket.createdAt,
    updatedAt: updatedTicket.updatedAt,
  };

  // Real-time notification: notify customer that agent claimed the ticket
  const agentName = assignedTo?.name || 'An agent';
  const customerRecipientId = updatedTicket.customerId?._id || updatedTicket.customerId;
  if (customerRecipientId) {
    createNotification({
      recipient: customerRecipientId,
      sender: agentId,
      type: 'ticket_assigned',
      title: `Ticket #${updatedTicket.ticketNumber} Claimed`,
      message: `${agentName} has claimed your ticket "${updatedTicket.subject}".`,
      ticketId: updatedTicket._id,
      ticketNumber: updatedTicket.ticketNumber,
      targetRoute: `/customer/tickets/${updatedTicket.ticketNumber}`,
    }).catch((err) => console.warn('[Notification] Failed to notify customer on claim:', err.message));
  }

  return {
    ...ticketData,
    ticket: ticketData,
  };
};

export default claimTicket;
