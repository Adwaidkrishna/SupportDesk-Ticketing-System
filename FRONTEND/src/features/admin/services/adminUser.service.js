import api from '../../../services/api';

/**
 * Admin User API Service.
 * Interfaces with backend endpoints at /api/v1/admin/users.
 */

/**
 * Fetch users list with optional search and filter parameters.
 * @param {Object} [params] - { search, role, status }
 * @returns {Promise<{ success: boolean, data: { users: Array, stats: Object } }>}
 */
export async function getAdminUsers({ search, role, status } = {}) {
  const params = new URLSearchParams();
  if (search && search.trim()) params.append('search', search.trim());
  if (role && role !== 'all') params.append('role', role);
  if (status && status !== 'all') params.append('status', status);

  const queryString = params.toString();
  const endpoint = `/admin/users${queryString ? `?${queryString}` : ''}`;
  return api.get(endpoint);
}

/**
 * Activate or deactivate a user account.
 * @param {string} userId - MongoDB ObjectId of the user
 * @param {boolean} isActive - New status
 * @returns {Promise<{ success: boolean, message: string, data: { user: Object } }>}
 */
export async function updateUserStatus(userId, isActive) {
  if (!userId) {
    throw new Error('User ID parameter is required.');
  }
  return api.patch(`/admin/users/${userId}/status`, { isActive });
}

/**
 * Update a user's details (name, email, role, phone, department, isActive).
 * @param {string} userId - MongoDB ObjectId of the user
 * @param {Object} data - Updated user fields
 * @returns {Promise<{ success: boolean, message: string, data: { user: Object } }>}
 */
export async function updateUserDetails(userId, data) {
  if (!userId) {
    throw new Error('User ID parameter is required.');
  }
  return api.patch(`/admin/users/${userId}`, data);
}

export default {
  getAdminUsers,
  updateUserStatus,
  updateUserDetails,
};
