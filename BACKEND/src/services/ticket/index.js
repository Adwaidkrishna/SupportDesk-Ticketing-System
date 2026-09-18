import { createTicket, generateTicketNumber } from './createTicket.service.js';
import { getMyTickets } from './getMyTickets.service.js';
import { getTicketByIdForCustomer } from './getTicketDetails.service.js';

export {
  createTicket,
  generateTicketNumber,
  getMyTickets,
  getTicketByIdForCustomer,
};

export default {
  createTicket,
  generateTicketNumber,
  getMyTickets,
  getTicketByIdForCustomer,
};
