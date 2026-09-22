import api from '../../../services/api';

/**
 * Admin Category API Service.
 * Interfaces with backend endpoints at /api/v1/admin/categories.
 */

/**
 * Fetch all categories for admin management with live ticket counts.
 * @returns {Promise<{ success: boolean, data: { categories: Array } }>}
 */
export async function getAdminCategories() {
  return api.get('/admin/categories');
}

/**
 * Create a new category in MongoDB.
 * @param {Object} data - { name, description, isActive }
 * @returns {Promise<{ success: boolean, message: string, data: { category: Object } }>}
 */
export async function createCategory(data) {
  return api.post('/admin/categories', data);
}

/**
 * Update an existing category's details (name, description, isActive).
 * @param {string} categoryId - MongoDB ObjectId of the category
 * @param {Object} data - { name, description, isActive }
 * @returns {Promise<{ success: boolean, message: string, data: { category: Object } }>}
 */
export async function updateCategory(categoryId, data) {
  if (!categoryId) {
    throw new Error('Category ID parameter is required.');
  }
  return api.put(`/admin/categories/${categoryId}`, data);
}

/**
 * Activate or deactivate a category.
 * @param {string} categoryId - MongoDB ObjectId of the category
 * @param {boolean} isActive - New status
 * @returns {Promise<{ success: boolean, message: string, data: { category: Object } }>}
 */
export async function toggleCategoryStatus(categoryId, isActive) {
  if (!categoryId) {
    throw new Error('Category ID parameter is required.');
  }
  return api.patch(`/admin/categories/${categoryId}/status`, { isActive });
}

export default {
  getAdminCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
};
