import 'dotenv/config';
import http from 'http';
import app from '../app.js';
import initializeSocket from '../socket/socket.js';
import {
  getAllowedOrigins,
  isOriginAllowed,
  corsOriginDelegate,
  expressCorsOptions,
  socketCorsOptions,
} from '../config/cors.js';

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

/**
 * Helper to perform raw HTTP requests with custom headers
 */
function makeRequest({ port, path = '/health', method = 'GET', headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('--- L-02: CORS & SOCKET.IO ORIGIN ALIGNMENT TEST ---');
  console.log('======================================================\n');

  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
  const originalClientUrl = process.env.CLIENT_URL;

  try {
    // =========================================================================
    // Section 1: Shared Origin Policy Configuration & Parsing
    // =========================================================================
    console.log('--- 1. Shared Origin Policy Configuration & Parsing ---');
    {
      // 1.1 Whitespace trimming and comma separation
      process.env.ALLOWED_ORIGINS = ' http://localhost:5173 , https://app.example.com ,  http://localhost:3000  ';
      delete process.env.CLIENT_URL;

      const origins = getAllowedOrigins();
      assert(
        origins.length === 3 &&
          origins[0] === 'http://localhost:5173' &&
          origins[1] === 'https://app.example.com' &&
          origins[2] === 'http://localhost:3000',
        'Comma-separated origins with whitespace are trimmed and parsed cleanly'
      );

      // 1.2 Empty string and trailing comma filtering
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173,,,https://app.example.com,';
      const cleanOrigins = getAllowedOrigins();
      assert(
        cleanOrigins.length === 2 &&
          cleanOrigins[0] === 'http://localhost:5173' &&
          cleanOrigins[1] === 'https://app.example.com',
        'Empty elements and trailing commas are filtered out'
      );

      // 1.3 Wildcard filtering when credentials are used
      process.env.ALLOWED_ORIGINS = '*,http://localhost:5173';
      const noWildcard = getAllowedOrigins();
      assert(
        !noWildcard.includes('*') && noWildcard.includes('http://localhost:5173'),
        'Unsafe wildcard (*) is stripped to avoid origin: * with credentials: true'
      );

      // 1.4 isOriginAllowed behavior
      process.env.ALLOWED_ORIGINS = 'http://localhost:5173,https://app.example.com';
      assert(isOriginAllowed('http://localhost:5173') === true, 'Permitted origin returns true');
      assert(isOriginAllowed('https://app.example.com') === true, 'Second permitted origin returns true');
      assert(isOriginAllowed('http://evil-attacker.com') === false, 'Unauthorized origin returns false');
      assert(isOriginAllowed(undefined) === true, 'Non-browser requests (no origin) are permitted');
      assert(isOriginAllowed('') === true, 'Empty origin is permitted for non-browser clients');
    }

    // =========================================================================
    // Section 2: Express & Socket.IO Shared Configuration Alignment
    // =========================================================================
    console.log('\n--- 2. Express & Socket.IO Shared Configuration Alignment ---');
    {
      assert(
        expressCorsOptions.origin === socketCorsOptions.origin,
        'Express and Socket.IO use the EXACT same origin validation delegate'
      );
      assert(
        expressCorsOptions.origin === corsOriginDelegate,
        'Express uses corsOriginDelegate from config/cors.js'
      );
      assert(
        socketCorsOptions.origin === corsOriginDelegate,
        'Socket.IO uses corsOriginDelegate from config/cors.js'
      );
      assert(
        expressCorsOptions.credentials === true && socketCorsOptions.credentials === true,
        'Both Express and Socket.IO have credentials: true aligned'
      );
      assert(
        expressCorsOptions.origin !== '*',
        'Express CORS origin is not wildcard (*)'
      );
      assert(
        socketCorsOptions.origin !== '*',
        'Socket.IO CORS origin is not wildcard (*)'
      );
    }

    // =========================================================================
    // Section 3: Live Express REST API CORS Verification
    // =========================================================================
    console.log('\n--- 3. Live Express REST API CORS Behavior ---');
    process.env.ALLOWED_ORIGINS = 'http://localhost:5173,https://dashboard.example.com';

    const testServer = http.createServer(app);
    const io = initializeSocket(testServer);

    await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve));
    const testPort = testServer.address().port;

    try {
      // 3.1 Allowed origin GET request
      const allowedRes = await makeRequest({
        port: testPort,
        path: '/health',
        method: 'GET',
        headers: { Origin: 'http://localhost:5173' },
      });
      assert(allowedRes.statusCode === 200, 'GET /health with allowed origin returns 200');
      assert(
        allowedRes.headers['access-control-allow-origin'] === 'http://localhost:5173',
        'Access-Control-Allow-Origin header matches allowed origin (http://localhost:5173)'
      );
      assert(
        allowedRes.headers['access-control-allow-credentials'] === 'true',
        'Access-Control-Allow-Credentials header is set to "true"'
      );

      // 3.2 Second allowed origin
      const allowedRes2 = await makeRequest({
        port: testPort,
        path: '/health',
        method: 'GET',
        headers: { Origin: 'https://dashboard.example.com' },
      });
      assert(
        allowedRes2.headers['access-control-allow-origin'] === 'https://dashboard.example.com',
        'Second allowed origin (https://dashboard.example.com) is correctly permitted'
      );

      // 3.3 Unauthorized origin GET request
      const unauthorizedRes = await makeRequest({
        port: testPort,
        path: '/health',
        method: 'GET',
        headers: { Origin: 'https://unauthorized-attacker.com' },
      });
      assert(
        unauthorizedRes.statusCode === 403,
        'GET /health with unauthorized origin is rejected with 403'
      );
      assert(
        !unauthorizedRes.headers['access-control-allow-origin'],
        'Access-Control-Allow-Origin header is NOT returned for unauthorized origin'
      );

      // 3.4 Preflight OPTIONS request for allowed origin
      const preflightAllowed = await makeRequest({
        port: testPort,
        path: '/api/v1/auth/login',
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization',
        },
      });
      assert(
        preflightAllowed.statusCode === 204 || preflightAllowed.statusCode === 200,
        'OPTIONS preflight with allowed origin succeeds (204/200)'
      );
      assert(
        preflightAllowed.headers['access-control-allow-origin'] === 'http://localhost:5173',
        'Preflight response includes Access-Control-Allow-Origin: http://localhost:5173'
      );
      assert(
        preflightAllowed.headers['access-control-allow-credentials'] === 'true',
        'Preflight response includes Access-Control-Allow-Credentials: true'
      );
      assert(
        preflightAllowed.headers['access-control-allow-methods'] &&
          preflightAllowed.headers['access-control-allow-methods'].includes('POST'),
        'Preflight response includes allowed HTTP methods'
      );

      // 3.5 Preflight OPTIONS request for unauthorized origin
      const preflightUnauthorized = await makeRequest({
        port: testPort,
        path: '/api/v1/auth/login',
        method: 'OPTIONS',
        headers: {
          Origin: 'http://evil.org',
          'Access-Control-Request-Method': 'POST',
        },
      });
      assert(
        preflightUnauthorized.statusCode === 403,
        'OPTIONS preflight with unauthorized origin is rejected with 403'
      );
      assert(
        !preflightUnauthorized.headers['access-control-allow-origin'],
        'No Access-Control-Allow-Origin for unauthorized preflight'
      );

      // 3.6 Non-browser request without Origin header (curl, mobile app)
      const noOriginRes = await makeRequest({
        port: testPort,
        path: '/health',
        method: 'GET',
      });
      assert(noOriginRes.statusCode === 200, 'Requests without Origin header (e.g. curl) return 200');

      // =======================================================================
      // Section 4: Live Socket.IO CORS Verification
      // =======================================================================
      console.log('\n--- 4. Live Socket.IO CORS Handshake Behavior ---');

      // 4.1 Allowed Socket.IO origin
      const socketAllowedRes = await makeRequest({
        port: testPort,
        path: '/socket.io/?EIO=4&transport=polling',
        method: 'GET',
        headers: { Origin: 'http://localhost:5173' },
      });
      assert(
        socketAllowedRes.statusCode === 200,
        'Socket.IO polling handshake from allowed origin returns 200'
      );
      assert(
        socketAllowedRes.headers['access-control-allow-origin'] === 'http://localhost:5173',
        'Socket.IO response sets Access-Control-Allow-Origin: http://localhost:5173'
      );
      assert(
        socketAllowedRes.headers['access-control-allow-credentials'] === 'true',
        'Socket.IO response sets Access-Control-Allow-Credentials: true'
      );
      assert(
        socketAllowedRes.body.startsWith('0{"sid":'),
        'Socket.IO handshake session was established (EIO open packet)'
      );

      // 4.2 Second allowed Socket.IO origin
      const socketAllowedRes2 = await makeRequest({
        port: testPort,
        path: '/socket.io/?EIO=4&transport=polling',
        method: 'GET',
        headers: { Origin: 'https://dashboard.example.com' },
      });
      assert(
        socketAllowedRes2.statusCode === 200,
        'Socket.IO accepts second allowed origin (https://dashboard.example.com)'
      );
      assert(
        socketAllowedRes2.headers['access-control-allow-origin'] === 'https://dashboard.example.com',
        'Socket.IO sets Access-Control-Allow-Origin for second origin'
      );

      // 4.3 Unauthorized Socket.IO origin
      const socketUnauthorizedRes = await makeRequest({
        port: testPort,
        path: '/socket.io/?EIO=4&transport=polling',
        method: 'GET',
        headers: { Origin: 'http://evil-unauthorized.com' },
      });
      assert(
        socketUnauthorizedRes.statusCode === 400 || socketUnauthorizedRes.statusCode === 403,
        'Socket.IO handshake from unauthorized origin is rejected by CORS layer (400/403)'
      );
      assert(
        socketUnauthorizedRes.headers['access-control-allow-origin'] !== 'http://evil-unauthorized.com',
        'Socket.IO does NOT grant Access-Control-Allow-Origin to unauthorized origin'
      );
    } finally {
      if (io && typeof io.close === 'function') {
        await new Promise((resolve) => io.close(resolve));
      }
      if (testServer && testServer.listening) {
        await new Promise((resolve) => testServer.close(resolve));
      }
    }
  } finally {
    // Restore original env vars
    if (originalAllowedOrigins !== undefined) {
      process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
    if (originalClientUrl !== undefined) {
      process.env.CLIENT_URL = originalClientUrl;
    } else {
      delete process.env.CLIENT_URL;
    }
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
