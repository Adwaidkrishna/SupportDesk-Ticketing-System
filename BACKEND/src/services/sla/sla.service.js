import SlaPolicy from '../../models/SlaPolicy.js';
import Ticket from '../../models/Ticket.js';

export const DEFAULT_SLA_POLICIES = [
  {
    name: 'Urgent Priority SLA',
    priority: 'URGENT',
    responseTimeMinutes: 30, // 30 minutes
    resolutionTimeMinutes: 240, // 4 hours
    warningPercentage: 80,
    businessHours: '24/7 Coverage',
    isActive: true,
  },
  {
    name: 'High Priority SLA',
    priority: 'HIGH',
    responseTimeMinutes: 60, // 1 hour
    resolutionTimeMinutes: 480, // 8 hours
    warningPercentage: 80,
    businessHours: '24/7 Coverage',
    isActive: true,
  },
  {
    name: 'Medium Priority SLA',
    priority: 'MEDIUM',
    responseTimeMinutes: 240, // 4 hours
    resolutionTimeMinutes: 1440, // 24 hours
    warningPercentage: 80,
    businessHours: 'Business Hours (9-6)',
    isActive: true,
  },
  {
    name: 'Low Priority SLA',
    priority: 'LOW',
    responseTimeMinutes: 480, // 8 hours
    resolutionTimeMinutes: 2880, // 48 hours
    warningPercentage: 80,
    businessHours: 'Business Hours (9-6)',
    isActive: true,
  },
];

/**
 * Seed default policies if no policy exists for a priority
 */
export const seedDefaultPolicies = async () => {
  for (const def of DEFAULT_SLA_POLICIES) {
    const existing = await SlaPolicy.findOne({ priority: def.priority });
    if (!existing) {
      await SlaPolicy.create(def);
    }
  }
};

/**
 * Retrieve active SLA policy for a given ticket priority
 * @param {'LOW'|'MEDIUM'|'HIGH'|'URGENT'} priority
 * @returns {Promise<Object>}
 */
export const getActivePolicyForPriority = async (priority) => {
  const normalizedPriority = (priority || 'MEDIUM').toUpperCase();
  let policy = await SlaPolicy.findOne({ priority: normalizedPriority, isActive: true }).lean();

  if (!policy) {
    // Check if there is an inactive policy or fallback to default config
    const defaultDef = DEFAULT_SLA_POLICIES.find((p) => p.priority === normalizedPriority) || DEFAULT_SLA_POLICIES[2];
    policy = await SlaPolicy.findOneAndUpdate(
      { priority: normalizedPriority },
      { $setOnInsert: defaultDef },
      { upsert: true, new: true }
    ).lean();
  }

  return policy;
};

/**
 * Calculate SLA deadlines and metadata for a ticket
 * @param {string} priority
 * @param {Date} [createdAt]
 * @returns {Promise<Object>}
 */
export const calculateSlaForTicket = async (priority, createdAt = new Date()) => {
  const policy = await getActivePolicyForPriority(priority);
  const createdTime = new Date(createdAt).getTime();

  const responseDeadline = new Date(createdTime + policy.responseTimeMinutes * 60 * 1000);
  const resolutionDeadline = new Date(createdTime + policy.resolutionTimeMinutes * 60 * 1000);

  return {
    policyId: policy._id,
    policyName: policy.name,
    priority: policy.priority,
    responseTimeMinutes: policy.responseTimeMinutes,
    resolutionTimeMinutes: policy.resolutionTimeMinutes,
    warningPercentage: policy.warningPercentage || 80,
    responseDeadline,
    resolutionDeadline,
    firstResponseAt: null,
    responseBreached: false,
    resolvedAt: null,
    resolutionBreached: false,
    isBreached: false,
    warningNotified: false,
    breachNotified: false,
  };
};

/**
 * Reusable SLA evaluation function for a ticket.
 * Evaluates response status, resolution status, warning state, breach state, and remaining times.
 *
 * @param {Object} ticket
 * @param {Date} [now]
 * @returns {Object} Evaluated SLA details
 */
