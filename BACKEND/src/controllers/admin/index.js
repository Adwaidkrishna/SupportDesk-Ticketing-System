import usersControllers, {
  getUsers,
  updateUserStatus,
  updateUserDetails,
} from './users/index.js';

import agentsControllers, {
  getAgents,
  updateAgentStatus,
  updateAgentDetails,
} from './agents/index.js';

import categoriesControllers, {
  getCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
} from './categories/index.js';

import ticketsControllers, {
  getTickets,
  getTicketDetails,
  assignTicketAgent,
  updateTicketStatus,
  updateTicketPriority,
  getTicketMessages,
  sendAdminReply,
} from './tickets/index.js';

import slaControllers, {
  getSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  toggleSlaPolicyStatus,
} from './sla/index.js';

export {
  // Users
  getUsers,
  updateUserStatus,
  updateUserDetails,
  // Agents
  getAgents,
  updateAgentStatus,
  updateAgentDetails,
  // Categories
  getCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  // Tickets
  getTickets,
  getTicketDetails,
  assignTicketAgent,
  updateTicketStatus,
  updateTicketPriority,
  getTicketMessages,
  sendAdminReply,
  // SLA
  getSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  toggleSlaPolicyStatus,
};

export default {
  ...usersControllers,
  ...agentsControllers,
  ...categoriesControllers,
  ...ticketsControllers,
  ...slaControllers,
};
