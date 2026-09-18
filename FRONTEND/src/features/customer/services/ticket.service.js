import api from '../../../services/api';

/**
 * Customer Ticket API Service.
 * Interfaces with backend endpoints at /api/v1/tickets and /api/v1/categories.
 */

/**
 * Fetch available active support categories.
 * @returns {Promise<{ success: boolean, data: { categories: Array<{ id: string, name: string, description: string }> } }>}
 */
export async function getCategories() {
  return api.get('/categories');
}

/**
 * Create a new support ticket.
 * @param {Object} ticketData - { subject, description, categoryId, priority }
 * @returns {Promise<{ success: boolean, message: string, data: { ticket: Object } }>}
 */
export async function createTicket({ subject, description, categoryId, priority }) {
  return api.post('/tickets', {
    subject,
    description,
    categoryId,
    priority,
  });
}

/**
 * Fetch tickets submitted strictly by the authenticated customer.
 * @param {Object} [params] - { page, limit, status }
 * @returns {Promise<{ success: boolean, data: { tickets: Array, pagination: Object } }>}
 */
export async function getMyTickets({ page = 1, limit = 10, status } = {}) {
  const queryParams = new URLSearchParams();
  if (page) queryParams.append('page', page);
  if (limit) queryParams.append('limit', limit);
  if (status && status !== 'All') queryParams.append('status', status);

  const queryString = queryParams.toString();
  const endpoint = `/tickets/my-tickets${queryString ? `?${queryString}` : ''}`;
  return api.get(endpoint);
}

export default {
  getCategories,
  createTicket,
  getMyTickets,
};
