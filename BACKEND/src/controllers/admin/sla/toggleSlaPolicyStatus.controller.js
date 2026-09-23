import adminService from '../../../services/admin/index.js';

/**
 * Controller to handle PATCH /api/v1/admin/sla/policies/:policyId/status
 */
export const toggleSlaPolicyStatus = async (req, res, next) => {
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

export default toggleSlaPolicyStatus;
