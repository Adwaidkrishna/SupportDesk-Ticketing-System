import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/category.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import agentRoutes from './routes/agent.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';


const app = express();

// ─── Security Headers (H-05 FIX) ─────────────────────────────────────────────
// Helmet sets: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security,
// X-XSS-Protection, Referrer-Policy, and more.
app.use(helmet());

// ─── CORS (H-04 FIX) ─────────────────────────────────────────────────────────
// Explicit allowlist from environment — NOT 'origin: true' (reflects any origin).
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., server-to-server, Postman, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Return 403 — do not reflect origin or expose details
      const corsErr = new Error('CORS policy: request origin not permitted.');
      corsErr.statusCode = 403;
      return callback(corsErr, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

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


// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} — Route not found.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
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
