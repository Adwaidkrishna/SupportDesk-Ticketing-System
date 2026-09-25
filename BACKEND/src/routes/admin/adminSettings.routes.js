import express from 'express';
import { getSettings, updateSettings } from '../../controllers/admin/settings/settings.controller.js';
import { validateUpdateSettings } from '../../validators/adminSettings.validator.js';

const router = express.Router();

// GET /api/v1/admin/settings - Retrieve current system settings
router.get('/', getSettings);

// PATCH /api/v1/admin/settings - Update system settings
router.patch('/', validateUpdateSettings, updateSettings);

export default router;
