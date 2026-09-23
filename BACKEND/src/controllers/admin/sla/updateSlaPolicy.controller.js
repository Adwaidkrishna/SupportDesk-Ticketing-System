import adminService from '../../../services/admin/index.js';

/**
 * Controller to handle PATCH /api/v1/admin/sla/policies/:policyId
 */
export const updateSlaPolicy = async (req, res, next) => {
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

export default updateSlaPolicy;
