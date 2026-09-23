import mongoose from 'mongoose';
import Ticket from '../../../models/Ticket.js';
import TicketMessage from '../../../models/TicketMessage.js';

/**
 * Service for Admin to retrieve all conversation messages for a ticket.
 *
 * @param {string} ticketId - ObjectId string or ticket number
 * @returns {Promise<Array>} Chronologically sorted messages
 */
export const getTicketMessages = async (ticketId) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(ticketId);
  const lookupQuery = isObjectId
    ? { $or: [{ _id: ticketId }, { ticketNumber: ticketId }] }
    : { ticketNumber: ticketId };

  const ticket = await Ticket.findOne(lookupQuery).lean();

  if (!ticket) {
    const error = new Error('Ticket not found.');
    error.statusCode = 404;
    throw error;
  }

  const rawMessages = await TicketMessage.find({ ticketId: ticket._id })
    .populate('senderId', 'name email role')
    .sort({ createdAt: 1 })
    .lean();

  const messages = rawMessages.map((msg) => ({
    id: msg._id.toString(),
    _id: msg._id.toString(),
    ticketId: msg.ticketId.toString(),
    senderId: msg.senderId?._id ? msg.senderId._id.toString() : msg.senderId.toString(),
    senderRole: msg.senderRole,
    sender: msg.senderId?._id
      ? {
          id: msg.senderId._id.toString(),
          name: msg.senderId.name,
          email: msg.senderId.email,
          role: msg.senderId.role,
        }
      : null,
    senderName: msg.senderId?.name || (msg.senderRole === 'admin' ? 'Administrator' : 'User'),
    body: msg.body,
    text: msg.body,
    createdAt: msg.createdAt,
    updatedAt: msg.updatedAt,
  }));

  return messages;
};

export default getTicketMessages;
