import express from 'express';
import ticketController from '../controllers/ticket/index.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import {
  validateCreateTicketInput,
  validateGetMyTicketsInput,
} from '../validators/ticket.validator.js';

const router = express.Router();

// GET /api/v1/tickets/my-tickets - Customer ticket listing (Scoped to req.user.userId)
router.get(
  '/my-tickets',
  authenticateUser,
  authorizeRoles('customer'),
  validateGetMyTicketsInput,
  ticketController.getMyTickets
);

// POST /api/v1/tickets - Customer ticket creation
router.post(
  '/',
  authenticateUser,
  authorizeRoles('customer'),
  validateCreateTicketInput,
  ticketController.createTicket
);

export default router;
