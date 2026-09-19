import express from 'express';
import ticketController from '../controllers/ticket/index.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import {
  validateCreateTicketInput,
  validateGetMyTicketsInput,
  validateTicketIdParam,
  validateMessageInput,
} from '../validators/ticket.validator.js';

const router = express.Router();

// GET /api/v1/tickets/my-tickets - Customer ticket listing (Must precede /:ticketId)
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

// GET /api/v1/tickets/:ticketId/messages - Customer ticket messages (Preserves route precedence)
router.get(
  '/:ticketId/messages',
  authenticateUser,
  authorizeRoles('customer'),
  validateTicketIdParam,
  ticketController.getTicketMessages
);

// POST /api/v1/tickets/:ticketId/messages - Customer send ticket message
router.post(
  '/:ticketId/messages',
  authenticateUser,
  authorizeRoles('customer'),
  validateTicketIdParam,
  validateMessageInput,
  ticketController.sendCustomerMessage
);

// PATCH /api/v1/tickets/:ticketId/reopen - Reopen a RESOLVED ticket (Customer owner, Assigned Agent, or Admin)
router.patch(
  '/:ticketId/reopen',
  authenticateUser,
  authorizeRoles('customer', 'agent', 'admin'),
  validateTicketIdParam,
  ticketController.reopenTicket
);

// GET /api/v1/tickets/:ticketId - Customer ticket details (Read-only, Customer ID Isolation)
router.get(
  '/:ticketId',
  authenticateUser,
  authorizeRoles('customer'),
  validateTicketIdParam,
  ticketController.getTicketDetails
);


export default router;
