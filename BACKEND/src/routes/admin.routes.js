import express from 'express';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import {
  validateUserId,
  validateUpdateUserStatus,
  validateUpdateUser,
} from '../validators/adminUser.validator.js';
import {
  validateAgentId,
  validateUpdateAgentStatus,
  validateUpdateAgent,
} from '../validators/adminAgent.validator.js';
import {
  validateCategoryId,
  validateCreateCategory,
  validateUpdateCategory,
  validateUpdateCategoryStatus,
} from '../validators/adminCategory.validator.js';
import adminController from '../controllers/admin/index.js';

const router = express.Router();

// Enforce authentication and admin role on all /api/v1/admin routes
router.use(authenticateUser);
router.use(authorizeRoles('admin'));

// ─── Admin Users Endpoints ─────────────────────────────────────────────────────

// GET /api/v1/admin/users - List users with search, role, status filters
router.get('/users', adminController.getUsers);

// PATCH /api/v1/admin/users/:userId/status - Activate or deactivate user account
router.patch(
  '/users/:userId/status',
  validateUserId,
  validateUpdateUserStatus,
  adminController.updateUserStatus
);

// PATCH /api/v1/admin/users/:userId - Edit basic user profile details
router.patch(
  '/users/:userId',
  validateUserId,
  validateUpdateUser,
  adminController.updateUserDetails
);

// ─── Admin Agents Endpoints ────────────────────────────────────────────────────

// GET /api/v1/admin/agents - List agents with workload stats, search, and availability filters
router.get('/agents', adminController.getAgents);

// PATCH /api/v1/admin/agents/:agentId/status - Update agent availability status
router.patch(
  '/agents/:agentId/status',
  validateAgentId,
  validateUpdateAgentStatus,
  adminController.updateAgentStatus
);

// PATCH /api/v1/admin/agents/:agentId - Edit basic agent profile details
router.patch(
  '/agents/:agentId',
  validateAgentId,
  validateUpdateAgent,
  adminController.updateAgentDetails
);

// ─── Admin Categories Endpoints ────────────────────────────────────────────────

// GET /api/v1/admin/categories - List all categories with live ticket counts
router.get('/categories', adminController.getCategories);

// POST /api/v1/admin/categories - Create a new category
router.post(
  '/categories',
  validateCreateCategory,
  adminController.createCategory
);

// PUT /api/v1/admin/categories/:categoryId - Edit category details
router.put(
  '/categories/:categoryId',
  validateCategoryId,
  validateUpdateCategory,
  adminController.updateCategory
);

// PATCH /api/v1/admin/categories/:categoryId/status - Activate or deactivate category
router.patch(
  '/categories/:categoryId/status',
  validateCategoryId,
  validateUpdateCategoryStatus,
  adminController.updateCategoryStatus
);

export default router;
