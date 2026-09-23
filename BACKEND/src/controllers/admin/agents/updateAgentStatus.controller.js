import adminService from '../../../services/admin/index.js';

/**
 * Controller to handle PATCH /api/v1/admin/agents/:agentId/status
 */
export const updateAgentStatus = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { status } = req.validatedBody;

    const agent = await adminService.updateAgentStatus(agentId, status);

    res.status(200).json({
      success: true,
      message: `Agent availability status successfully updated to ${status}.`,
      data: { agent },
    });
  } catch (error) {
    next(error);
  }
};

export default updateAgentStatus;
