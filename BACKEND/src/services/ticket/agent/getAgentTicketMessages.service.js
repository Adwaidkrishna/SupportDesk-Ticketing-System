import Ticket from '../../../models/Ticket.js';
import TicketMessage from '../../../models/TicketMessage.js';

/**
 * Service to retrieve messages for an assigned ticket for the assigned agent.
 *
 * Enforces:
 * - Ticket exists (404 if not).
 * - Authenticated agent is the assigned agent for this ticket (403 if unassigned or assigned to someone else).
 * - Returns chronological messages (oldest to newest) with safe sender fields.
 *
 * @param {string} ticketId - MongoDB ObjectId of the ticket
 * @param {string} agentId - Authenticated Agent's User ObjectId from JWT
 * @returns {Promise<Array<Object>>} List of formatted messages
 */
export const getAgentTicketMessages = async (ticketId, agentId) => {
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

  // 3. Retrieve messages chronologically
  const rawMessages = await TicketMessage.find({ ticketId })
    .populate('senderId', 'name email role')
    .sort({ createdAt: 1 })
    .lean();

  // 4. Format safe response
  return rawMessages.map((msg) => ({
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
};

export default getAgentTicketMessages;
