import adminService from '../../../services/admin/index.js';

/**
 * Controller to handle POST /api/v1/admin/sla/policies
 */
export const createSlaPolicy = async (req, res, next) => {
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

export default createSlaPolicy;
