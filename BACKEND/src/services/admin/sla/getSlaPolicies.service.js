import SlaPolicy from '../../../models/SlaPolicy.js';
import Ticket from '../../../models/Ticket.js';
import { evaluateTicketSla, seedDefaultPolicies } from '../../sla/sla.service.js';

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

export default getSlaPolicies;
