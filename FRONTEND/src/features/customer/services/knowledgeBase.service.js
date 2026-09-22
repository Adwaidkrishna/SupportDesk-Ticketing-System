import api from '../../../services/api';

/**
 * Knowledge Base API Service.
 * Interfaces with backend endpoints mounted at /api/v1/knowledge-base.
 */

/**
 * Fetch knowledge base categories with published article counts.
 * @returns {Promise<{ success: boolean, data: { categories: Array } }>}
 */
export async function getKnowledgeCategories() {
  return api.get('/knowledge-base/categories');
}

/**
 * Fetch knowledge base articles with optional search, category, and status filters.
 * @param {Object} [params]
 * @param {string} [params.search]
 * @param {string} [params.category]
 * @param {string} [params.status]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @returns {Promise<{ success: boolean, data: { articles: Array, pagination: Object } }>}
 */
export async function getKnowledgeArticles({
  search = '',
  category = '',
  status = '',
  page = 1,
  limit = 50,
} = {}) {
  const queryParams = new URLSearchParams();
  if (search && search.trim()) queryParams.append('search', search.trim());
  if (category && category !== 'all' && category !== 'ALL') {
    queryParams.append('category', category);
  }
  if (status && status !== 'ALL') queryParams.append('status', status);
  if (page) queryParams.append('page', page);
  if (limit) queryParams.append('limit', limit);

  const queryString = queryParams.toString();
  return api.get(`/knowledge-base/articles${queryString ? `?${queryString}` : ''}`);
}

/**
 * Fetch a single article by ID.
 * @param {string} articleId
 * @returns {Promise<{ success: boolean, data: { article: Object } }>}
 */
export async function getKnowledgeArticleById(articleId) {
  return api.get(`/knowledge-base/articles/${articleId}`);
}

/**
 * Admin: Create a new knowledge base article.
 * @param {Object} articleData - { title, category, content, status }
 * @returns {Promise<{ success: boolean, message: string, data: { article: Object } }>}
 */
export async function createKnowledgeArticle(articleData) {
  return api.post('/knowledge-base/articles', articleData);
}

/**
 * Admin: Update an existing knowledge base article.
 * @param {string} articleId
 * @param {Object} updateData - { title?, category?, content?, status? }
 * @returns {Promise<{ success: boolean, message: string, data: { article: Object } }>}
 */
export async function updateKnowledgeArticle(articleId, updateData) {
  return api.patch(`/knowledge-base/articles/${articleId}`, updateData);
}

/**
 * Admin: Delete an article.
 * @param {string} articleId
 * @returns {Promise<{ success: boolean, message: string, data: Object }>}
 */
export async function deleteKnowledgeArticle(articleId) {
  return api.delete(`/knowledge-base/articles/${articleId}`);
}

export default {
  getKnowledgeCategories,
  getKnowledgeArticles,
  getKnowledgeArticleById,
  createKnowledgeArticle,
  updateKnowledgeArticle,
  deleteKnowledgeArticle,
};
