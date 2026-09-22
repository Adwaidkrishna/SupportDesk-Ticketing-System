import api from '../../../services/api';

/**
 * Admin Agent API Service.
 * Interfaces with backend endpoints at /api/v1/admin/agents.
 */

/**
 * Fetch agents list with live workload stats, search, and availability filters.
 * @param {Object} [params] - { search, status }
 * @returns {Promise<{ success: boolean, data: { agents: Array, stats: Object } }>}
 */
export async function getAdminAgents({ search, status } = {}) {
  const params = new URLSearchParams();
  if (search && search.trim()) params.append('search', search.trim());
  if (status && status !== 'all') params.append('status', status);

  const queryString = params.toString();
  const endpoint = `/admin/agents${queryString ? `?${queryString}` : ''}`;
  return api.get(endpoint);
}

/**
 * Update an agent's availability status.
 * @param {string} agentId - MongoDB ObjectId of the agent
 * @param {'Available'|'Busy'|'Away'|'Offline'} status - Target availability
 * @returns {Promise<{ success: boolean, message: string, data: { agent: Object } }>}
 */
export async function updateAgentStatus(agentId, status) {
  if (!agentId) {
    throw new Error('Agent ID parameter is required.');
  }
  return api.patch(`/admin/agents/${agentId}/status`, { status });
}

/**
 * Update an agent's basic details (name, email, department, role, status).
 * @param {string} agentId - MongoDB ObjectId of the agent
 * @param {Object} data - Updated agent fields
 * @returns {Promise<{ success: boolean, message: string, data: { agent: Object } }>}
 */
export async function updateAgentDetails(agentId, data) {
  if (!agentId) {
    throw new Error('Agent ID parameter is required.');
  }
  return api.patch(`/admin/agents/${agentId}`, data);
}

export default {
  getAdminAgents,
  updateAgentStatus,
  updateAgentDetails,
};
