import Ticket from '../models/Ticket.js';
import Category from '../models/Category.js';

/**
 * Generate sequential unique ticket number like TKT-000001
 */
export const generateTicketNumber = async () => {
  const lastTicket = await Ticket.findOne({}, { ticketNumber: 1 })
    .sort({ createdAt: -1 })
    .exec();

  let nextNum = 1;
  if (lastTicket && lastTicket.ticketNumber) {
    const match = lastTicket.ticketNumber.match(/TKT-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  return `TKT-${String(nextNum).padStart(6, '0')}`;
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

export default {
  createTicket,
  generateTicketNumber,
};
