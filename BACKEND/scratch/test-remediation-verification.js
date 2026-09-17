const http = require('http');

function makeRequest({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = { ...headers };
    if (postData && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
    if (postData && !reqHeaders['Content-Length']) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: reqHeaders,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch(e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' SupportDesk Post-Remediation Verification Suite');
  console.log('====================================================\n');

  const summary = {};

  // 1. Health & Helmet
  console.log('--- 1. HEALTH & SECURITY HEADERS (HELMET) ---');
  const healthRes = await makeRequest({ method: 'GET', path: '/health' });
  const hasHelmet = Boolean(
    healthRes.headers['x-content-type-options'] === 'nosniff' &&
    healthRes.headers['x-frame-options']
  );
  console.log(`Health Status: ${healthRes.status} (Expected: 200)`);
  console.log(`Helmet Headers Present: ${hasHelmet} (x-content-type-options: ${healthRes.headers['x-content-type-options']})`);
  summary.helmet = healthRes.status === 200 && hasHelmet ? 'PASS' : 'FAIL';

  // 2. CORS Allowlist
  console.log('\n--- 2. CORS ENFORCEMENT ---');
  const corsAllowedRes = await makeRequest({
    method: 'GET',
    path: '/health',
    headers: { 'Origin': 'http://localhost:5173' }
  });
  const corsAllowedPass = corsAllowedRes.headers['access-control-allow-origin'] === 'http://localhost:5173';

  const corsBlockedRes = await makeRequest({
    method: 'GET',
    path: '/health',
    headers: { 'Origin': 'http://evil-attacker.com' }
  });
  const corsBlockedPass = corsBlockedRes.status === 403 || !corsBlockedRes.headers['access-control-allow-origin'];
  console.log(`Allowed Origin: ${corsAllowedPass ? 'PASS' : 'FAIL'}`);
  console.log(`Unauthorized Origin Blocked: ${corsBlockedPass ? 'PASS' : 'FAIL'} (status: ${corsBlockedRes.status})`);
  summary.cors = corsAllowedPass && corsBlockedPass ? 'PASS' : 'FAIL';

  // 3. Body Size Limit (50kb limit)
  console.log('\n--- 3. BODY SIZE LIMIT (50kb) ---');
  const largePayload = { data: 'A'.repeat(60 * 1024) }; // 60kb
  const bodyLimitRes = await makeRequest({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: largePayload,
  });
  const bodyLimitPass = bodyLimitRes.status === 413;
  console.log(`Oversized body rejected: status=${bodyLimitRes.status} (Expected: 413) -> ${bodyLimitPass ? 'PASS' : 'FAIL'}`);
  summary.bodyLimit = bodyLimitPass ? 'PASS' : 'FAIL';

  // 4. Login Tests
  console.log('\n--- 4. LOGIN FOR TEST ACCOUNTS ---');
  const accounts = [
    { role: 'customer', email: 'supportdesk.customer@test.local', password: 'TestCustomer@12345' },
    { role: 'agent', email: 'supportdesk.agent@test.local', password: 'TestAgent@12345' },
    { role: 'admin', email: 'supportdesk.admin@test.local', password: 'TestAdmin@12345' },
  ];

  const tokens = {};
  let allLoginsPass = true;

  for (const acc of accounts) {
    const res = await makeRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: acc.email, password: acc.password },
    });

    const pass = res.status === 200 && res.body?.success === true && Boolean(res.body?.token) && res.body?.user?.role === acc.role;
    if (!pass) allLoginsPass = false;
    tokens[acc.role] = res.body?.token;

    console.log(`[LOGIN] ${acc.role.toUpperCase()}: status=${res.status} | success=${res.body?.success} | JWT returned: ${Boolean(res.body?.token) ? 'YES' : 'NO'} | role=${res.body?.user?.role} -> ${pass ? 'PASS' : 'FAIL'}`);
  }
  summary.login = allLoginsPass ? 'PASS' : 'FAIL';

  // 5. Invalid Login
  console.log('\n--- 5. INVALID CREDENTIALS TEST ---');
  const invalidLoginRes = await makeRequest({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'supportdesk.customer@test.local', password: 'WrongPassword@999' },
  });
  const invalidPass = invalidLoginRes.status === 401 && invalidLoginRes.body?.success === false;
  console.log(`Wrong password rejected: status=${invalidLoginRes.status} -> ${invalidPass ? 'PASS' : 'FAIL'}`);
  summary.invalidLogin = invalidPass ? 'PASS' : 'FAIL';

  // 6. /auth/me Tests
  console.log('\n--- 6. /AUTH/ME TOKEN IDENTITY ---');
  let allMePass = true;
  for (const acc of accounts) {
    const res = await makeRequest({
      method: 'GET',
      path: '/api/v1/auth/me',
      headers: { 'Authorization': `Bearer ${tokens[acc.role]}` },
    });

    const pass = res.status === 200 && res.body?.success === true && res.body?.user?.role === acc.role;
    if (!pass) allMePass = false;
    console.log(`[/AUTH/ME] ${acc.role.toUpperCase()}: status=${res.status} | role=${res.body?.user?.role} -> ${pass ? 'PASS' : 'FAIL'}`);
  }
  summary.getMe = allMePass ? 'PASS' : 'FAIL';

  // 7. Backend RBAC Tests
  console.log('\n--- 7. BACKEND RBAC AUTHORIZATION ---');
  const rbacTests = [
    { role: 'customer', endpoint: '/api/v1/auth/customer-protected', expected: 200, name: 'Customer → Customer' },
    { role: 'customer', endpoint: '/api/v1/auth/agent-protected', expected: 403, name: 'Customer → Agent' },
    { role: 'customer', endpoint: '/api/v1/auth/admin-protected', expected: 403, name: 'Customer → Admin' },
    { role: 'agent', endpoint: '/api/v1/auth/agent-protected', expected: 200, name: 'Agent → Agent' },
    { role: 'agent', endpoint: '/api/v1/auth/admin-protected', expected: 403, name: 'Agent → Admin' },
    { role: 'admin', endpoint: '/api/v1/auth/admin-protected', expected: 200, name: 'Admin → Admin' },
  ];

  let allRbacPass = true;
  for (const t of rbacTests) {
    const res = await makeRequest({
      method: 'GET',
      path: t.endpoint,
      headers: { 'Authorization': `Bearer ${tokens[t.role]}` },
    });
    const pass = res.status === t.expected;
    if (!pass) allRbacPass = false;
    console.log(`[RBAC] ${t.name}: expected=${t.expected} | actual=${res.status} -> ${pass ? 'PASS' : 'FAIL'}`);
  }
  summary.rbac = allRbacPass ? 'PASS' : 'FAIL';

  // 8. Server-side Validation
  console.log('\n--- 8. SERVER-SIDE INPUT VALIDATION ---');
  const weakPasswordRes = await makeRequest({
    method: 'POST',
    path: '/api/v1/auth/register',
    body: { name: 'Weak User', email: 'weak@test.local', password: '123' },
  });
  const weakPass = weakPasswordRes.status === 400;
  console.log(`Weak password (<8 chars) rejected: status=${weakPasswordRes.status} -> ${weakPass ? 'PASS' : 'FAIL'}`);
  summary.inputValidation = weakPass ? 'PASS' : 'FAIL';

  console.log('\n====================================================');
  console.log(' SUMMARY OF TEST SUITE:');
  console.log(JSON.stringify(summary, null, 2));
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
