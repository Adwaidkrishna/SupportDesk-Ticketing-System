import Ticket from '../../models/Ticket.js';

/**
 * Service to retrieve single ticket details for an authorized agent.
 * Populates customer, category, and assignedTo agent without exposing sensitive fields.
 *
 * @param {string} ticketId - Ticket MongoDB ObjectId
 * @returns {Promise<Object>} Formatted ticket details
 */
export const getAgentTicketDetails = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId)
    .populate('customerId', 'name email')
    .populate('categoryId', 'name description')
    .populate('assignedTo', 'name email')
    .lean();

  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  const customer = ticket.customerId
    ? {
        id: ticket.customerId._id.toString(),
        _id: ticket.customerId._id.toString(),
        name: ticket.customerId.name,
        email: ticket.customerId.email,
      }
    : null;

  const category = ticket.categoryId
    ? {
        id: ticket.categoryId._id.toString(),
        _id: ticket.categoryId._id.toString(),
        name: ticket.categoryId.name,
        description: ticket.categoryId.description,
      }
    : null;

  const assignedTo = ticket.assignedTo
    ? {
        id: ticket.assignedTo._id.toString(),
        _id: ticket.assignedTo._id.toString(),
        name: ticket.assignedTo.name,
        email: ticket.assignedTo.email,
      }
    : null;

  const ticketData = {
    id: ticket._id.toString(),
    _id: ticket._id.toString(),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    customer,
    customerId: customer ? customer.id : null,
    category,
    categoryId: category ? category.id : null,
    assignedTo,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };

  return {
    ...ticketData,
    ticket: ticketData,
  };
};

export default getAgentTicketDetails;
