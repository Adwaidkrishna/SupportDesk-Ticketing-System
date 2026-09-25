import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import { gracefulShutdown, _resetShutdownState, registerShutdownHandlers } from '../utils/gracefulShutdown.js';
import { startSlaMonitor, stopSlaMonitor } from '../jobs/slaMonitor.job.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('--- L-01: GRACEFUL SHUTDOWN HANDLERS TEST SUITE ---');
  console.log('======================================================\n');

  // =========================================================================
  // Section 1: Complete Cleanup Flow (Sequence & Execution)
  // =========================================================================
  console.log('--- 1. Testing Centralized Clean Shutdown Execution & Sequence ---');
  {
    _resetShutdownState();

    const executionOrder = [];

    // Mock HTTP server
    const mockHttpServer = {
      listening: true,
      closeIdleConnections: () => {
        executionOrder.push('closeIdleConnections');
      },
      close: (cb) => {
        executionOrder.push('httpServer.close');
        mockHttpServer.listening = false;
        cb();
      },
    };

    // Mock Socket.IO server
    const mockIo = {
      close: (cb) => {
        executionOrder.push('io.close');
        cb();
      },
    };

    // Mock SLA monitor stop function
    const mockStopSla = () => {
      executionOrder.push('stopSlaMonitor');
    };

    // Mock DB disconnect function
    const mockDisconnectDb = async () => {
      executionOrder.push('disconnectDB');
    };

    const result = await gracefulShutdown({
      signal: 'SIGTERM',
      httpServer: mockHttpServer,
      io: mockIo,
      stopSlaMonitorFn: mockStopSla,
      disconnectDbFn: mockDisconnectDb,
      timeoutMs: 5000,
      exitProcess: false,
    });

    assert(result.success === true, 'Shutdown completed successfully');
    assert(result.signal === 'SIGTERM', 'Reported correct signal (SIGTERM)');
    assert(result.exitCode === 0, 'Clean shutdown reports exit code 0');
    assert(mockHttpServer.listening === false, 'HTTP server was marked not listening');

    // Verify ordering: Stop jobs -> Close Socket -> Close HTTP server -> Disconnect DB
    assert(executionOrder.includes('stopSlaMonitor'), 'SLA monitor was stopped');
    assert(executionOrder.includes('io.close'), 'Socket.IO was closed');
    assert(executionOrder.includes('httpServer.close'), 'HTTP server was closed');
    assert(executionOrder.includes('disconnectDB'), 'Database disconnect was invoked');

    const stopSlaIdx = executionOrder.indexOf('stopSlaMonitor');
    const ioCloseIdx = executionOrder.indexOf('io.close');
    const httpCloseIdx = executionOrder.indexOf('httpServer.close');
    const dbCloseIdx = executionOrder.indexOf('disconnectDB');

    assert(stopSlaIdx < httpCloseIdx, 'SLA monitor stopped before HTTP server closes');
    assert(ioCloseIdx < httpCloseIdx, 'Socket.IO closed before HTTP server closes');
    assert(httpCloseIdx < dbCloseIdx, 'HTTP server closes before MongoDB disconnects (in-flight request safety)');
  }

  // =========================================================================
  // Section 2: Idempotency Verification (Preventing Duplicate Executions)
  // =========================================================================
  console.log('\n--- 2. Testing Shutdown Idempotency (Duplicate Signal Guard) ---');
  {
    _resetShutdownState();

    let cleanupsCount = 0;
    const mockHttpServer = {
      listening: true,
      close: (cb) => {
        cleanupsCount++;
        cb();
      },
    };

    // First call with SIGTERM
    const firstCall = gracefulShutdown({
      signal: 'SIGTERM',
      httpServer: mockHttpServer,
      stopSlaMonitorFn: () => {},
      closeSocketFn: () => {},
      disconnectDbFn: async () => {},
      exitProcess: false,
    });

    // Immediate second call with SIGINT
    const secondCall = gracefulShutdown({
      signal: 'SIGINT',
      httpServer: mockHttpServer,
      stopSlaMonitorFn: () => {},
      closeSocketFn: () => {},
      disconnectDbFn: async () => {},
      exitProcess: false,
    });

    const [res1, res2] = await Promise.all([firstCall, secondCall]);

    assert(res1.alreadyShuttingDown !== true, 'First shutdown call initiated cleanup');
    assert(res2.alreadyShuttingDown === true, 'Second shutdown call was safely ignored as duplicate');
    assert(cleanupsCount === 1, 'HTTP server close was called exactly once (idempotent)');
  }

  // =========================================================================
  // Section 3: SIGINT Invocation Support
  // =========================================================================
  console.log('\n--- 3. Testing SIGINT Signal Handling ---');
  {
    _resetShutdownState();

    let sigintHandled = false;
    const result = await gracefulShutdown({
      signal: 'SIGINT',
      httpServer: null,
      io: null,
      stopSlaMonitorFn: () => { sigintHandled = true; },
      closeSocketFn: () => {},
      disconnectDbFn: async () => {},
      exitProcess: false,
    });

    assert(result.success === true, 'SIGINT shutdown succeeded');
    assert(result.signal === 'SIGINT', 'Signal preserved as SIGINT');
    assert(sigintHandled === true, 'SIGINT invoked centralized cleanup handler');
  }

  // =========================================================================
  // Section 4: Live HTTP Server & SLA Monitor Real Resource Cleanup
  // =========================================================================
  console.log('\n--- 4. Testing Real Node.js HTTP Server & SLA Timer Cleanup ---');
  {
    _resetShutdownState();

    // Start a real Node HTTP server
    const testServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });

    await new Promise((resolve) => testServer.listen(0, resolve));
    const testPort = testServer.address().port;
    assert(testServer.listening === true, `Test HTTP server listening on port ${testPort}`);

    // Start real SLA monitor
    startSlaMonitor(5000);

    const result = await gracefulShutdown({
      signal: 'SIGTERM',
      httpServer: testServer,
      stopSlaMonitorFn: stopSlaMonitor,
      disconnectDbFn: async () => {},
      exitProcess: false,
    });

    assert(result.success === true, 'Shutdown completed on real HTTP server');
    assert(testServer.listening === false, 'Real HTTP server closed and stopped listening');

    // Confirm that new connections are rejected
    let connectionRefused = false;
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${testPort}/`, (res) => {
          resolve(res);
        });
        req.on('error', (err) => {
          reject(err);
        });
      });
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        connectionRefused = true;
      }
    }

    assert(connectionRefused === true, 'Closed server rejects new incoming HTTP connections (ECONNREFUSED)');
  }

  // =========================================================================
  // Section 5: Real MongoDB Connection Disconnect
  // =========================================================================
  console.log('\n--- 5. Testing Real MongoDB Disconnect ---');
  {
    _resetShutdownState();

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/supportdesk';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    assert(mongoose.connection.readyState === 1, 'MongoDB is connected (readyState: 1)');

    const result = await gracefulShutdown({
      signal: 'SIGTERM',
      httpServer: null,
      stopSlaMonitorFn: () => {},
      closeSocketFn: () => {},
      timeoutMs: 5000,
      exitProcess: false,
    });

    assert(result.success === true, 'Shutdown with MongoDB disconnect succeeded');
    assert(mongoose.connection.readyState === 0, 'MongoDB connection state is disconnected (readyState: 0)');
  }

  // =========================================================================
  // Section 6: Error Resilience During Shutdown
  // =========================================================================
  console.log('\n--- 6. Testing Error Resilience (Non-Fatal Step Recovery) ---');
  {
    _resetShutdownState();

    let subsequentStepExecuted = false;

    const result = await gracefulShutdown({
      signal: 'SIGTERM',
      httpServer: null,
      stopSlaMonitorFn: () => {
        throw new Error('Simulated failure stopping background worker');
      },
      closeSocketFn: () => {
        subsequentStepExecuted = true;
      },
      disconnectDbFn: async () => {},
      timeoutMs: 3000,
      exitProcess: false,
    });

    assert(result.success === false, 'Returns success: false when a cleanup step throws');
    assert(result.exitCode === 1, 'Returns non-zero exitCode (1) when errors occur');
    assert(subsequentStepExecuted === true, 'Subsequent cleanup steps executed even after an earlier step failed');
  }

  // =========================================================================
  // Section 7: Process Listener Registration Verification
  // =========================================================================
  console.log('\n--- 7. Testing Process Signal Listener Registration ---');
  {
    const initialSigtermCount = process.listenerCount('SIGTERM');
    const initialSigintCount = process.listenerCount('SIGINT');

    registerShutdownHandlers({ httpServer: null });

    assert(process.listenerCount('SIGTERM') > initialSigtermCount, 'SIGTERM process listener registered');
    assert(process.listenerCount('SIGINT') > initialSigintCount, 'SIGINT process listener registered');
  }

  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
