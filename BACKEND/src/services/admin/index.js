import getUsers from './getUsers.service.js';
import updateUserStatus from './updateUserStatus.service.js';
import updateUserDetails from './updateUserDetails.service.js';
import getAgents from './getAgents.service.js';
import updateAgentStatus from './updateAgentStatus.service.js';
import updateAgentDetails from './updateAgentDetails.service.js';
import getCategories from './getCategories.service.js';
import createCategory from './createCategory.service.js';
import updateCategory from './updateCategory.service.js';
import updateCategoryStatus from './updateCategoryStatus.service.js';
import getTickets from './getTickets.service.js';
import getTicketDetails from './getTicketDetails.service.js';
import assignTicketAgent from './assignTicketAgent.service.js';
import updateTicketStatus from './updateTicketStatus.service.js';
import updateTicketPriority from './updateTicketPriority.service.js';
import getTicketMessages from './getTicketMessages.service.js';
import sendAdminReply from './sendAdminReply.service.js';
import {
  getSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  toggleSlaPolicyStatus,
} from './slaPolicies.service.js';

export {
  getUsers,
  updateUserStatus,
  updateUserDetails,
  getAgents,
  updateAgentStatus,
  updateAgentDetails,
  getCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  getTickets,
  getTicketDetails,
  assignTicketAgent,
  updateTicketStatus,
  updateTicketPriority,
  getTicketMessages,
  sendAdminReply,
  getSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  toggleSlaPolicyStatus,
};

export default {
  getUsers,
  updateUserStatus,
  updateUserDetails,
  getAgents,
  updateAgentStatus,
  updateAgentDetails,
  getCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  getTickets,
  getTicketDetails,
  assignTicketAgent,
  updateTicketStatus,
  updateTicketPriority,
  getTicketMessages,
  sendAdminReply,
  getSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  toggleSlaPolicyStatus,
};
