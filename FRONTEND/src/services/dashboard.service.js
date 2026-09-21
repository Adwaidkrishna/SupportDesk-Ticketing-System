import api from './api';

/**
 * Dashboard API Service.
 * Interfaces with backend endpoints at /api/v1/dashboard/*
 */

/**
 * Retrieve authenticated customer dashboard statistics and recent records.
 * @returns {Promise<{ success: boolean, data: { stats: Object, recentTickets: Array, notifications: Object } }>}
 */
export async function getCustomerDashboard() {
  return api.get('/dashboard/customer');
}

/**
 * Retrieve authenticated agent dashboard workload, queue metrics, and recent tickets.
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function getAgentDashboard() {
  return api.get('/dashboard/agent');
}

/**
 * Retrieve system-wide administrator dashboard statistics and agent workload.
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function getAdminDashboard() {
  return api.get('/dashboard/admin');
}

export default {
  getCustomerDashboard,
  getAgentDashboard,
  getAdminDashboard,
};
