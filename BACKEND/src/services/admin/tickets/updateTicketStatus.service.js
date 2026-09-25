import mongoose from 'mongoose';
import Ticket from '../../../models/Ticket.js';
import { getIO } from '../../../socket/socket.js';
import { createNotification } from '../../notification/index.js';

/**
 * Service for Admin to update ticket status.
 *
 * @param {string} ticketId - ObjectId string or ticket number
 * @param {'OPEN'|'IN_PROGRESS'|'RESOLVED'|'CLOSED'} status - Desired target status
 * @param {string} adminId - Authenticated admin's User ObjectId
 * @returns {Promise<Object>} Updated ticket object
 */
export const updateTicketStatus = async (ticketId, status, adminId) => {
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

  const previousStatus = ticket.status;
  ticket.status = status;
  if (status === 'RESOLVED') {
    const { recordResolution } = await import('../../sla/sla.service.js');
    await recordResolution(ticket, { save: false });
  }
  await ticket.save();

  await ticket.populate('customerId', 'name email avatar department phone');
  await ticket.populate('assignedTo', 'name email department availability role');
  await ticket.populate('categoryId', 'name description');

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
    console.warn('[Socket] Real-time status broadcast skipped:', socketErr.message);
  }

  // Real-time notification: notify the customer
  const customerRecipientId = ticket.customerId?._id || ticket.customerId;
  if (customerRecipientId && previousStatus !== status) {
    try {
      let notifType = 'status_changed';
      let notifTitle = `Ticket #${ticket.ticketNumber} Status Updated`;
      let notifMessage = `Your ticket "${ticket.subject}" status was changed to ${status} by Administrator.`;

      if (status === 'RESOLVED') {
        notifType = 'ticket_resolved';
        notifTitle = `Ticket #${ticket.ticketNumber} Resolved`;
        notifMessage = `Your ticket "${ticket.subject}" has been marked as resolved by Administrator.`;
      } else if (status === 'CLOSED') {
        notifType = 'ticket_closed';
        notifTitle = `Ticket #${ticket.ticketNumber} Closed`;
        notifMessage = `Your ticket "${ticket.subject}" has been closed by Administrator.`;
      }

      await createNotification({
        recipient: customerRecipientId,
        sender: adminId,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        targetRoute: `/customer/tickets/${ticket.ticketNumber}`,
      });
    } catch (notifErr) {
      console.warn('[Notification] Failed to create status notification:', notifErr.message);
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
      sla: ticket.sla,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    },
  };
};

export default updateTicketStatus;
