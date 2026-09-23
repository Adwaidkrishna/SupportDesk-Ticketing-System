import express from 'express';
import {
  validateCategoryId,
  validateCreateCategory,
  validateUpdateCategory,
  validateUpdateCategoryStatus,
} from '../../validators/adminCategory.validator.js';
import adminController from '../../controllers/admin/index.js';

const router = express.Router();

// GET /api/v1/admin/categories - List all categories with live ticket counts
router.get('/', adminController.getCategories);

// POST /api/v1/admin/categories - Create a new category
router.post(
  '/',
  validateCreateCategory,
  adminController.createCategory
);

// PUT /api/v1/admin/categories/:categoryId - Edit category details
router.put(
  '/:categoryId',
  validateCategoryId,
  validateUpdateCategory,
  adminController.updateCategory
);

// PATCH /api/v1/admin/categories/:categoryId/status - Activate or deactivate category
router.patch(
  '/:categoryId/status',
  validateCategoryId,
  validateUpdateCategoryStatus,
  adminController.updateCategoryStatus
);

export default router;
