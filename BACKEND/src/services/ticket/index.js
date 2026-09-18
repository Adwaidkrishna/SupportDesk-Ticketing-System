import { createTicket, generateTicketNumber } from './createTicket.service.js';
import { getMyTickets } from './getMyTickets.service.js';
import { getTicketByIdForCustomer } from './getTicketDetails.service.js';
import { getTicketMessages } from './getTicketMessages.service.js';
import { getAgentQueue } from './getAgentQueue.service.js';

export {
  createTicket,
  generateTicketNumber,
  getMyTickets,
  getTicketByIdForCustomer,
  getTicketMessages,
  getAgentQueue,
};

export default {
  createTicket,
  generateTicketNumber,
  getMyTickets,
  getTicketByIdForCustomer,
  getTicketMessages,
  getAgentQueue,
};

