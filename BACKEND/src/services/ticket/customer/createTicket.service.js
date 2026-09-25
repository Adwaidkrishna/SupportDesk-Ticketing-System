import Ticket from '../../../models/Ticket.js';
import Category from '../../../models/Category.js';
import Counter from '../../../models/Counter.js';
import { createNotification, notifyRole } from '../../notification/index.js';

/**
 * Find the highest numeric ticket number currently in MongoDB without scanning the entire collection.
 * Uses the indexed reverse sort to inspect only the top recent tickets.
 * @returns {Promise<number>}
 */
export const getHighestExistingTicketNumber = async () => {
  const tickets = await Ticket.find({ ticketNumber: /^TKT-\d+$/ }, { ticketNumber: 1 })
    .sort({ ticketNumber: -1 })
    .limit(10)
    .lean();

  let maxNum = 0;
  for (const t of tickets) {
    const match = t.ticketNumber.match(/^TKT-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return maxNum;
};

/**
 * Synchronize the counter to at least the highest ticket number in the database.
 * @returns {Promise<number>} Updated sequence number
 */
export const syncTicketCounter = async () => {
  const maxExisting = await getHighestExistingTicketNumber();
  const counter = await Counter.findOneAndUpdate(
    { _id: 'ticket' },
    { $max: { seq: maxExisting } },
    { upsert: true, returnDocument: 'after' }
  );
  return counter.seq;
};

/**
 * Generate sequential unique ticket number like TKT-000001 atomically.
 * Prevents full collection scans and concurrent duplicate collisions.
 * @returns {Promise<string>}
 */
export const generateTicketNumber = async () => {
  let counter = await Counter.findOneAndUpdate(
    { _id: 'ticket' },
    { $inc: { seq: 1 } },
    { returnDocument: 'after' }
  );

  // If counter document does not exist yet in MongoDB, initialize it from existing tickets
  if (!counter) {
    const maxExisting = await getHighestExistingTicketNumber();
    try {
      await Counter.updateOne(
        { _id: 'ticket' },
        { $setOnInsert: { seq: maxExisting } },
        { upsert: true }
      );
    } catch {
      // Concurrently created by another request, safe to proceed
    }
    counter = await Counter.findOneAndUpdate(
      { _id: 'ticket' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after' }
    );
  }

  return `TKT-${String(counter.seq).padStart(6, '0')}`;
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

  // 2. Calculate SLA deadlines based on active policy
  const { calculateSlaForTicket } = await import('../../sla/sla.service.js');
  const slaData = await calculateSlaForTicket(priority || 'MEDIUM');

  // 3. Atomically generate unique Ticket Number and create Ticket Document
  let newTicket;
  let attempts = 0;
  const maxAttempts = 3;

  while (!newTicket && attempts < maxAttempts) {
    attempts++;
    const ticketNumber = await generateTicketNumber();
    try {
      newTicket = await Ticket.create({
        ticketNumber,
        customerId,
        categoryId,
        subject: subject.trim(),
        description: description.trim(),
        priority: priority || 'MEDIUM',
        status: 'OPEN', // Backend unconditionally enforces initial status OPEN
        sla: slaData,
      });
    } catch (err) {
      // If a duplicate key error occurs on ticketNumber (e.g. out-of-band manual DB insertion)
      if (err.code === 11000 && (err.keyPattern?.ticketNumber || err.message?.includes('ticketNumber'))) {
        await syncTicketCounter();
        if (attempts >= maxAttempts) throw err;
        continue;
      }
      throw err;
    }
  }

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
      sla: newTicket.sla,
      createdAt: newTicket.createdAt,
      updatedAt: newTicket.updatedAt,
    },
  };
};
