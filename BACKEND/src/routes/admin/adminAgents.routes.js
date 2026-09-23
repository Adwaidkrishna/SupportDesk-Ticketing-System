import express from 'express';
import {
  validateAgentId,
  validateUpdateAgentStatus,
  validateUpdateAgent,
} from '../../validators/adminAgent.validator.js';
import adminController from '../../controllers/admin/index.js';

const router = express.Router();

// GET /api/v1/admin/agents - List agents with workload stats, search, and availability filters
router.get('/', adminController.getAgents);

// PATCH /api/v1/admin/agents/:agentId/status - Update agent availability status
router.patch(
  '/:agentId/status',
  validateAgentId,
  validateUpdateAgentStatus,
  adminController.updateAgentStatus
);

// PATCH /api/v1/admin/agents/:agentId - Edit basic agent profile details
router.patch(
  '/:agentId',
  validateAgentId,
  validateUpdateAgent,
  adminController.updateAgentDetails
);

export default router;
