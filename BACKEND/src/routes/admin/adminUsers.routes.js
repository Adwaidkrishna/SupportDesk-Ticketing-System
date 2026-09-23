import express from 'express';
import {
  validateUserId,
  validateUpdateUserStatus,
  validateUpdateUser,
} from '../../validators/adminUser.validator.js';
import adminController from '../../controllers/admin/index.js';

const router = express.Router();

// GET /api/v1/admin/users - List users with search, role, status filters
router.get('/', adminController.getUsers);

// PATCH /api/v1/admin/users/:userId/status - Activate or deactivate user account
router.patch(
  '/:userId/status',
  validateUserId,
  validateUpdateUserStatus,
  adminController.updateUserStatus
);

// PATCH /api/v1/admin/users/:userId - Edit basic user profile details
router.patch(
  '/:userId',
  validateUserId,
  validateUpdateUser,
  adminController.updateUserDetails
);

export default router;
