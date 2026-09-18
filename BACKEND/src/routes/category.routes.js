import express from 'express';
import { getCategories } from '../controllers/category.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/v1/categories - Authenticated users can list categories
router.get('/', authenticateUser, getCategories);

export default router;
