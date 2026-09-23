import SlaPolicy from '../../../models/SlaPolicy.js';

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

export default createSlaPolicy;
