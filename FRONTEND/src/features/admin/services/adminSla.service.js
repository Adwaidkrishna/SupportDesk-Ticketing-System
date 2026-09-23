import api from '../../../services/api';

/**
 * Fetch all configured SLA policies with live ticket compliance statistics.
 */
export async function getAdminSlaPolicies() {
  return api.get('/admin/sla/policies');
}

/**
 * Create a new SLA policy
 * @param {Object} data
 */
export async function createAdminSlaPolicy(data) {
  return api.post('/admin/sla/policies', data);
}

/**
 * Update an existing SLA policy
 * @param {string} policyId
 * @param {Object} data
 */
export async function updateAdminSlaPolicy(policyId, data) {
  return api.patch(`/admin/sla/policies/${policyId}`, data);
}

/**
 * Toggle SLA policy active/inactive status
 * @param {string} policyId
 * @param {boolean} isActive
 */
export async function toggleAdminSlaPolicyStatus(policyId, isActive) {
  return api.patch(`/admin/sla/policies/${policyId}/status`, { isActive });
}

export default {
  getAdminSlaPolicies,
  createAdminSlaPolicy,
  updateAdminSlaPolicy,
  toggleAdminSlaPolicyStatus,
};
