import express from 'express';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';

import adminUsersRoutes from './adminUsers.routes.js';
import adminAgentsRoutes from './adminAgents.routes.js';
import adminCategoriesRoutes from './adminCategories.routes.js';
import adminTicketsRoutes from './adminTickets.routes.js';
import adminSlaRoutes from './adminSla.routes.js';

const router = express.Router();

// Enforce authentication and admin role on all /api/v1/admin routes
router.use(authenticateUser);
router.use(authorizeRoles('admin'));

// Mount sub-routers
router.use('/users', adminUsersRoutes);
router.use('/agents', adminAgentsRoutes);
router.use('/categories', adminCategoriesRoutes);
router.use('/tickets', adminTicketsRoutes);
router.use('/sla', adminSlaRoutes);

export default router;
