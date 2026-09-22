import adminService from '../../services/admin/index.js';

/**
 * Controller to handle PATCH /api/v1/admin/tickets/:ticketId/assign
 */
export const assignTicketAgent = async (req, res, next) => {
  try {
    const ticketId = req.sanitizedTicketId || req.params.ticketId;
    const agentId = req.sanitizedAgentId !== undefined ? req.sanitizedAgentId : req.body.agentId;
    const adminId = req.user.userId;

    const result = await adminService.assignTicketAgent(ticketId, agentId, adminId);

    res.status(200).json({
      success: true,
      message: agentId ? 'Ticket assigned successfully.' : 'Ticket unassigned successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default assignTicketAgent;
