import api from '../../../services/api';

/**
 * Admin Settings API Service.
 * Interfaces with backend endpoints at /api/v1/admin/settings.
 */

/**
 * Fetch platform system configuration.
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function getAdminSettings() {
  return api.get('/admin/settings');
}

/**
 * Update platform system configuration.
 * @param {Object} settingsData - Partial or full configuration update
 * @returns {Promise<{ success: boolean, message: string, data: Object }>}
 */
export async function updateAdminSettings(settingsData) {
  return api.patch('/admin/settings', settingsData);
}

export default {
  getAdminSettings,
  updateAdminSettings,
};
