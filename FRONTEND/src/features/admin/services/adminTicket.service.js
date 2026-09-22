import api from '../../../services/api';

/**
 * Admin Ticket API Service.
 * Interfaces with backend endpoints at /api/v1/admin/tickets.
 */

/**
 * Retrieve paginated tickets with search and multi-field filters.
 *
 * @param {Object} [params] - Query options: { search, status, priority, categoryId, agentId, page, limit }
 * @returns {Promise<{ success: boolean, data: { tickets: Array, pagination: Object, stats: Object } }>}
 */
export async function getAdminTickets(params = {}) {
  return api.get('/admin/tickets', { params });
}

/**
 * Retrieve full details for a single ticket by ObjectId or ticketNumber.
 *
 * @param {string} ticketId - ObjectId string or ticket number
 * @returns {Promise<{ success: boolean, data: { ticket: Object } }>}
 */
export async function getAdminTicketById(ticketId) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.get(`/admin/tickets/${ticketId}`);
}

/**
 * Assign, reassign, or unassign an agent on a ticket.
 *
 * @param {string} ticketId - ObjectId or ticket number
 * @param {string|null} agentId - Target Agent User ObjectId or null to unassign
 * @returns {Promise<{ success: boolean, message: string, data: { ticket: Object } }>}
 */
export async function assignTicketAgent(ticketId, agentId) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.patch(`/admin/tickets/${ticketId}/assign`, { agentId });
}

/**
 * Update the status of a ticket.
 *
 * @param {string} ticketId - ObjectId or ticket number
 * @param {'OPEN'|'IN_PROGRESS'|'RESOLVED'|'CLOSED'} status - Target ticket status
 * @returns {Promise<{ success: boolean, message: string, data: { ticket: Object } }>}
 */
export async function updateTicketStatus(ticketId, status) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.patch(`/admin/tickets/${ticketId}/status`, { status });
}

/**
 * Update the priority of a ticket.
 *
 * @param {string} ticketId - ObjectId or ticket number
 * @param {'LOW'|'MEDIUM'|'HIGH'|'URGENT'} priority - Target priority level
 * @returns {Promise<{ success: boolean, message: string, data: { ticket: Object } }>}
 */
export async function updateTicketPriority(ticketId, priority) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.patch(`/admin/tickets/${ticketId}/priority`, { priority });
}

/**
 * Retrieve all conversation messages for a ticket chronologically.
 *
 * @param {string} ticketId - ObjectId or ticket number
 * @returns {Promise<{ success: boolean, data: { messages: Array } }>}
 */
export async function getAdminTicketMessages(ticketId) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.get(`/admin/tickets/${ticketId}/messages`);
}

/**
 * Send an official admin reply message to the ticket conversation.
 *
 * @param {string} ticketId - ObjectId or ticket number
 * @param {string} body - Reply text content
 * @returns {Promise<{ success: boolean, message: string, data: { message: Object } }>}
 */
export async function sendAdminTicketMessage(ticketId, body) {
  if (!ticketId) {
    throw new Error('Ticket ID parameter is required.');
  }
  return api.post(`/admin/tickets/${ticketId}/messages`, { body });
}

export default {
  getAdminTickets,
  getAdminTicketById,
  assignTicketAgent,
  updateTicketStatus,
  updateTicketPriority,
  getAdminTicketMessages,
  sendAdminTicketMessage,
};
