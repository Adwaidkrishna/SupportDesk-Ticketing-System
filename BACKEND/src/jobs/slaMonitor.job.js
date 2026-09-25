import Ticket from '../models/Ticket.js';
import { evaluateTicketSla } from '../services/sla/sla.service.js';
import { createNotification, notifyRole } from '../services/notification/index.js';
import { getIO } from '../socket/socket.js';

let monitorInterval = null;

/**
 * Atomically claim SLA warning event for a ticket.
 * Ensures exactly-once processing across multiple concurrent backend instances.
 * @param {string|import('mongoose').Types.ObjectId} ticketId
 * @returns {Promise<import('../models/Ticket.js').default|null>}
 */
export const claimSlaWarning = async (ticketId) => {
  return Ticket.findOneAndUpdate(
    {
      _id: ticketId,
      'sla.warningNotified': { $ne: true },
      'sla.breachNotified': { $ne: true },
      status: { $in: ['OPEN', 'IN_PROGRESS'] },
    },
    {
      $set: {
        'sla.warningNotified': true,
      },
    },
    { returnDocument: 'after' }
  );
};

/**
 * Atomically claim SLA breach event for a ticket.
 * Ensures exactly-once processing across multiple concurrent backend instances.
 * @param {string|import('mongoose').Types.ObjectId} ticketId
 * @param {Object} [evaluation={}]
 * @returns {Promise<import('../models/Ticket.js').default|null>}
 */
export const claimSlaBreach = async (ticketId, evaluation = {}) => {
  const setFields = {
    'sla.isBreached': true,
    'sla.breachNotified': true,
  };
  if (evaluation.isResponseBreached) {
    setFields['sla.responseBreached'] = true;
  }
  if (evaluation.isResolutionBreached) {
    setFields['sla.resolutionBreached'] = true;
  }

  return Ticket.findOneAndUpdate(
    {
      _id: ticketId,
      'sla.breachNotified': { $ne: true },
      status: { $in: ['OPEN', 'IN_PROGRESS'] },
    },
    {
      $set: setFields,
    },
    { returnDocument: 'after' }
  );
};

/**
 * Process SLA Warning for a ticket with distributed concurrency protection.
 * Only the worker that successfully claims the ticket will dispatch alerts.
 * @param {Object} ticket
 * @param {Object} evaluation
 * @returns {Promise<Object|null>}
 */
export const processTicketWarning = async (ticket, evaluation) => {
  const claimedTicket = await claimSlaWarning(ticket._id);
  if (!claimedTicket) {
    // Already claimed or processed by another instance
    return null;
  }

  // 1. Notify Assigned Agent & Admins
  const warnPromises = [];
  if (claimedTicket.assignedTo) {
    warnPromises.push(
      createNotification({
        recipient: claimedTicket.assignedTo,
        type: 'sla_warning',
        title: `SLA Warning: #${claimedTicket.ticketNumber}`,
        message: `Ticket "${claimedTicket.subject}" is approaching its SLA target deadline.`,
        ticketId: claimedTicket._id,
        ticketNumber: claimedTicket.ticketNumber,
        targetRoute: `/agent/tickets/${claimedTicket.ticketNumber}`,
      }).catch((err) => console.warn('[SLA Monitor] Failed to notify agent of warning:', err.message))
    );
  }

  warnPromises.push(
    notifyRole('admin', {
      type: 'sla_warning',
      title: `SLA Warning: #${claimedTicket.ticketNumber}`,
      message: `Ticket "${claimedTicket.subject}" (${claimedTicket.priority}) is approaching SLA deadline.`,
      ticketId: claimedTicket._id,
      ticketNumber: claimedTicket.ticketNumber,
      targetRoute: `/admin/tickets/${claimedTicket.ticketNumber}`,
    }).catch((err) => console.warn('[SLA Monitor] Failed to notify admins of warning:', err.message))
  );

  try {
    await Promise.all(warnPromises);
  } catch (err) {
    console.error('[SLA Monitor] Failed to dispatch warning notifications:', err.message);
  }

  // 2. Emit real-time Socket.IO event
  try {
    const io = getIO();
    io.to(`ticket:${claimedTicket.ticketNumber}`).emit('sla:warning', {
      ticketId: claimedTicket._id.toString(),
      ticketNumber: claimedTicket.ticketNumber,
      evaluation,
    });
  } catch {
    // Non-blocking (Socket.IO may not be initialized in test runner)
  }

  return claimedTicket;
};

