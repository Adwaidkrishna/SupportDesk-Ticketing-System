import usersServices, {
  getUsers,
  updateUserStatus,
  updateUserDetails,
} from './users/index.js';

import agentsServices, {
  getAgents,
  updateAgentStatus,
  updateAgentDetails,
} from './agents/index.js';

import categoriesServices, {
  getCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
} from './categories/index.js';

import ticketsServices, {
  getTickets,
  getTicketDetails,
  assignTicketAgent,
  updateTicketStatus,
  updateTicketPriority,
  getTicketMessages,
  sendAdminReply,
} from './tickets/index.js';

import slaServices, {
  getSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  toggleSlaPolicyStatus,
} from './sla/index.js';

import reportsServices, {
  getReports,
} from './reports/getReports.service.js';

import settingsServices, {
  getSettings,
  updateSettings,
} from './settings/settings.service.js';

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
  // Reports
  getReports,
  // Settings
  getSettings,
  updateSettings,
};

export default {
  ...usersServices,
  ...agentsServices,
  ...categoriesServices,
  ...ticketsServices,
  ...slaServices,
  ...reportsServices,
  ...settingsServices,
};
