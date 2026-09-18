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

export default {
  getCategories,
  createTicket,
};
