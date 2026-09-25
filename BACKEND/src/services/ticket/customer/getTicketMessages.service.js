import mongoose from 'mongoose';
import Ticket from '../../../models/Ticket.js';
import TicketMessage from '../../../models/TicketMessage.js';

/**
 * Service to retrieve messages for a specific ticket owned by the authenticated customer.
 * Supports ticketId as MongoDB ObjectId or ticketNumber.
 * Enforces customer isolation / IDOR protection.
 */
export const getTicketMessages = async (userId, ticketId) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(ticketId) && /^[0-9a-fA-F]{24}$/.test(ticketId);
  const identifierQuery = isObjectId
    ? { $or: [{ _id: ticketId }, { ticketNumber: ticketId }] }
    : { ticketNumber: ticketId };

  // 1. Verify Ticket exists and belongs to the authenticated customer
  const ticket = await Ticket.findOne({
    ...identifierQuery,
    customerId: userId,
  }).lean();

  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  // 2. Retrieve messages sorted chronologically (oldest first)
  const rawMessages = await TicketMessage.find({ ticketId: ticket._id })
    .populate('senderId', 'name email role')
    .sort({ createdAt: 1 })
    .lean();

  // 3. Format response: safe minimal fields without sensitive credentials
  const messages = rawMessages.map((msg) => ({
    id: msg._id.toString(),
    _id: msg._id.toString(),
    ticketId: msg.ticketId.toString(),
    senderId: msg.senderId?._id ? msg.senderId._id.toString() : msg.senderId.toString(),
    sender: msg.senderId?._id
      ? {
          id: msg.senderId._id.toString(),
          _id: msg.senderId._id.toString(),
          name: msg.senderId.name,
          email: msg.senderId.email,
          role: msg.senderId.role,
        }
      : undefined,
    senderRole: msg.senderRole,
    body: msg.body,
    createdAt: msg.createdAt,
    updatedAt: msg.updatedAt,
  }));

  return messages;
};
