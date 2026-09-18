import mongoose from 'mongoose';

export const SUPPORTED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const SUPPORTED_STATUSES = ['OPEN'];

export const validateCreateTicketInput = (req, res, next) => {
  const { subject, description, categoryId, priority } = req.body;

  // 1. Validate Subject
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Subject is required.',
    });
  }

  const trimmedSubject = subject.trim();
  if (trimmedSubject.length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Subject must be at least 5 characters long.',
    });
  }

  if (trimmedSubject.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Subject must not exceed 200 characters.',
    });
  }

  // 2. Validate Description
  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Description is required.',
    });
  }

  const trimmedDescription = description.trim();
  if (trimmedDescription.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Description must be at least 10 characters long.',
    });
  }

  if (trimmedDescription.length > 5000) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Description must not exceed 5000 characters.',
    });
  }

  // 3. Validate Category ID
  if (!categoryId || typeof categoryId !== 'string' || !categoryId.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Category ID is required.',
    });
  }

  const trimmedCategoryId = categoryId.trim();
  if (!mongoose.Types.ObjectId.isValid(trimmedCategoryId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Invalid Category ID format.',
    });
  }

  // 4. Validate Priority if provided
  if (priority !== undefined && priority !== null && priority !== '') {
    if (typeof priority !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Priority must be a string.',
      });
    }
    const normalizedPriority = priority.trim().toUpperCase();
    if (!SUPPORTED_PRIORITIES.includes(normalizedPriority)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Priority must be one of [${SUPPORTED_PRIORITIES.join(', ')}].`,
      });
    }
  }

  req.validatedData = {
    subject: trimmedSubject,
    description: trimmedDescription,
    categoryId: trimmedCategoryId,
    priority: priority ? priority.trim().toUpperCase() : 'MEDIUM',
  };

  next();
};

/**
 * Validates query parameters for GET /api/v1/tickets/my-tickets
 */
export const validateGetMyTicketsInput = (req, res, next) => {
  const { page, limit, status } = req.query;

  let parsedPage = 1;
  let parsedLimit = 10;
  let parsedStatus = undefined;

  // 1. Validate page if provided
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

  // 2. Validate limit if provided
  if (limit !== undefined && limit !== null && limit !== '') {
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Limit must be an integer between 1 and 50.',
      });
    }
    parsedLimit = limitNum;
  }

  // 3. Validate status if provided
  if (status !== undefined && status !== null && status !== '' && status !== 'All') {
    if (typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Status must be a string.',
      });
    }
    const normalizedStatus = status.trim().toUpperCase();
    if (!SUPPORTED_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Invalid status filter. Supported values are [${SUPPORTED_STATUSES.join(', ')}].`,
      });
    }
    parsedStatus = normalizedStatus;
  }

  req.validatedQuery = {
    page: parsedPage,
    limit: parsedLimit,
    status: parsedStatus,
  };

  next();
};

/**
 * Validates path parameter ticketId for GET /api/v1/tickets/:ticketId
 */
export const validateTicketIdParam = (req, res, next) => {
  const { ticketId } = req.params;

  if (!ticketId || typeof ticketId !== 'string' || !ticketId.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Ticket ID parameter is required.',
    });
  }

  const trimmedId = ticketId.trim();
  if (!mongoose.Types.ObjectId.isValid(trimmedId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Invalid ticket ID format.',
    });
  }

  req.params.ticketId = trimmedId;
  next();
};

/**
 * Validates query parameters for GET /api/v1/agent/queue
 */
export const validateGetAgentQueueInput = (req, res, next) => {
  const { page, limit } = req.query;

  let parsedPage = 1;
  let parsedLimit = 10;

  // 1. Validate page if provided
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

  // 2. Validate limit if provided
  if (limit !== undefined && limit !== null && limit !== '') {
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Limit must be an integer between 1 and 50.',
      });
    }
    parsedLimit = limitNum;
  }

  req.validatedQuery = {
    page: parsedPage,
    limit: parsedLimit,
  };

  next();
};

