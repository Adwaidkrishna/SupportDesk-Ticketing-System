import express from 'express';
import ticketController from '../controllers/ticket/index.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import {
  validateGetAgentQueueInput,
  validateTicketIdParam,
} from '../validators/ticket.validator.js';

const router = express.Router();

// GET /api/v1/agent/queue - Unassigned OPEN tickets queue for agents
router.get(
  '/queue',
  authenticateUser,
  authorizeRoles('agent'),
  validateGetAgentQueueInput,
  ticketController.getAgentQueue
);

// GET /api/v1/agent/tickets/:ticketId - Read-only ticket details for agents
router.get(
  '/tickets/:ticketId',
  authenticateUser,
  authorizeRoles('agent'),
  validateTicketIdParam,
  ticketController.getAgentTicketDetails
);

// POST /api/v1/agent/tickets/:ticketId/claim - Atomically claim an open unassigned ticket
router.post(
  '/tickets/:ticketId/claim',
  authenticateUser,
  authorizeRoles('agent'),
  validateTicketIdParam,
  ticketController.claimTicket
);

export default router;


