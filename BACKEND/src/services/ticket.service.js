import Ticket from '../models/Ticket.js';
import Category from '../models/Category.js';

/**
 * Generate sequential unique ticket number like TKT-000001
 */
export const generateTicketNumber = async () => {
  const tickets = await Ticket.find({ ticketNumber: /^TKT-\d+$/ }, { ticketNumber: 1 }).lean();
  let maxNum = 0;
  for (const t of tickets) {
    const match = t.ticketNumber.match(/^TKT-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `TKT-${String(maxNum + 1).padStart(6, '0')}`;
};

/**
 * Service to create a new ticket for an authenticated customer.
 */
export const createTicket = async ({ customerId, subject, description, categoryId, priority }) => {
  // 1. Verify Category exists in MongoDB
  const categoryExists = await Category.findById(categoryId);
  if (!categoryExists || !categoryExists.isActive) {
    const err = new Error('Category not found.');
    err.statusCode = 404;
    throw err;
  }

  // 2. Generate unique Ticket Number
  const ticketNumber = await generateTicketNumber();

  // 3. Create Ticket Document with explicit permitted fields only
  const newTicket = await Ticket.create({
    ticketNumber,
    customerId,
    categoryId,
    subject: subject.trim(),
    description: description.trim(),
    priority: priority || 'MEDIUM',
    status: 'OPEN', // Backend unconditionally enforces initial status OPEN
  });

  return {
    ticket: {
      id: newTicket._id.toString(),
      _id: newTicket._id.toString(),
      ticketNumber: newTicket.ticketNumber,
      subject: newTicket.subject,
      description: newTicket.description,
      categoryId: newTicket.categoryId.toString(),
      priority: newTicket.priority,
      status: newTicket.status,
      createdAt: newTicket.createdAt,
      updatedAt: newTicket.updatedAt,
    },
  };
};

/**
 * Service to list tickets created strictly by the authenticated customer.
 */
export const getMyTickets = async ({ customerId, page = 1, limit = 10, status }) => {
  // Mandatory customer isolation query
  const query = { customerId };

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [rawTickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('categoryId', 'name description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Ticket.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const tickets = rawTickets.map((t) => ({
    id: t._id.toString(),
    _id: t._id.toString(),
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    category: t.categoryId
      ? {
          id: t.categoryId._id.toString(),
          _id: t.categoryId._id.toString(),
          name: t.categoryId.name,
          description: t.categoryId.description,
        }
      : null,
    categoryId: t.categoryId ? t.categoryId._id.toString() : null,
    priority: t.priority,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  return {
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
};

/**
 * Service to retrieve single ticket details strictly owned by the authenticated customer.
 */
export const getTicketByIdForCustomer = async (ticketId, customerId) => {
  // Scoped query: ticketId AND customerId (Customer Isolation & IDOR Protection)
  const ticket = await Ticket.findOne({
    _id: ticketId,
    customerId,
  })
    .populate('categoryId', 'name description')
    .lean();

  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    ticket: {
      id: ticket._id.toString(),
      _id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.categoryId
        ? {
            id: ticket.categoryId._id.toString(),
            _id: ticket.categoryId._id.toString(),
            name: ticket.categoryId.name,
            description: ticket.categoryId.description,
          }
        : null,
      categoryId: ticket.categoryId ? ticket.categoryId._id.toString() : null,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    },
  };
};

export default {
  createTicket,
  generateTicketNumber,
  getMyTickets,
  getTicketByIdForCustomer,
};
