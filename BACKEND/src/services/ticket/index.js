import { createTicket, generateTicketNumber } from './customer/createTicket.service.js';
import { getMyTickets } from './customer/getMyTickets.service.js';
import { getTicketByIdForCustomer } from './customer/getTicketDetails.service.js';
import { getTicketMessages } from './customer/getTicketMessages.service.js';
import { sendCustomerMessage } from './customer/sendCustomerMessage.service.js';

import { getAgentQueue } from './agent/getAgentQueue.service.js';
import { getAgentTicketDetails } from './agent/getAgentTicketDetails.service.js';
import { claimTicket } from './agent/claimTicket.service.js';
import { sendAgentMessage } from './agent/sendAgentMessage.service.js';
import { getAgentTicketMessages } from './agent/getAgentTicketMessages.service.js';
import { getAgentAssignedTickets } from './agent/getAgentAssignedTickets.service.js';
import { updateAgentTicketStatus } from './agent/updateAgentTicketStatus.service.js';

import { reopenTicket } from './shared/reopenTicket.service.js';

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
  getAgentAssignedTickets,
  updateAgentTicketStatus,
  reopenTicket,
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
  getAgentAssignedTickets,
  updateAgentTicketStatus,
  reopenTicket,
};
