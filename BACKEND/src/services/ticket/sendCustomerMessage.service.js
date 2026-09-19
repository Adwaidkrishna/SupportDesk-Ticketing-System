import Ticket from '../../models/Ticket.js';
import TicketMessage from '../../models/TicketMessage.js';
import { getIO } from '../../socket/socket.js';

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
 * @param {string} ticketId - MongoDB ObjectId of the ticket
 * @param {string} customerId - Authenticated Customer's User ObjectId from JWT
 * @param {string} body - Validated message body text
 * @returns {Promise<Object>} Created message object
 */
export const sendCustomerMessage = async (ticketId, customerId, body) => {
  // 1. Verify ticket exists and belongs to the customer (Customer Isolation)
  const ticket = await Ticket.findById(ticketId).lean();

  if (!ticket || ticket.customerId.toString() !== customerId.toString()) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  // 2. Persist new TicketMessage
  const message = await TicketMessage.create({
    ticketId,
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

  return responseMessage;
};

export default sendCustomerMessage;
