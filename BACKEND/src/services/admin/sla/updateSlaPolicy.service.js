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

export default updateSlaPolicy;
