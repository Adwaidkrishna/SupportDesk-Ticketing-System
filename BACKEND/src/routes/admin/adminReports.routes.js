import express from 'express';
import { getReports } from '../../controllers/admin/reports/getReports.controller.js';

const router = express.Router();

// GET /api/v1/admin/reports - Operational analytics and performance reports
router.get('/', getReports);

export default router;