/**
 * Process SLA Breach for a ticket with distributed concurrency protection.
 * Only the worker that successfully claims the ticket will dispatch alerts.
 * @param {Object} ticket
 * @param {Object} evaluation
 * @returns {Promise<Object|null>}
 */
export const processTicketBreach = async (ticket, evaluation) => {
  const claimedTicket = await claimSlaBreach(ticket._id, evaluation);
  if (!claimedTicket) {
    // Already claimed or processed by another instance
    return null;
  }

  // 1. Notify Assigned Agent & Admins
  const breachPromises = [];
  if (claimedTicket.assignedTo) {
    breachPromises.push(
      createNotification({
        recipient: claimedTicket.assignedTo,
        type: 'sla_breach',
        title: `SLA Breached: #${claimedTicket.ticketNumber}`,
        message: `Ticket "${claimedTicket.subject}" has breached its SLA target.`,
        ticketId: claimedTicket._id,
        ticketNumber: claimedTicket.ticketNumber,
        targetRoute: `/agent/tickets/${claimedTicket.ticketNumber}`,
      }).catch((err) => console.warn('[SLA Monitor] Failed to notify agent of breach:', err.message))
    );
  }

  breachPromises.push(
    notifyRole('admin', {
      type: 'sla_breach',
      title: `SLA Breached: #${claimedTicket.ticketNumber}`,
      message: `Ticket "${claimedTicket.subject}" (${claimedTicket.priority}) has breached SLA.`,
      ticketId: claimedTicket._id,
      ticketNumber: claimedTicket.ticketNumber,
      targetRoute: `/admin/tickets/${claimedTicket.ticketNumber}`,
    }).catch((err) => console.warn('[SLA Monitor] Failed to notify admins of breach:', err.message))
  );

  try {
    await Promise.all(breachPromises);
  } catch (err) {
    console.error('[SLA Monitor] Failed to dispatch breach notifications:', err.message);
  }

  // 2. Emit real-time Socket.IO event
  try {
    const io = getIO();
    io.to(`ticket:${claimedTicket.ticketNumber}`).emit('sla:breach', {
      ticketId: claimedTicket._id.toString(),
      ticketNumber: claimedTicket.ticketNumber,
      evaluation,
    });
  } catch {
    // Non-blocking (Socket.IO may not be initialized in test runner)
  }

  return claimedTicket;
};

/**
 * Execute a single SLA check pass across all active tickets.
 * Detects upcoming SLA warnings and SLA breaches with distributed atomicity.
 */
export const runSlaCheckOnce = async () => {
  try {
    const activeTickets = await Ticket.find({
      status: { $in: ['OPEN', 'IN_PROGRESS'] },
      'sla.responseDeadline': { $ne: null },
      'sla.breachNotified': { $ne: true },
    });

    const now = new Date();

    for (const ticket of activeTickets) {
      const evaluation = evaluateTicketSla(ticket, now);

      // Handle SLA Breach
      if (evaluation.isBreached && !ticket.sla.breachNotified) {
        await processTicketBreach(ticket, evaluation);
      }
      // Handle SLA Warning
      else if (evaluation.isWarning && !ticket.sla.warningNotified) {
        await processTicketWarning(ticket, evaluation);
      }
    }
  } catch (error) {
    console.error('[SLA Monitor] Error running periodic SLA check:', error.message);
  }
};

/**
 * Start periodic SLA monitor worker
 * @param {number} [intervalMs=60000]
 */
export const startSlaMonitor = (intervalMs = 60000) => {
  if (monitorInterval) return;
  monitorInterval = setInterval(runSlaCheckOnce, intervalMs);
  console.log(`⏱️ SLA Monitor worker started (Interval: ${intervalMs}ms)`);
};

/**
 * Stop periodic SLA monitor worker
 */
export const stopSlaMonitor = () => {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('⏱️ SLA Monitor worker stopped');
  }
};

export default {
  runSlaCheckOnce,
  startSlaMonitor,
  stopSlaMonitor,
  claimSlaWarning,
  claimSlaBreach,
  processTicketWarning,
  processTicketBreach,
};
