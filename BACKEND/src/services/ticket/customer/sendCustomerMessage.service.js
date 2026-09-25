import mongoose from 'mongoose';
import Ticket from '../../../models/Ticket.js';
import TicketMessage from '../../../models/TicketMessage.js';
import { getIO } from '../../../socket/socket.js';
import { createNotification, notifyRole } from '../../notification/index.js';

/**
 * Service to send a message on a ticket by its customer owner.
 *
 * Enforces:
 * - Ticket exists.
 * - Authenticated customer owns the ticket (IDOR isolation; returns 404 if not).
 * - Persists message in MongoDB with senderRole = 'customer'.
 * - Emits real-time message:new to the ticket room via Socket.IO.
 * - Returns clean serialized message with safe sender details.
 *
 * @param {string} ticketId - MongoDB ObjectId or ticketNumber of the ticket
 * @param {string} customerId - Authenticated Customer's User ObjectId from JWT
 * @param {string} body - Validated message body text
 * @returns {Promise<Object>} Created message object
 */
export const sendCustomerMessage = async (ticketId, customerId, body) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(ticketId) && /^[0-9a-fA-F]{24}$/.test(ticketId);
  const identifierQuery = isObjectId
    ? { $or: [{ _id: ticketId }, { ticketNumber: ticketId }] }
    : { ticketNumber: ticketId };

  // 1. Verify ticket exists and belongs to the customer (Customer Isolation)
  const ticket = await Ticket.findOne(identifierQuery).lean();

  if (!ticket || ticket.customerId.toString() !== customerId.toString()) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  if (ticket.status === 'RESOLVED') {
    const err = new Error('Ticket is resolved. Please reopen the ticket to send a message.');
    err.statusCode = 400;
    throw err;
  }

  if (ticket.status === 'CLOSED') {
    const err = new Error('Ticket is closed. No further messages can be sent.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Persist new TicketMessage using canonical ticket._id
  const message = await TicketMessage.create({
    ticketId: ticket._id,
    senderId: customerId,
    senderRole: 'customer',
    body: body.trim(),
  });

  // 3. Populate sender safe details
  await message.populate('senderId', 'name email role');

  const responseMessage = {
    id: message._id.toString(),
    _id: message._id.toString(),
    ticketId: message.ticketId.toString(),
    senderId: customerId.toString(),
    senderRole: message.senderRole,
    sender: {
      id: customerId.toString(),
      _id: customerId.toString(),
      name: message.senderId?.name,
      email: message.senderId?.email,
      role: message.senderId?.role,
    },
    body: message.body,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };

  // 4. Real-time Socket.IO Broadcast to Ticket Room
  try {
    const io = getIO();
    io.to(`ticket:${ticket.ticketNumber}`).emit('message:new', responseMessage);
  } catch (socketErr) {
    // Non-blocking in case of isolated testing environments without active Socket.IO
    console.warn('[Socket] Real-time message broadcast skipped:', socketErr.message);
  }

  // 5. Real-time notification: notify assigned agent, or agent queue if unassigned
  const customerName = message.senderId?.name || 'Customer';
  const bodySnippet = message.body.length > 80 ? message.body.substring(0, 77) + '...' : message.body;

  if (ticket.assignedTo) {
    // Notify the assigned agent ONLY — do NOT broadcast to all agents
    createNotification({
      recipient: ticket.assignedTo,
      sender: customerId,
      type: 'ticket_reply',
      title: `${customerName} replied to #${ticket.ticketNumber}`,
      message: bodySnippet,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      targetRoute: `/agent/tickets/${ticket.ticketNumber}`,
    }).catch((err) => console.warn('[Notification] Failed to notify assigned agent on customer reply:', err.message));
  } else {
    // Unassigned ticket: notify the agent queue
    notifyRole('agent', {
      sender: customerId,
      type: 'ticket_reply',
      title: `New reply on unassigned ticket #${ticket.ticketNumber}`,
      message: `${customerName}: ${bodySnippet}`,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      targetRoute: `/agent/tickets/${ticket.ticketNumber}`,
    }).catch((err) => console.warn('[Notification] Failed to notify agent queue on customer reply:', err.message));
  }

  return responseMessage;
};

export default sendCustomerMessage;
