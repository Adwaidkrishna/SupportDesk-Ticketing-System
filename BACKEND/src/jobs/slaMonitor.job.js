import Ticket from '../models/Ticket.js';
import { evaluateTicketSla } from '../services/sla/sla.service.js';
import { createNotification, notifyRole } from '../services/notification/index.js';
import { getIO } from '../socket/socket.js';

let monitorInterval = null;

/**
 * Execute a single SLA check pass across all active tickets.
 * Detects upcoming SLA warnings and SLA breaches.
 */
export const runSlaCheckOnce = async () => {
  try {
    const activeTickets = await Ticket.find({
      status: { $in: ['OPEN', 'IN_PROGRESS'] },
      'sla.responseDeadline': { $ne: null },
    });

    const now = new Date();

    for (const ticket of activeTickets) {
      const evaluation = evaluateTicketSla(ticket, now);

      // Handle SLA Breach
      if (evaluation.isBreached && !ticket.sla.breachNotified) {
        ticket.sla.isBreached = true;
        ticket.sla.breachNotified = true;
        if (evaluation.isResponseBreached) {
          ticket.sla.responseBreached = true;
        }
        if (evaluation.isResolutionBreached) {
          ticket.sla.resolutionBreached = true;
        }
        await ticket.save();

        // 1. Notify Assigned Agent & Admins
        const breachPromises = [];
        if (ticket.assignedTo) {
          breachPromises.push(
            createNotification({
              recipient: ticket.assignedTo,
              type: 'sla_breach',
              title: `SLA Breached: #${ticket.ticketNumber}`,
              message: `Ticket "${ticket.subject}" has breached its SLA target.`,
              ticketId: ticket._id,
              ticketNumber: ticket.ticketNumber,
              targetRoute: `/agent/tickets/${ticket.ticketNumber}`,
            }).catch((err) => console.warn('[SLA Monitor] Failed to notify agent of breach:', err.message))
          );
        }

        breachPromises.push(
          notifyRole('admin', {
            type: 'sla_breach',
            title: `SLA Breached: #${ticket.ticketNumber}`,
            message: `Ticket "${ticket.subject}" (${ticket.priority}) has breached SLA.`,
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            targetRoute: `/admin/tickets/${ticket.ticketNumber}`,
          }).catch((err) => console.warn('[SLA Monitor] Failed to notify admins of breach:', err.message))
        );

        await Promise.all(breachPromises);

        // 3. Emit real-time Socket.IO event
        try {
          const io = getIO();
          io.to(`ticket:${ticket.ticketNumber}`).emit('sla:breach', {
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.ticketNumber,
            evaluation,
          });
        } catch {
          // Socket.IO may not be active in isolated test runs
        }
      }
      // Handle SLA Warning
      else if (evaluation.isWarning && !ticket.sla.warningNotified) {
        ticket.sla.warningNotified = true;
        await ticket.save();

        // 1. Notify Assigned Agent & Admins
        const warnPromises = [];
        if (ticket.assignedTo) {
          warnPromises.push(
            createNotification({
              recipient: ticket.assignedTo,
              type: 'sla_warning',
              title: `SLA Warning: #${ticket.ticketNumber}`,
              message: `Ticket "${ticket.subject}" is approaching its SLA target deadline.`,
              ticketId: ticket._id,
              ticketNumber: ticket.ticketNumber,
              targetRoute: `/agent/tickets/${ticket.ticketNumber}`,
            }).catch((err) => console.warn('[SLA Monitor] Failed to notify agent of warning:', err.message))
          );
        }

        warnPromises.push(
          notifyRole('admin', {
            type: 'sla_warning',
            title: `SLA Warning: #${ticket.ticketNumber}`,
            message: `Ticket "${ticket.subject}" (${ticket.priority}) is approaching SLA deadline.`,
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            targetRoute: `/admin/tickets/${ticket.ticketNumber}`,
          }).catch((err) => console.warn('[SLA Monitor] Failed to notify admins of warning:', err.message))
        );

        await Promise.all(warnPromises);

        // 3. Emit real-time Socket.IO event
        try {
          const io = getIO();
          io.to(`ticket:${ticket.ticketNumber}`).emit('sla:warning', {
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.ticketNumber,
            evaluation,
          });
        } catch {
          // Non-blocking
        }
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
};
