import express from 'express';
import {
  validateTicketQuery,
  validateAdminTicketId,
  validateAssignAgent,
  validateUpdateStatus,
  validateUpdatePriority,
  validateAdminReply,
} from '../../validators/adminTicket.validator.js';
import adminController from '../../controllers/admin/index.js';

const router = express.Router();

// GET /api/v1/admin/tickets - List all tickets with search, filters, pagination
router.get(
  '/',
  validateTicketQuery,
  adminController.getTickets
);

// GET /api/v1/admin/tickets/:ticketId - Ticket details with customer stats & related tickets
router.get(
  '/:ticketId',
  validateAdminTicketId,
  adminController.getTicketDetails
);

// PATCH /api/v1/admin/tickets/:ticketId/assign - Assign or unassign agent on ticket
router.patch(
  '/:ticketId/assign',
  validateAdminTicketId,
  validateAssignAgent,
  adminController.assignTicketAgent
);

// PATCH /api/v1/admin/tickets/:ticketId/status - Update ticket status
router.patch(
  '/:ticketId/status',
  validateAdminTicketId,
  validateUpdateStatus,
  adminController.updateTicketStatus
);

// PATCH /api/v1/admin/tickets/:ticketId/priority - Update ticket priority
router.patch(
  '/:ticketId/priority',
  validateAdminTicketId,
  validateUpdatePriority,
  adminController.updateTicketPriority
);

// GET /api/v1/admin/tickets/:ticketId/messages - Retrieve conversation messages
router.get(
  '/:ticketId/messages',
  validateAdminTicketId,
  adminController.getTicketMessages
);

// POST /api/v1/admin/tickets/:ticketId/messages - Post official admin reply
router.post(
  '/:ticketId/messages',
  validateAdminTicketId,
  validateAdminReply,
  adminController.sendAdminReply
);

export default router;
