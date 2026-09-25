/**
 * Shared CORS Configuration Module (L-02)
 *
 * Provides a single source of truth for both Express HTTP CORS and Socket.IO CORS.
 * Ensures consistent origin policies, credential handling, and environment-driven configuration.
 */

/**
 * Parse and return the normalized array of allowed origins from environment configuration.
 * Trims whitespace, eliminates empty elements, and excludes unsafe wildcard '*' when credentials are used.
 *
 * @returns {string[]} Normalized list of allowed origins
 */
export const getAllowedOrigins = () => {
  const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173';
  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== '*');
};

/**
 * Determine if a specific request origin is permitted by the CORS policy.
 * Requests without an Origin header (e.g. mobile apps, curl, server-to-server) are permitted.
 *
 * @param {string|undefined} origin - Incoming Origin header value
 * @returns {boolean}
 */
export const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
};

/**
 * Shared CORS origin delegate for both Express and Socket.IO.
 * Invokes callback with an error (status 403) if the origin is not allowed.
 *
 * @param {string|undefined} origin - Request origin
 * @param {Function} callback - Callback(err, allow)
 */
export const corsOriginDelegate = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }
  const corsErr = new Error('CORS policy: request origin not permitted.');
  corsErr.statusCode = 403;
  return callback(corsErr, false);
};

/**
 * Shared CORS options for Express REST API
 */
export const expressCorsOptions = {
  origin: corsOriginDelegate,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

/**
 * Shared CORS options for Socket.IO Server
 */
export const socketCorsOptions = {
  origin: corsOriginDelegate,
  credentials: true,
  methods: ['GET', 'POST'],
};

export default {
  getAllowedOrigins,
  isOriginAllowed,
  corsOriginDelegate,
  expressCorsOptions,
  socketCorsOptions,
};
