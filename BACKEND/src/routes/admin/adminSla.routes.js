import express from 'express';
import {
  validatePolicyId,
  validateCreatePolicy,
  validateUpdatePolicy,
  validateUpdatePolicyStatus,
} from '../../validators/adminSla.validator.js';
import adminController from '../../controllers/admin/index.js';

const router = express.Router();

// GET /api/v1/admin/sla/policies - List all configured SLA policies
router.get('/policies', adminController.getSlaPolicies);

// POST /api/v1/admin/sla/policies - Create a new SLA policy
router.post(
  '/policies',
  validateCreatePolicy,
  adminController.createSlaPolicy
);

// PATCH /api/v1/admin/sla/policies/:policyId - Update SLA policy targets
router.patch(
  '/policies/:policyId',
  validatePolicyId,
  validateUpdatePolicy,
  adminController.updateSlaPolicy
);

// PATCH /api/v1/admin/sla/policies/:policyId/status - Activate or deactivate SLA policy
router.patch(
  '/policies/:policyId/status',
  validatePolicyId,
  validateUpdatePolicyStatus,
  adminController.toggleSlaPolicyStatus
);

export default router;
