import api from '../../../services/api';

/**
 * Admin Reports API Service.
 * Interfaces with backend endpoints at /api/v1/admin/reports.
 */

/**
 * Fetch operational reports, analytics KPIs, and charts.
 * @param {Object} [params] - { timeframe: '7d'|'30d'|'90d' }
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function getAdminReports(params = {}) {
  return api.get('/admin/reports', { params });
}

export default {
  getAdminReports,
};
