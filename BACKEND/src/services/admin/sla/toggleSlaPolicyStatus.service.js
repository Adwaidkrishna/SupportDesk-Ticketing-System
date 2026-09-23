import SlaPolicy from '../../../models/SlaPolicy.js';

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

export default toggleSlaPolicyStatus;
