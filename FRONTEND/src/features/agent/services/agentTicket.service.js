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

export default {
  getAgentQueue,
};
