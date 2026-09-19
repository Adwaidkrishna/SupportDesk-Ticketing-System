import Ticket from '../../models/Ticket.js';
import TicketMessage from '../../models/TicketMessage.js';

/**
 * Service to send a reply message on an assigned ticket by the assigned agent.
 *
 * Enforces:
 * - Ticket exists (404 if not).
 * - Authenticated agent is the assigned agent for this ticket (403 if not or unassigned).
 * - Persists message in MongoDB with senderRole = 'agent'.
 * - Returns clean serialized message with safe sender details.
 *
 * @param {string} ticketId - MongoDB ObjectId of the ticket
 * @param {string} agentId - Authenticated Agent's User ObjectId from JWT
 * @param {string} body - Validated message body text
 * @returns {Promise<Object>} Created message object
 */
export const sendAgentMessage = async (ticketId, agentId, body) => {
  // 1. Verify ticket exists
  const ticket = await Ticket.findById(ticketId).lean();

  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  // 2. Verify agent assignment
  if (!ticket.assignedTo || ticket.assignedTo.toString() !== agentId.toString()) {
    const err = new Error('Access denied: You are not assigned to this ticket');
    err.statusCode = 403;
    throw err;
  }

  // 3. Persist new TicketMessage
  const message = await TicketMessage.create({
    ticketId,
    senderId: agentId,
    senderRole: 'agent',
    body: body.trim(),
  });

  // 4. Populate sender safe details
  await message.populate('senderId', 'name email role');

  return {
    id: message._id.toString(),
    _id: message._id.toString(),
    ticketId: message.ticketId.toString(),
    senderId: agentId.toString(),
    senderRole: message.senderRole,
    sender: {
      id: agentId.toString(),
      _id: agentId.toString(),
      name: message.senderId?.name,
      email: message.senderId?.email,
      role: message.senderId?.role,
    },
    body: message.body,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
};

export default sendAgentMessage;
