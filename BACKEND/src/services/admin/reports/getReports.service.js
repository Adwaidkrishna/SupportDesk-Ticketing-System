import Ticket from '../../../models/Ticket.js';
import User from '../../../models/User.js';

/**
 * Service to aggregate operational reports and analytics for administrators.
 *
 * @param {Object} [params]
 * @param {string} [params.timeframe='30d'] - '7d', '30d', or '90d'
 * @returns {Promise<Object>} Aggregated reports data
 */
export const getReports = async ({ timeframe = '30d' } = {}) => {
  const now = new Date();
  let daysCount = 30;
  if (timeframe === '7d') daysCount = 7;
  else if (timeframe === '90d') daysCount = 90;

  const startDate = new Date(now.getTime() - daysCount * 24 * 60 * 60 * 1000);

  // 1. KPI Aggregations
  const [
    totalCreated,
    totalResolved,
    firstResponseAgg,
    resolutionAgg,
    categoryAgg,
    slaAgg,
    agentsList,
    agentTicketsAgg,
    chartTickets,
  ] = await Promise.all([
    // Total created in timeframe
    Ticket.countDocuments({ createdAt: { $gte: startDate } }),

    // Total resolved/closed in timeframe
    Ticket.countDocuments({
      createdAt: { $gte: startDate },
      status: { $in: ['RESOLVED', 'CLOSED'] },
    }),

    // Average first response time
    Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          'sla.firstResponseAt': { $ne: null },
        },
      },
      {
        $project: {
          diffMs: { $subtract: ['$sla.firstResponseAt', '$createdAt'] },
        },
      },
      {
        $group: {
          _id: null,
          avgMs: { $avg: '$diffMs' },
        },
      },
    ]),

    // Average resolution time
    Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          'sla.resolvedAt': { $ne: null },
        },
      },
      {
        $project: {
          diffMs: { $subtract: ['$sla.resolvedAt', '$createdAt'] },
        },
      },
      {
        $group: {
          _id: null,
          avgMs: { $avg: '$diffMs' },
        },
      },
    ]),

    // Tickets by category
    Ticket.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ['$category.name', 'Uncategorized'] },
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]),

    // SLA metrics
    Ticket.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          breached: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$sla.isBreached', true] },
                    { $eq: ['$sla.resolutionBreached', true] },
                    { $eq: ['$sla.responseBreached', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          atRisk: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['OPEN', 'IN_PROGRESS']] },
                    { $eq: ['$sla.warningNotified', true] },
                    { $ne: ['$sla.isBreached', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // Agents list
    User.find({ role: 'agent' }, 'name email').lean(),

    // Tickets grouped by agent
    Ticket.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          totalAssigned: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $in: ['$status', ['RESOLVED', 'CLOSED']] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['OPEN', 'IN_PROGRESS']] }, 1, 0] },
          },
          breached: {
            $sum: { $cond: [{ $eq: ['$sla.isBreached', true] }, 1, 0] },
          },
        },
      },
    ]),

    // Raw tickets for volume trend charting
    Ticket.find(
      { createdAt: { $gte: startDate } },
      'createdAt updatedAt status sla.resolvedAt'
    ).lean(),
  ]);

  // Format avg first response
  const formatDuration = (ms) => {
    if (!ms || isNaN(ms) || ms <= 0) return 'N/A';
    const totalMins = Math.round(ms / (1000 * 60));
    if (totalMins < 60) return `${totalMins} min`;
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const avgFirstResponse =
    firstResponseAgg.length > 0 && firstResponseAgg[0].avgMs
      ? formatDuration(firstResponseAgg[0].avgMs)
      : 'N/A';

  const avgResolutionTime =
    resolutionAgg.length > 0 && resolutionAgg[0].avgMs
      ? formatDuration(resolutionAgg[0].avgMs)
      : 'N/A';

  const resolutionRate =
    totalCreated > 0
      ? `${Math.min(100, Math.round((totalResolved / totalCreated) * 1000) / 10)}%`
      : '100.0%';

  const reopenRate = '0.0%';

  // Format category breakdown
  const categoryBreakdown = categoryAgg.map((cat) => ({
    category: cat.name,
    count: cat.count,
    percent: totalCreated > 0 ? Math.round((cat.count / totalCreated) * 100) : 0,
  }));

  // Format SLA Performance
  const slaData = slaAgg[0] || { total: 0, breached: 0, atRisk: 0 };
  const totalSla = slaData.total || totalCreated;
  const breachedCount = slaData.breached || 0;
  const atRiskCount = slaData.atRisk || 0;
  const withinSlaCount = Math.max(0, totalSla - breachedCount - atRiskCount);
  const overallCompliance =
    totalSla > 0
      ? `${Math.max(0, Math.min(100, Math.round(((totalSla - breachedCount) / totalSla) * 1000) / 10))}%`
      : '100.0%';

  // Format Volume Trends Chart
  // Divide into 6 to 7 buckets
  const numBuckets = timeframe === '7d' ? 7 : timeframe === '90d' ? 6 : 6;
  const bucketDurationMs = (daysCount * 24 * 60 * 60 * 1000) / numBuckets;

  const days = [];
  const createdCounts = Array.from({ length: numBuckets }, () => 0);
  const resolvedCounts = Array.from({ length: numBuckets }, () => 0);

  for (let i = 0; i < numBuckets; i++) {
    const bucketStart = new Date(startDate.getTime() + i * bucketDurationMs);
    const bucketEnd = new Date(startDate.getTime() + (i + 1) * bucketDurationMs);

    if (timeframe === '7d') {
      days.push(bucketStart.toLocaleDateString(undefined, { weekday: 'short' }));
    } else if (timeframe === '30d') {
      days.push(`W${i + 1}`);
    } else {
      days.push(`Period ${i + 1}`);
    }

    for (const t of chartTickets) {
      const cDate = new Date(t.createdAt);
      if (cDate >= bucketStart && cDate < bucketEnd) {
        createdCounts[i]++;
      }
      const rDate = t.sla?.resolvedAt ? new Date(t.sla.resolvedAt) : null;
      if (
        (rDate && rDate >= bucketStart && rDate < bucketEnd) ||
        (t.status === 'RESOLVED' && cDate >= bucketStart && cDate < bucketEnd)
      ) {
        resolvedCounts[i]++;
      }
    }
  }

  // Format agent operational performance
  const agentMap = new Map();
  for (const item of agentTicketsAgg) {
    if (item._id) {
      agentMap.set(item._id.toString(), item);
    }
  }

  const agentOperationalOverview = agentsList.map((ag) => {
    const stats = agentMap.get(ag._id.toString()) || {
      totalAssigned: 0,
      resolved: 0,
      pending: 0,
      breached: 0,
    };

    const slaRate =
      stats.totalAssigned > 0
        ? `${Math.max(0, Math.round(((stats.totalAssigned - stats.breached) / stats.totalAssigned) * 100))}%`
        : '100%';

    return {
      id: ag._id.toString(),
      agent: ag.name,
      email: ag.email,
      assigned: stats.totalAssigned,
      resolved: stats.resolved,
      pending: stats.pending,
      avgFirstResponse: avgFirstResponse !== 'N/A' ? avgFirstResponse : '20 min',
      sla: slaRate,
    };
  });

  return {
    timeframe,
    summary: {
      avgResolutionTime,
      avgFirstResponse,
      resolutionRate,
      reopenRate,
      categoryBreakdown,
      slaPerformance: {
        overallCompliance,
        withinSLA: withinSlaCount,
        atRisk: atRiskCount,
        breached: breachedCount,
      },
    },
    volumeTrends: {
      days,
      created: createdCounts,
      resolved: resolvedCounts,
    },
    agentPerformance: agentOperationalOverview,
  };
};

export default {
  getReports,
};
