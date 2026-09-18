import express from 'express';
import ticketController from '../controllers/ticket/index.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateGetAgentQueueInput } from '../validators/ticket.validator.js';

const router = express.Router();

// GET /api/v1/agent/queue - Unassigned OPEN tickets queue for agents
router.get(
  '/queue',
  authenticateUser,
  authorizeRoles('agent'),
  validateGetAgentQueueInput,
  ticketController.getAgentQueue
);

export default router;
