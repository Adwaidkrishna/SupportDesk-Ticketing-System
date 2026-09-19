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

/**
 * Fetch tickets assigned to the authenticated agent.
 * @param {Object} [params] - { page, limit, status }
 * @returns {Promise<{ success: boolean, data: { tickets: Array, pagination: Object } }>}
 */
export async function getAgentAssignedTickets({ page = 1, limit = 10, status } = {}) {
  const queryParams = new URLSearchParams();
  if (page) queryParams.append('page', page);
  if (limit) queryParams.append('limit', limit);
  if (status) queryParams.append('status', status);

  const queryString = queryParams.toString();
  const endpoint = `/agent/my-tickets${queryString ? `?${queryString}` : ''}`;
  return api.get(endpoint);
}

/**
 * Update status of an assigned ticket (RESOLVED or CLOSED).
 * @param {string} ticketId - Ticket ID
 * @param {'RESOLVED'|'CLOSED'} status - Desired status
 * @returns {Promise<{ success: boolean, message: string, data: { ticket: Object } }>}
 */
export async function updateAgentTicketStatus(ticketId, status) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.patch(`/agent/tickets/${ticketId}/status`, { status });
}

/**
 * Reopen a RESOLVED ticket back to IN_PROGRESS.
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<{ success: boolean, message: string, data: { ticket: Object } }>}
 */
export async function reopenTicket(ticketId) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.patch(`/tickets/${ticketId}/reopen`);
}

export default {
  getAgentQueue,
  getAgentTicketById,
  claimTicket,
  getAgentTicketMessages,
  sendAgentTicketMessage,
  getAgentAssignedTickets,
  updateAgentTicketStatus,
  reopenTicket,
};

