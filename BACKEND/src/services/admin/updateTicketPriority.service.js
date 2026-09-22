import mongoose from 'mongoose';
import Ticket from '../../models/Ticket.js';

/**
 * Service for Admin to update ticket priority.
 *
 * @param {string} ticketId - ObjectId string or ticket number
 * @param {'LOW'|'MEDIUM'|'HIGH'|'URGENT'} priority - New priority level
 * @returns {Promise<Object>} Updated ticket object
 */
export const updateTicketPriority = async (ticketId, priority) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(ticketId);
  const lookupQuery = isObjectId
    ? { $or: [{ _id: ticketId }, { ticketNumber: ticketId }] }
    : { ticketNumber: ticketId };

  const ticket = await Ticket.findOne(lookupQuery);

  if (!ticket) {
    const error = new Error('Ticket not found.');
    error.statusCode = 404;
    throw error;
  }

  ticket.priority = priority;
  await ticket.save();

  await ticket.populate('customerId', 'name email avatar department phone');
  await ticket.populate('assignedTo', 'name email department availability role');
  await ticket.populate('categoryId', 'name description');

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
            name: ticket.customerId.name,
            email: ticket.customerId.email,
          }
        : null,
      category: ticket.categoryId
        ? {
            id: ticket.categoryId._id.toString(),
            name: ticket.categoryId.name,
          }
        : null,
      assignedTo: ticket.assignedTo
        ? {
            id: ticket.assignedTo._id.toString(),
            name: ticket.assignedTo.name,
            email: ticket.assignedTo.email,
            department: ticket.assignedTo.department,
          }
        : null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    },
  };
};

export default updateTicketPriority;
