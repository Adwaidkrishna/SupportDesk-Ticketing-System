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

import { getReports } from './reports/getReports.controller.js';
import { getSettings, updateSettings } from './settings/settings.controller.js';

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
  ...usersControllers,
  ...agentsControllers,
  ...categoriesControllers,
  ...ticketsControllers,
  ...slaControllers,
  getReports,
  getSettings,
  updateSettings,
};
