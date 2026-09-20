// Customer controllers
import createTicket from './customer/createTicket.controller.js';
import getMyTickets from './customer/getMyTickets.controller.js';
import getTicketDetails from './customer/getTicketDetails.controller.js';
import getTicketMessages from './customer/getTicketMessages.controller.js';
import sendCustomerMessage from './customer/sendCustomerMessage.controller.js';
import reopenTicket from './customer/reopenTicket.controller.js';

// Agent controllers
import getAgentQueue from './agent/getAgentQueue.controller.js';
import getAgentTicketDetails from './agent/getAgentTicketDetails.controller.js';
import claimTicket from './agent/claimTicket.controller.js';
import sendAgentMessage from './agent/sendAgentMessage.controller.js';
import getAgentTicketMessages from './agent/getAgentTicketMessages.controller.js';
import getAgentAssignedTickets from './agent/getAgentAssignedTickets.controller.js';
import updateAgentTicketStatus from './agent/updateAgentTicketStatus.controller.js';

export {
  createTicket,
  getMyTickets,
  getTicketDetails,
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
  getMyTickets,
  getTicketDetails,
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
