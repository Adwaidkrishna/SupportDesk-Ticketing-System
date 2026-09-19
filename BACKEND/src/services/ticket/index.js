import { createTicket, generateTicketNumber } from './createTicket.service.js';
import { getMyTickets } from './getMyTickets.service.js';
import { getTicketByIdForCustomer } from './getTicketDetails.service.js';
import { getTicketMessages } from './getTicketMessages.service.js';
import { getAgentQueue } from './getAgentQueue.service.js';
import { getAgentTicketDetails } from './getAgentTicketDetails.service.js';
import { claimTicket } from './claimTicket.service.js';
import { sendCustomerMessage } from './sendCustomerMessage.service.js';
import { sendAgentMessage } from './sendAgentMessage.service.js';
import { getAgentTicketMessages } from './getAgentTicketMessages.service.js';

export {
  createTicket,
  generateTicketNumber,
  getMyTickets,
  getTicketByIdForCustomer,
  getTicketMessages,
  getAgentQueue,
  getAgentTicketDetails,
  claimTicket,
  sendCustomerMessage,
  sendAgentMessage,
  getAgentTicketMessages,
};

export default {
  createTicket,
  generateTicketNumber,
  getMyTickets,
  getTicketByIdForCustomer,
  getTicketMessages,
  getAgentQueue,
  getAgentTicketDetails,
  claimTicket,
  sendCustomerMessage,
  sendAgentMessage,
  getAgentTicketMessages,
};




