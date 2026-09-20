import ticketService from '../../../services/ticket/index.js';

/**
  * Controller to retrieve available unassigned OPEN tickets for the Agent Queue.
  */
const getAgentQueue = async (req, res, next) => {
  try {
    const { page, limit } = req.validatedQuery || {};

    const result = await ticketService.getAgentQueue({
      page: page || 1,
      limit: limit || 10,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getAgentQueue;
