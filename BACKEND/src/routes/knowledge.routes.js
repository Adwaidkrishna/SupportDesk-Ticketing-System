import express from 'express';
import {
  createArticle,
  updateArticle,
  deleteArticle,
  getArticles,
  getArticleById,
  getCategories,
} from '../controllers/knowledge/index.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import {
  validateCreateArticle,
  validateUpdateArticle,
  validateArticleId,
} from '../validators/knowledge.validator.js';

const router = express.Router();

// ─── Shared Routes (Customer, Agent, Admin) ───────────────────────────────────

// GET /api/v1/knowledge-base/categories - Get categories with article counts
router.get(
  '/categories',
  authenticateUser,
  authorizeRoles('customer', 'agent', 'admin'),
  getCategories
);

// GET /api/v1/knowledge-base/articles - List articles (published for customer/agent, all for admin)
router.get(
  '/articles',
  authenticateUser,
  authorizeRoles('customer', 'agent', 'admin'),
  getArticles
);

// GET /api/v1/knowledge-base/articles/:articleId - Get single article details
router.get(
  '/articles/:articleId',
  authenticateUser,
  authorizeRoles('customer', 'agent', 'admin'),
  validateArticleId,
  getArticleById
);

// ─── Admin Only Routes ────────────────────────────────────────────────────────

// POST /api/v1/knowledge-base/articles - Create new article
router.post(
  '/articles',
  authenticateUser,
  authorizeRoles('admin'),
  validateCreateArticle,
  createArticle
);

// PATCH /api/v1/knowledge-base/articles/:articleId - Update article or toggle status
router.patch(
  '/articles/:articleId',
  authenticateUser,
  authorizeRoles('admin'),
  validateArticleId,
  validateUpdateArticle,
  updateArticle
);

// DELETE /api/v1/knowledge-base/articles/:articleId - Delete article
router.delete(
  '/articles/:articleId',
  authenticateUser,
  authorizeRoles('admin'),
  validateArticleId,
  deleteArticle
);

export default router;
