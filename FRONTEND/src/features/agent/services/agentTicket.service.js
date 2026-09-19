import api from '../../../services/api';

/**
 * Agent Ticket API Service.
 * Interfaces with backend agent endpoints at /api/v1/agent.
 */

/**
 * Fetch available unassigned tickets for the agent queue.
 * @param {Object} [params] - { page, limit }
 * @returns {Promise<{ success: boolean, data: { tickets: Array, pagination: Object } }>}
 */
export async function getAgentQueue({ page = 1, limit = 10 } = {}) {
  const queryParams = new URLSearchParams();
  if (page) queryParams.append('page', page);
  if (limit) queryParams.append('limit', limit);

  const queryString = queryParams.toString();
  const endpoint = `/agent/queue${queryString ? `?${queryString}` : ''}`;
  return api.get(endpoint);
}

/**
 * Fetch single ticket details by ID for an authorized agent.
 * @param {string} ticketId - MongoDB ObjectId of the ticket
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function getAgentTicketById(ticketId) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.get(`/agent/tickets/${ticketId}`);
}

/**
 * Claim an unassigned open ticket for the authenticated agent.
 * @param {string} ticketId - MongoDB ObjectId of the ticket
 * @returns {Promise<{ success: boolean, message: string, data: Object }>}
 */
export async function claimTicket(ticketId) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.post(`/agent/tickets/${ticketId}/claim`);
}

/**
 * Fetch chronological message history for an assigned ticket.
 * @param {string} ticketId - MongoDB ObjectId of the ticket
 * @returns {Promise<{ success: boolean, data: Array<Object> }>}
 */
export async function getAgentTicketMessages(ticketId) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.get(`/agent/tickets/${ticketId}/messages`);
}

/**
 * Send an agent reply message on an assigned ticket.
 * @param {string} ticketId - MongoDB ObjectId of the ticket
 * @param {string} body - Reply message text content
 * @returns {Promise<{ success: boolean, message: string, data: Object }>}
 */
export async function sendAgentTicketMessage(ticketId, body) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.post(`/agent/tickets/${ticketId}/messages`, { body });
}

export default {
  getAgentQueue,
  getAgentTicketById,
  claimTicket,
  getAgentTicketMessages,
  sendAgentTicketMessage,
};

