import express from 'express';
import dashboardController from '../controllers/dashboard/index.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';

const router = express.Router();

// Enforce authentication across all dashboard routes
router.use(authenticateUser);

// GET /api/v1/dashboard/customer - Customer Dashboard (Isolated to customer's own tickets)
router.get('/customer', authorizeRoles('customer'), dashboardController.getCustomerDashboard);

// GET /api/v1/dashboard/agent - Agent Dashboard (Available queue + agent's assigned workload)
router.get('/agent', authorizeRoles('agent'), dashboardController.getAgentDashboard);

// GET /api/v1/dashboard/admin - Admin Dashboard (System-wide metrics & agent workload)
router.get('/admin', authorizeRoles('admin'), dashboardController.getAdminDashboard);

export default router;
