import mongoose from 'mongoose';
import Ticket from '../../models/Ticket.js';

/**
 * Service to retrieve full ticket details for admin inspection.
 * Supports lookup by MongoDB ObjectId or ticketNumber.
 *
 * @param {string} ticketId - ObjectId string or ticket number (e.g. "1001")
 * @returns {Promise<Object>} Formatted ticket details with customer stats & related tickets
 */
export const getTicketDetails = async (ticketId) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(ticketId);
  const lookupQuery = isObjectId
    ? { $or: [{ _id: ticketId }, { ticketNumber: ticketId }] }
    : { ticketNumber: ticketId };

  const ticket = await Ticket.findOne(lookupQuery)
    .populate('customerId', 'name email avatar department phone company createdAt')
    .populate('assignedTo', 'name email department availability role')
    .populate('categoryId', 'name description')
    .lean();

  if (!ticket) {
    const error = new Error('Ticket not found.');
    error.statusCode = 404;
    throw error;
  }

  // Calculate customer statistics and retrieve other customer tickets
  let customerStats = {
    totalTickets: 0,
    openTickets: 0,
  };
  let relatedTickets = [];

  if (ticket.customerId) {
    const customerId = ticket.customerId._id;

    const [totalTickets, openTickets, rawRelated] = await Promise.all([
      Ticket.countDocuments({ customerId }),
      Ticket.countDocuments({ customerId, status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
      Ticket.find({ customerId, _id: { $ne: ticket._id } })
        .select('ticketNumber subject status priority createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    customerStats = {
      totalTickets,
      openTickets,
    };

    relatedTickets = rawRelated.map((r) => ({
      id: r._id.toString(),
      ticketNumber: r.ticketNumber,
      subject: r.subject,
      status: r.status,
      priority: r.priority,
      createdAt: r.createdAt,
    }));
  }

  return {
    ticket: {
      id: ticket._id.toString(),
      _id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      customer: ticket.customerId
        ? {
            id: ticket.customerId._id.toString(),
            _id: ticket.customerId._id.toString(),
            name: ticket.customerId.name,
            email: ticket.customerId.email,
            phone: ticket.customerId.phone,
            company: ticket.customerId.company || 'N/A',
            joinedDate: ticket.customerId.createdAt,
            totalTickets: customerStats.totalTickets,
            openTickets: customerStats.openTickets,
          }
        : null,
      category: ticket.categoryId
        ? {
            id: ticket.categoryId._id.toString(),
            _id: ticket.categoryId._id.toString(),
            name: ticket.categoryId.name,
            description: ticket.categoryId.description,
          }
        : null,
      assignedTo: ticket.assignedTo
        ? {
            id: ticket.assignedTo._id.toString(),
            _id: ticket.assignedTo._id.toString(),
            name: ticket.assignedTo.name,
            email: ticket.assignedTo.email,
            department: ticket.assignedTo.department,
            availability: ticket.assignedTo.availability,
            role: ticket.assignedTo.role,
          }
        : null,
      relatedTickets,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    },
  };
};

export default getTicketDetails;
