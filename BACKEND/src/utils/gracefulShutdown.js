import mongoose from 'mongoose';
import { stopSlaMonitor } from '../jobs/slaMonitor.job.js';
import { closeSocket } from '../socket/socket.js';
import { disconnectDB } from '../config/db.js';

let isShuttingDown = false;

/**
 * Perform a clean, orderly graceful shutdown of all backend resources.
 *
 * Logical sequence:
 * 1. Check idempotency guard (ignore duplicate signals)
 * 2. Set failsafe timeout to prevent hanging indefinitely
 * 3. Stop background jobs / timers (SLA monitor)
 * 4. Close Socket.IO server connections
 * 5. Close HTTP server (stop accepting new connections, wait for active requests)
 * 6. Disconnect from MongoDB
 * 7. Exit process with appropriate exit code (0 for success, 1 on error)
 *
 * @param {Object} [options={}]
 * @param {string} [options.signal='SIGTERM'] - Operating system signal
 * @param {import('http').Server} [options.httpServer] - Node.js HTTP server instance
 * @param {Object} [options.io] - Socket.IO instance
 * @param {Function} [options.stopSlaMonitorFn] - SLA monitor cleanup function
 * @param {Function} [options.closeSocketFn] - Socket.IO cleanup function
 * @param {Function} [options.disconnectDbFn] - Database disconnect function
 * @param {number} [options.timeoutMs=10000] - Failsafe timeout in milliseconds
 * @param {boolean} [options.exitProcess=true] - Whether to invoke process.exit()
 * @returns {Promise<{ success: boolean, signal: string, exitCode: number }>}
 */
export const gracefulShutdown = async ({
  signal = 'SIGTERM',
  httpServer = null,
  io = null,
  stopSlaMonitorFn = stopSlaMonitor,
  closeSocketFn = closeSocket,
  disconnectDbFn = disconnectDB,
  timeoutMs = 10000,
  exitProcess = true,
} = {}) => {
  if (isShuttingDown) {
    console.warn(`⚠️ [Shutdown] Shutdown already in progress. Ignoring duplicate signal: ${signal}`);
    return { success: true, signal, alreadyShuttingDown: true, exitCode: 0 };
  }

  isShuttingDown = true;
  let hasErrors = false;

  console.log(`\n🛑 [Shutdown] Received ${signal}. Starting graceful shutdown...`);

  // Failsafe timeout timer to guarantee the process exits even if a resource hangs
  const failsafeTimer = setTimeout(() => {
    console.error(`💥 [Shutdown] Graceful shutdown timed out after ${timeoutMs}ms. Forcing exit.`);
    if (exitProcess) {
      process.exit(1);
    }
  }, timeoutMs);

  if (typeof failsafeTimer.unref === 'function') {
    failsafeTimer.unref();
  }

  // Step 1: Stop background jobs / timers
  try {
    console.log('[Shutdown] Stopping SLA monitor worker...');
    if (typeof stopSlaMonitorFn === 'function') {
      stopSlaMonitorFn();
    }
  } catch (err) {
    hasErrors = true;
    console.error('[Shutdown Error] Failed to stop SLA monitor:', err.message);
  }

  // Step 2: Close Socket.IO resources
  try {
    console.log('[Shutdown] Closing Socket.IO server...');
    if (io && typeof io.close === 'function') {
      await new Promise((resolve) => io.close(() => resolve()));
    } else if (typeof closeSocketFn === 'function') {
      await closeSocketFn();
    }
  } catch (err) {
    hasErrors = true;
    console.error('[Shutdown Error] Failed to close Socket.IO:', err.message);
  }

  // Step 3: Stop accepting new HTTP connections and wait for in-flight requests to complete
  try {
    if (httpServer) {
      console.log('[Shutdown] Closing HTTP server and waiting for active requests...');
      if (typeof httpServer.closeIdleConnections === 'function') {
        httpServer.closeIdleConnections();
      }
      await new Promise((resolve, reject) => {
        httpServer.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      console.log('[Shutdown] HTTP server closed successfully.');
    }
  } catch (err) {
    if (err.code !== 'ERR_SERVER_NOT_RUNNING') {
      hasErrors = true;
      console.error('[Shutdown Error] Failed to close HTTP server:', err.message);
    }
  }

  // Step 4: Disconnect from MongoDB
  try {
    console.log('[Shutdown] Disconnecting from MongoDB...');
    if (typeof disconnectDbFn === 'function') {
      await disconnectDbFn();
    } else if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    console.log('[Shutdown] MongoDB disconnected cleanly.');
  } catch (err) {
    hasErrors = true;
    console.error('[Shutdown Error] Failed to disconnect MongoDB:', err.message);
  }

  clearTimeout(failsafeTimer);

  const exitCode = hasErrors ? 1 : 0;
  console.log(`🏁 [Shutdown] Graceful shutdown completed ${hasErrors ? 'with errors' : 'cleanly'}.\n`);

  if (exitProcess) {
    process.exit(exitCode);
  }

  return { success: !hasErrors, signal, exitCode };
};

/**
 * Reset shutdown state flag (used primarily in test suites).
 */
export const _resetShutdownState = () => {
  isShuttingDown = false;
};

/**
 * Register OS process listeners for graceful shutdown.
 * Connects both SIGTERM and SIGINT to the centralized gracefulShutdown handler.
 *
 * @param {Object} options
 * @param {import('http').Server} options.httpServer
 * @param {Object} [options.io]
 */
export const registerShutdownHandlers = (options = {}) => {
  const handleSignal = (signal) => {
    gracefulShutdown({ ...options, signal });
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));
};

export default {
  gracefulShutdown,
  registerShutdownHandlers,
  _resetShutdownState,
};
