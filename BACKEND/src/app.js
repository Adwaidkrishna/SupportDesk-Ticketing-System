import express from 'express';
import cors from 'cors';
import { expressCorsOptions } from './config/cors.js';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/category.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import agentRoutes from './routes/agent.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// ─── Security Headers (H-05 FIX) ─────────────────────────────────────────────
// Helmet sets: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security,
// X-XSS-Protection, Referrer-Policy, and more.
app.use(helmet());

// ─── CORS (L-02 FIX) ─────────────────────────────────────────────────────────
// Shared allowlist from environment via config/cors.js (aligns Express & Socket.IO)
app.use(cors(expressCorsOptions));

// ─── Body Parsing (L-01 FIX) ─────────────────────────────────────────────────
// Explicit 50kb limit — auth payloads are small; no reason to accept large bodies.
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'SupportDesk Backend API',
    timestamp: new Date().toISOString(),
  });
});

// ─── API v1 Routes ────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/agent', agentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/knowledge-base', knowledgeRoutes);
app.use('/api/v1/admin', adminRoutes);


// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} — Route not found.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;

  // M-03 FIX: Stack traces ONLY in development mode
  const isProduction = process.env.NODE_ENV === 'production';

  // Safe log — no sensitive data
  console.error(`[API Error ${statusCode}] ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode === 500
      ? 'An internal server error occurred.'
      : err.message || 'Internal Server Error',
    ...(err.requiresOtp && { requiresOtp: true }),
    // Stack trace only in development — never in production
    ...(!isProduction && { stack: err.stack }),
  });
});

export default app;
