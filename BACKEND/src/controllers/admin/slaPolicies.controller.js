import adminService from '../../services/admin/index.js';

/**
 * Controller to handle GET /api/v1/admin/sla/policies
 */
export const getPolicies = async (req, res, next) => {
  try {
    const result = await adminService.getSlaPolicies();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle POST /api/v1/admin/sla/policies
 */
export const createPolicy = async (req, res, next) => {
  try {
    const policy = await adminService.createSlaPolicy(req.validatedBody);
    res.status(201).json({
      success: true,
      message: `SLA policy "${policy.name}" created successfully.`,
      data: { policy },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle PATCH /api/v1/admin/sla/policies/:policyId
 */
export const updatePolicy = async (req, res, next) => {
  try {
    const { policyId } = req.params;
    const policy = await adminService.updateSlaPolicy(policyId, req.validatedBody);
    res.status(200).json({
      success: true,
      message: `SLA policy "${policy.name}" updated successfully.`,
      data: { policy },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle PATCH /api/v1/admin/sla/policies/:policyId/status
 */
export const togglePolicyStatus = async (req, res, next) => {
  try {
    const { policyId } = req.params;
    const { isActive } = req.validatedBody;
    const policy = await adminService.toggleSlaPolicyStatus(policyId, isActive);
    res.status(200).json({
      success: true,
      message: `SLA policy "${policy.name}" status updated to ${policy.status}.`,
      data: { policy },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPolicies,
  createPolicy,
  updatePolicy,
  togglePolicyStatus,
};
