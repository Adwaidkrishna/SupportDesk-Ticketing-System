import Ticket from '../../models/Ticket.js';
import Category from '../../models/Category.js';
import { createNotification, notifyRole } from '../notification.service.js';

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

  // Real-time notifications: notify customer + relevant agents/admins
  createNotification({
    recipient: customerId,
    type: 'ticket_created',
    title: `Ticket #${newTicket.ticketNumber} Created`,
    message: `Your ticket "${newTicket.subject}" has been successfully created and is waiting for review.`,
    ticketId: newTicket._id,
    ticketNumber: newTicket.ticketNumber,
    targetRoute: `/customer/tickets/${newTicket.ticketNumber}`,
  }).catch((err) => console.warn('[Notification] Failed to notify customer on ticket creation:', err.message));

  notifyRole('agent', {
    type: 'ticket_created',
    title: `New Ticket #${newTicket.ticketNumber}`,
    message: `New ticket created: "${newTicket.subject}"`,
    ticketId: newTicket._id,
    ticketNumber: newTicket.ticketNumber,
    targetRoute: `/agent/tickets/${newTicket.ticketNumber}`,
  }).catch((err) => console.warn('[Notification] Failed to notify agents on ticket creation:', err.message));

  notifyRole('admin', {
    type: 'ticket_created',
    title: `New Ticket #${newTicket.ticketNumber}`,
    message: `New ticket created: "${newTicket.subject}"`,
    ticketId: newTicket._id,
    ticketNumber: newTicket.ticketNumber,
    targetRoute: `/admin/tickets/${newTicket.ticketNumber}`,
  }).catch((err) => console.warn('[Notification] Failed to notify admins on ticket creation:', err.message));

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
