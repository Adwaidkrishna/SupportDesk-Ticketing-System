import getUsers from './getUsers.controller.js';
import updateUserStatus from './updateUserStatus.controller.js';
import updateUserDetails from './updateUserDetails.controller.js';
import getAgents from './getAgents.controller.js';
import updateAgentStatus from './updateAgentStatus.controller.js';
import updateAgentDetails from './updateAgentDetails.controller.js';
import getCategories from './getCategories.controller.js';
import createCategory from './createCategory.controller.js';
import updateCategory from './updateCategory.controller.js';
import updateCategoryStatus from './updateCategoryStatus.controller.js';
import getTickets from './getTickets.controller.js';
import getTicketDetails from './getTicketDetails.controller.js';
import assignTicketAgent from './assignTicketAgent.controller.js';
import updateTicketStatus from './updateTicketStatus.controller.js';
import updateTicketPriority from './updateTicketPriority.controller.js';
import getTicketMessages from './getTicketMessages.controller.js';
import sendAdminReply from './sendAdminReply.controller.js';
import {
  getPolicies as getSlaPolicies,
  createPolicy as createSlaPolicy,
  updatePolicy as updateSlaPolicy,
  togglePolicyStatus as toggleSlaPolicyStatus,
} from './slaPolicies.controller.js';

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
