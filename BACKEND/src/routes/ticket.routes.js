import express from 'express';
import { createTicket } from '../controllers/ticket.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateCreateTicketInput } from '../validators/ticket.validator.js';

const router = express.Router();

// POST /api/v1/tickets - Customer ticket creation
router.post(
  '/',
  authenticateUser,
  authorizeRoles('customer'),
  validateCreateTicketInput,
  createTicket
);

export default router;
