import adminService from '../../services/admin/index.js';

/**
 * Controller to handle PATCH /api/v1/admin/agents/:agentId
 */
export const updateAgentDetails = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const updateData = req.validatedBody;

    const agent = await adminService.updateAgentDetails(agentId, updateData);

    res.status(200).json({
      success: true,
      message: 'Agent details successfully updated.',
      data: { agent },
    });
  } catch (error) {
    next(error);
  }
};

export default updateAgentDetails;
