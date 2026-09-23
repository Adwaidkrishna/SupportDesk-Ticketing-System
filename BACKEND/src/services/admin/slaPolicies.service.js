import SlaPolicy from '../../models/SlaPolicy.js';
import Ticket from '../../models/Ticket.js';
import { evaluateTicketSla, seedDefaultPolicies } from '../sla/sla.service.js';

/**
 * Format minutes into a friendly human-readable label (e.g., "30 min", "4 hours", "2 days").
 */
const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return 'N/A';
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes / 1440 > 1 ? 's' : ''}`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes / 60 > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
};

/**
 * Retrieve all configured SLA policies with live ticket compliance statistics.
 */
export const getSlaPolicies = async () => {
  // Ensure default policies exist
  await seedDefaultPolicies();

  const policies = await SlaPolicy.find().sort({ createdAt: -1 }).lean();

  // Retrieve active tickets to calculate real-time SLA metrics per priority
  const activeTickets = await Ticket.find({
    status: { $in: ['OPEN', 'IN_PROGRESS'] },
    'sla.responseDeadline': { $ne: null },
  }).lean();

  const metricsByPriority = {
    LOW: { withinSLA: 0, atRisk: 0, breached: 0 },
    MEDIUM: { withinSLA: 0, atRisk: 0, breached: 0 },
    HIGH: { withinSLA: 0, atRisk: 0, breached: 0 },
    URGENT: { withinSLA: 0, atRisk: 0, breached: 0 },
  };

  const now = new Date();
  for (const t of activeTickets) {
    const p = t.priority || 'MEDIUM';
    if (metricsByPriority[p]) {
      const evaluation = evaluateTicketSla(t, now);
      if (evaluation.isBreached) {
        metricsByPriority[p].breached++;
      } else if (evaluation.isWarning) {
        metricsByPriority[p].atRisk++;
      } else {
        metricsByPriority[p].withinSLA++;
      }
    }
  }

  let totalWithin = 0;
  let totalAtRisk = 0;
  let totalBreached = 0;

  const formattedPolicies = policies.map((p) => {
    const stats = metricsByPriority[p.priority] || { withinSLA: 0, atRisk: 0, breached: 0 };
    totalWithin += stats.withinSLA;
    totalAtRisk += stats.atRisk;
    totalBreached += stats.breached;

    return {
      id: p._id.toString(),
      _id: p._id.toString(),
      name: p.name,
      policyName: p.name,
      priority: p.priority,
      responseTimeMinutes: p.responseTimeMinutes,
      resolutionTimeMinutes: p.resolutionTimeMinutes,
      firstResponseTime: formatDuration(p.responseTimeMinutes),
      resolutionTarget: formatDuration(p.resolutionTimeMinutes),
      warningPercentage: p.warningPercentage || 80,
      businessHours: p.businessHours || '24/7 Coverage',
      isActive: p.isActive,
      status: p.isActive ? 'Active' : 'Inactive',
      withinSLA: stats.withinSLA,
      atRisk: stats.atRisk,
      breached: stats.breached,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  return {
    policies: formattedPolicies,
    overview: {
      activePolicies: policies.filter((p) => p.isActive).length,
      totalPolicies: policies.length,
      withinSLA: totalWithin,
      atRisk: totalAtRisk,
      breached: totalBreached,
    },
  };
};

/**
 * Create a new SLA policy
 */
export const createSlaPolicy = async (data) => {
  const {
    name,
    priority,
    responseTimeMinutes,
    resolutionTimeMinutes,
    warningPercentage,
    businessHours,
    isActive,
  } = data;

  if (isActive) {
    const existingActive = await SlaPolicy.findOne({ priority, isActive: true });
    if (existingActive) {
      const error = new Error(
        `An active SLA policy for priority "${priority}" already exists: "${existingActive.name}". Deactivate it first before creating another active policy for this priority.`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  const policy = await SlaPolicy.create({
    name,
    priority,
    responseTimeMinutes,
    resolutionTimeMinutes,
    warningPercentage: warningPercentage || 80,
    businessHours: businessHours || '24/7 Coverage',
    isActive: isActive !== undefined ? isActive : true,
  });

  return {
    id: policy._id.toString(),
    _id: policy._id.toString(),
    name: policy.name,
    policyName: policy.name,
    priority: policy.priority,
    responseTimeMinutes: policy.responseTimeMinutes,
    resolutionTimeMinutes: policy.resolutionTimeMinutes,
    firstResponseTime: formatDuration(policy.responseTimeMinutes),
    resolutionTarget: formatDuration(policy.resolutionTimeMinutes),
    warningPercentage: policy.warningPercentage,
    businessHours: policy.businessHours,
    isActive: policy.isActive,
    status: policy.isActive ? 'Active' : 'Inactive',
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
};

/**
 * Update an existing SLA policy
 */
export const updateSlaPolicy = async (policyId, data) => {
  const policy = await SlaPolicy.findById(policyId);
  if (!policy) {
    const error = new Error('SLA policy not found.');
    error.statusCode = 404;
    throw error;
  }

  const targetPriority = data.priority || policy.priority;
  const targetActive = data.isActive !== undefined ? data.isActive : policy.isActive;

  if (targetActive) {
    const existingActive = await SlaPolicy.findOne({
      _id: { $ne: policyId },
      priority: targetPriority,
      isActive: true,
    });
    if (existingActive) {
      const error = new Error(
        `An active SLA policy for priority "${targetPriority}" already exists: "${existingActive.name}".`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  if (data.name !== undefined) policy.name = data.name;
  if (data.priority !== undefined) policy.priority = data.priority;
  if (data.responseTimeMinutes !== undefined) policy.responseTimeMinutes = data.responseTimeMinutes;
  if (data.resolutionTimeMinutes !== undefined) policy.resolutionTimeMinutes = data.resolutionTimeMinutes;
  if (data.warningPercentage !== undefined) policy.warningPercentage = data.warningPercentage;
  if (data.businessHours !== undefined) policy.businessHours = data.businessHours;
  if (data.isActive !== undefined) policy.isActive = data.isActive;

  await policy.save();

  return {
    id: policy._id.toString(),
    _id: policy._id.toString(),
    name: policy.name,
    policyName: policy.name,
    priority: policy.priority,
    responseTimeMinutes: policy.responseTimeMinutes,
    resolutionTimeMinutes: policy.resolutionTimeMinutes,
    firstResponseTime: formatDuration(policy.responseTimeMinutes),
    resolutionTarget: formatDuration(policy.resolutionTimeMinutes),
    warningPercentage: policy.warningPercentage,
    businessHours: policy.businessHours,
    isActive: policy.isActive,
    status: policy.isActive ? 'Active' : 'Inactive',
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
};

/**
 * Activate or deactivate an SLA policy
 */
export const toggleSlaPolicyStatus = async (policyId, isActive) => {
  const policy = await SlaPolicy.findById(policyId);
  if (!policy) {
    const error = new Error('SLA policy not found.');
    error.statusCode = 404;
    throw error;
  }

  if (isActive) {
    const existingActive = await SlaPolicy.findOne({
      _id: { $ne: policyId },
      priority: policy.priority,
      isActive: true,
    });
    if (existingActive) {
      const error = new Error(
        `An active SLA policy for priority "${policy.priority}" already exists: "${existingActive.name}".`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  policy.isActive = isActive;
  await policy.save();

  return {
    id: policy._id.toString(),
    _id: policy._id.toString(),
    name: policy.name,
    policyName: policy.name,
    priority: policy.priority,
    isActive: policy.isActive,
    status: policy.isActive ? 'Active' : 'Inactive',
    updatedAt: policy.updatedAt,
  };
};

export default {
  getSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  toggleSlaPolicyStatus,
};
