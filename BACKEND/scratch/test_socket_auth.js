import 'dotenv/config';
import { io } from '../../FRONTEND/node_modules/socket.io-client/build/esm/index.js';
import { generateToken } from '../src/utils/jwt.util.js';

const SOCKET_URL = 'http://localhost:5000';

async function runSocketAuthTests() {
  console.log('--- STARTING SOCKET.IO AUTHENTICATION SECURITY TESTS ---\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      failed++;
    }
  }

  // Generate tokens for testing
  const validToken = generateToken({
    userId: '6aabfee8b74b00a0ebe13017',
    role: 'customer',
  });
  const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';

  // ----------------------------------------------------
  // TEST 1: Valid JWT connects successfully
  // ----------------------------------------------------
  console.log('1. Testing Connection with Valid JWT...');
  await new Promise((resolve) => {
    const socket = io(SOCKET_URL, {
      auth: { token: validToken },
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    socket.on('connect', () => {
      assert(true, `Connected successfully with valid JWT (Socket ID: ${socket.id})`);
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (err) => {
      assert(false, `Unexpected error on valid token: ${err.message}`);
      socket.disconnect();
      resolve();
    });
  });

  // ----------------------------------------------------
  // TEST 2: Missing JWT is rejected with 401 equivalent error
  // ----------------------------------------------------
  console.log('\n2. Testing Connection with Missing JWT...');
  await new Promise((resolve) => {
    const socket = io(SOCKET_URL, {
      auth: {},
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    socket.on('connect', () => {
      assert(false, 'Security breach: Connected without a token!');
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (err) => {
      assert(
        err.message === 'Authentication token required',
        `Correctly rejected missing token with: "${err.message}"`
      );
      socket.disconnect();
      resolve();
    });
  });

  // ----------------------------------------------------
  // TEST 3: Invalid / Tampered JWT is rejected
  // ----------------------------------------------------
  console.log('\n3. Testing Connection with Invalid/Tampered JWT...');
  await new Promise((resolve) => {
    const socket = io(SOCKET_URL, {
      auth: { token: invalidToken },
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    socket.on('connect', () => {
      assert(false, 'Security breach: Connected with invalid token!');
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (err) => {
      assert(
        err.message === 'Invalid or expired authentication token',
        `Correctly rejected invalid token with: "${err.message}"`
      );
      socket.disconnect();
      resolve();
    });
  });

  console.log(`\n========================================`);
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSocketAuthTests();