export const evaluateTicketSla = (ticket, now = new Date()) => {
  if (!ticket || !ticket.sla || !ticket.sla.responseDeadline || !ticket.sla.resolutionDeadline) {
    return {
      hasSla: false,
      overallStatus: 'WITHIN_SLA',
      responseStatus: 'WITHIN_SLA',
      resolutionStatus: 'WITHIN_SLA',
      isWarning: false,
      isBreached: false,
      responseRemainingMs: 0,
      resolutionRemainingMs: 0,
    };
  }

  const currentTime = new Date(now).getTime();
  const createdTime = new Date(ticket.createdAt || now).getTime();

  const responseDeadlineTime = new Date(ticket.sla.responseDeadline).getTime();
  const resolutionDeadlineTime = new Date(ticket.sla.resolutionDeadline).getTime();

  const warningPercentage = (ticket.sla.warningPercentage || 80) / 100;

  // Warning thresholds
  const responseDuration = responseDeadlineTime - createdTime;
  const resolutionDuration = resolutionDeadlineTime - createdTime;

  const responseWarningTime = createdTime + responseDuration * warningPercentage;
  const resolutionWarningTime = createdTime + resolutionDuration * warningPercentage;

  // 1. Evaluate Response SLA
  let responseStatus = 'WITHIN_SLA';
  let isResponseBreached = ticket.sla.responseBreached || false;

  if (ticket.sla.firstResponseAt) {
    const firstResponseTime = new Date(ticket.sla.firstResponseAt).getTime();
    if (firstResponseTime > responseDeadlineTime) {
      responseStatus = 'BREACHED';
      isResponseBreached = true;
    } else {
      responseStatus = 'WITHIN_SLA';
    }
  } else {
    // No response yet
    if (currentTime > responseDeadlineTime) {
      responseStatus = 'BREACHED';
      isResponseBreached = true;
    } else if (currentTime >= responseWarningTime) {
      responseStatus = 'WARNING';
    } else {
      responseStatus = 'WITHIN_SLA';
    }
  }

  // 2. Evaluate Resolution SLA
  let resolutionStatus = 'WITHIN_SLA';
  let isResolutionBreached = ticket.sla.resolutionBreached || false;

  const isResolvedOrClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

  if (isResolvedOrClosed) {
    if (ticket.sla.resolvedAt) {
      const resolvedTime = new Date(ticket.sla.resolvedAt).getTime();
      if (resolvedTime > resolutionDeadlineTime) {
        resolutionStatus = 'BREACHED';
        isResolutionBreached = true;
      } else {
        resolutionStatus = 'WITHIN_SLA';
      }
    } else {
      resolutionStatus = 'WITHIN_SLA';
    }
  } else {
    // Ticket still active
    if (currentTime > resolutionDeadlineTime) {
      resolutionStatus = 'BREACHED';
      isResolutionBreached = true;
    } else if (currentTime >= resolutionWarningTime) {
      resolutionStatus = 'WARNING';
    } else {
      resolutionStatus = 'WITHIN_SLA';
    }
  }

  const isBreached = isResponseBreached || isResolutionBreached || ticket.sla.isBreached || false;
  const isWarning =
    !isBreached && (responseStatus === 'WARNING' || resolutionStatus === 'WARNING');

  let overallStatus = 'WITHIN_SLA';
  if (isBreached) {
    overallStatus = 'BREACHED';
  } else if (isWarning) {
    overallStatus = 'WARNING';
  }

  const responseRemainingMs = Math.max(0, responseDeadlineTime - currentTime);
  const resolutionRemainingMs = Math.max(0, resolutionDeadlineTime - currentTime);

  return {
    hasSla: true,
    policyName: ticket.sla.policyName,
    policyId: ticket.sla.policyId,
    overallStatus,
    responseStatus,
    resolutionStatus,
    isWarning,
    isBreached,
    isResponseBreached,
    isResolutionBreached,
    responseDeadline: ticket.sla.responseDeadline,
    resolutionDeadline: ticket.sla.resolutionDeadline,
    firstResponseAt: ticket.sla.firstResponseAt,
    resolvedAt: ticket.sla.resolvedAt,
    responseRemainingMs,
    resolutionRemainingMs,
  };
};

/**
 * Record first valid response on ticket by agent or admin
 * @param {string} ticketId
 * @param {'agent'|'admin'} responderRole
 * @param {string} responderId
 */
export const recordFirstResponse = async (ticketId, responderRole, _responderId) => {
  if (responderRole !== 'agent' && responderRole !== 'admin') {
    return null;
  }

  const ticket = await Ticket.findById(ticketId);
  if (!ticket || !ticket.sla || ticket.sla.firstResponseAt) {
    return ticket;
  }

  const now = new Date();
  ticket.sla.firstResponseAt = now;

  if (ticket.sla.responseDeadline && now > ticket.sla.responseDeadline) {
    ticket.sla.responseBreached = true;
    ticket.sla.isBreached = true;
  }

  await ticket.save();
  return ticket;
};

/**
 * Record ticket resolution time
 * @param {string|Object} ticketOrId - Ticket MongoDB ObjectId or in-memory Ticket document
 * @param {Object} [options]
 * @param {boolean} [options.save=true] - Whether to persist the document to MongoDB immediately
 * @returns {Promise<Object>} Updated ticket document
 */
export const recordResolution = async (ticketOrId, options = { save: true }) => {
  let ticket;

  if (ticketOrId && typeof ticketOrId === 'object' && ticketOrId.sla) {
    ticket = ticketOrId;
  } else {
    ticket = await Ticket.findById(ticketOrId);
  }

  if (!ticket || !ticket.sla) {
    return ticket;
  }

  const now = new Date();
  if (!ticket.sla.resolvedAt) {
    ticket.sla.resolvedAt = now;
  }

  if (ticket.sla.resolutionDeadline && now > ticket.sla.resolutionDeadline) {
    ticket.sla.resolutionBreached = true;
    ticket.sla.isBreached = true;
  }

  if (options.save !== false) {
    await ticket.save();
  }

  return ticket;
};

export default {
  DEFAULT_SLA_POLICIES,
  seedDefaultPolicies,
  getActivePolicyForPriority,
  calculateSlaForTicket,
  evaluateTicketSla,
  recordFirstResponse,
  recordResolution,
};
