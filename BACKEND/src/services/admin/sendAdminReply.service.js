import mongoose from 'mongoose';
import Ticket from '../../models/Ticket.js';
import TicketMessage from '../../models/TicketMessage.js';
import { getIO } from '../../socket/socket.js';
import { createNotification } from '../notification/index.js';

/**
 * Service for Admin to send an official reply on a ticket.
 *
 * @param {string} ticketId - ObjectId string or ticket number
 * @param {string} adminId - Authenticated admin's User ObjectId from JWT
 * @param {string} body - Validated message body text
 * @returns {Promise<Object>} Created message object
 */
export const sendAdminReply = async (ticketId, adminId, body) => {
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

  if (ticket.status === 'CLOSED') {
    const error = new Error('Ticket is closed. No further messages can be sent.');
    error.statusCode = 400;
    throw error;
  }

  const message = await TicketMessage.create({
    ticketId: ticket._id,
    senderId: adminId,
    senderRole: 'admin',
    body: body.trim(),
  });

  await message.populate('senderId', 'name email role');

  const responseMessage = {
    id: message._id.toString(),
    _id: message._id.toString(),
    ticketId: message.ticketId.toString(),
    senderId: adminId.toString(),
    senderRole: message.senderRole,
    sender: {
      id: adminId.toString(),
      _id: adminId.toString(),
      name: message.senderId?.name || 'Administrator',
      email: message.senderId?.email || '',
      role: message.senderId?.role || 'admin',
    },
    senderName: message.senderId?.name ? `${message.senderId.name} (Admin)` : 'Administrator',
    body: message.body,
    text: message.body,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };

  // Real-time Socket.IO Broadcast to canonical Ticket Room
  try {
    const io = getIO();
    io.to(`ticket:${ticket.ticketNumber}`).emit('message:new', responseMessage);
  } catch (socketErr) {
    console.warn('[Socket] Real-time message broadcast skipped:', socketErr.message);
  }

  // Real-time notification: notify the customer
  const customerRecipientId = ticket.customerId?._id || ticket.customerId;
  if (customerRecipientId) {
    try {
      const adminName = message.senderId?.name || 'Administrator';
      const bodySnippet = message.body.length > 80 ? message.body.substring(0, 77) + '...' : message.body;

      await createNotification({
        recipient: customerRecipientId,
        sender: adminId,
        type: 'ticket_reply',
        title: `Official Admin Reply on #${ticket.ticketNumber}`,
        message: `${adminName}: ${bodySnippet}`,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        targetRoute: `/customer/tickets/${ticket.ticketNumber}`,
      });
    } catch (notifErr) {
      console.warn('[Notification] Failed to create reply notification:', notifErr.message);
    }
  }

  return responseMessage;
};

export default sendAdminReply;
