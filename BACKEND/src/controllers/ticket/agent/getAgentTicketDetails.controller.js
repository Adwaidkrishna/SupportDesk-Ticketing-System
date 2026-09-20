import ticketService from '../../../services/ticket/index.js';

/**
 * Controller to retrieve single ticket details for an agent.
 */
const getAgentTicketDetails = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const result = await ticketService.getAgentTicketDetails(ticketId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getAgentTicketDetails;
