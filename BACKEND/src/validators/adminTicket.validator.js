// Admin managed routes for ticket module
import mongoose from 'mongoose';

const SUPPORTED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const SUPPORTED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * Validates query parameters for GET /api/v1/admin/tickets
 */
export const validateTicketQuery = (req, res, next) => {
  const { page, limit, search, status, priority, categoryId, agentId } = req.query;

  let parsedPage = 1;
  let parsedLimit = 20;

  if (page !== undefined && page !== null && page !== '') {
    const pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Page must be a positive integer >= 1.',
      });
    }
    parsedPage = pageNum;
  }

  if (limit !== undefined && limit !== null && limit !== '') {
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Limit must be an integer between 1 and 100.',
      });
    }
    parsedLimit = limitNum;
  }

  let sanitizedStatus = undefined;
  if (status && status !== 'all') {
    const upper = status.trim().toUpperCase();
    if (!SUPPORTED_STATUSES.includes(upper)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Status must be one of [${SUPPORTED_STATUSES.join(', ')}].`,
      });
    }
    sanitizedStatus = upper;
  }

  let sanitizedPriority = undefined;
  if (priority && priority !== 'all') {
    const upper = priority.trim().toUpperCase();
    if (!SUPPORTED_PRIORITIES.includes(upper)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Priority must be one of [${SUPPORTED_PRIORITIES.join(', ')}].`,
      });
    }
    sanitizedPriority = upper;
  }

  let sanitizedCategoryId = undefined;
  if (categoryId && categoryId !== 'all') {
    const trimmed = categoryId.trim();
    if (!mongoose.Types.ObjectId.isValid(trimmed)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Invalid categoryId format.',
      });
    }
    sanitizedCategoryId = trimmed;
  }

  let sanitizedAgentId = undefined;
  if (agentId && agentId !== 'all') {
    const trimmed = agentId.trim();
    if (trimmed.toLowerCase() !== 'unassigned' && !mongoose.Types.ObjectId.isValid(trimmed)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Invalid agentId format (must be ObjectId or "unassigned").',
      });
    }
    sanitizedAgentId = trimmed;
  }

  req.validatedQuery = {
    page: parsedPage,
    limit: parsedLimit,
    search: typeof search === 'string' ? search.trim() : '',
    status: sanitizedStatus,
    priority: sanitizedPriority,
    categoryId: sanitizedCategoryId,
    agentId: sanitizedAgentId,
  };

  next();
};

/**
 * Validates :ticketId parameter (supports ObjectId or ticketNumber)
 */
export const validateAdminTicketId = (req, res, next) => {
  let { ticketId } = req.params;

  if (!ticketId || typeof ticketId !== 'string' || !ticketId.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Ticket ID parameter is required.',
    });
  }

  ticketId = ticketId.trim();
  if (ticketId.startsWith('#')) {
    ticketId = ticketId.substring(1);
  }

  req.sanitizedTicketId = ticketId;
  next();
};

/**
 * Validates body for PATCH /api/v1/admin/tickets/:ticketId/assign
 */
export const validateAssignAgent = (req, res, next) => {
  const { agentId } = req.body || {};

  if (agentId === null || agentId === undefined || agentId === '' || agentId === 'unassigned') {
    req.sanitizedAgentId = null;
    return next();
  }

  if (typeof agentId !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Validation error: agentId must be a valid ObjectId or null.',
    });
  }

  const trimmed = agentId.trim();
  if (trimmed.toLowerCase() === 'unassigned') {
    req.sanitizedAgentId = null;
    return next();
  }

  if (!mongoose.Types.ObjectId.isValid(trimmed)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Invalid agentId format.',
    });
  }

  req.sanitizedAgentId = trimmed;
  next();
};

/**
 * Validates body for PATCH /api/v1/admin/tickets/:ticketId/status
 */
export const validateUpdateStatus = (req, res, next) => {
  const { status } = req.body || {};

  if (!status || typeof status !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Status is required and must be a string.',
    });
  }

  const normalized = status.trim().toUpperCase();
  if (!SUPPORTED_STATUSES.includes(normalized)) {
    return res.status(400).json({
      success: false,
      message: `Validation error: Status must be one of [${SUPPORTED_STATUSES.join(', ')}].`,
    });
  }

  req.sanitizedStatus = normalized;
  next();
};

/**
 * Validates body for PATCH /api/v1/admin/tickets/:ticketId/priority
 */
export const validateUpdatePriority = (req, res, next) => {
  const { priority } = req.body || {};

  if (!priority || typeof priority !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Priority is required and must be a string.',
    });
  }

  const normalized = priority.trim().toUpperCase();
  if (!SUPPORTED_PRIORITIES.includes(normalized)) {
    return res.status(400).json({
      success: false,
      message: `Validation error: Priority must be one of [${SUPPORTED_PRIORITIES.join(', ')}].`,
    });
  }

  req.sanitizedPriority = normalized;
  next();
};

/**
 * Validates body for POST /api/v1/admin/tickets/:ticketId/messages
 */
export const validateAdminReply = (req, res, next) => {
  const { body } = req.body || {};

  if (body === undefined || body === null || typeof body !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Message body is required and must be a string.',
    });
  }

  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Message body cannot be empty.',
    });
  }

  if (trimmed.length > 5000) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Message body cannot exceed 5000 characters.',
    });
  }

  req.sanitizedBody = trimmed;
  next();
};

export default {
  validateTicketQuery,
  validateAdminTicketId,
  validateAssignAgent,
  validateUpdateStatus,
  validateUpdatePriority,
  validateAdminReply,
};
