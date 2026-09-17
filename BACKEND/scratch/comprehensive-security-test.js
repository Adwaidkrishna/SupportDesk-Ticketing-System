const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../src/models/User');
const Otp = require('../src/models/Otp');
const PasswordReset = require('../src/models/PasswordReset');
const { generateToken } = require('../src/utils/jwt.util');

function request({ method, path, headers = {}, body = null }) {
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
        try { json = data ? JSON.parse(data) : null; } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

const sha256 = (val) => crypto.createHash('sha256').update(String(val)).digest('hex');

async function runSecurityAuditTests() {
  console.log('===============================================================');
  console.log(' SupportDesk Comprehensive Production Security Audit Test Suite');
  console.log('===============================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);

  const testReport = [];
  function record(testId, name, expected, actual, pass, notes = '') {
    testReport.push({ testId, name, expected, actual, pass, notes });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${testId} - ${name} (Actual: ${actual}) ${notes}`);
  }

  // ─── T01: CORS Verification ───────────────────────────────────────────────
  const corsAllowed = await request({ method: 'GET', path: '/health', headers: { 'Origin': 'http://localhost:5173' } });
  record('T01.1', 'CORS Allowed Origin', '200 + Allow-Origin', `${corsAllowed.status} + ${corsAllowed.headers['access-control-allow-origin']}`, corsAllowed.status === 200 && corsAllowed.headers['access-control-allow-origin'] === 'http://localhost:5173');

  const corsBlocked = await request({ method: 'GET', path: '/health', headers: { 'Origin': 'http://evil.com' } });
  record('T01.2', 'CORS Disallowed Origin', '403 Forbidden', `${corsBlocked.status}`, corsBlocked.status === 403);

  // ─── T02: Helmet Security Headers ─────────────────────────────────────────
  const helmetRes = await request({ method: 'GET', path: '/health' });
  const hasNosniff = helmetRes.headers['x-content-type-options'] === 'nosniff';
  const hasFrameGuard = Boolean(helmetRes.headers['x-frame-options']);
  record('T02', 'Helmet Security Headers', 'nosniff & x-frame-options', `nosniff=${hasNosniff}, frame=${hasFrameGuard}`, hasNosniff && hasFrameGuard);

  // ─── T03: Body Size Limit (50kb) ──────────────────────────────────────────
  const largeBody = { data: 'X'.repeat(60 * 1024) };
  const bodyLimitRes = await request({ method: 'POST', path: '/api/v1/auth/login', body: largeBody });
  record('T03', 'Oversized Body Limit (50kb)', '413', `${bodyLimitRes.status}`, bodyLimitRes.status === 413);

  // ─── T04: Server-Side Password Validation ─────────────────────────────────
  const weakPwRes1 = await request({ method: 'POST', path: '/api/v1/auth/register', body: { name: 'Test', email: 'pw1@test.local', password: 'short' } });
  record('T04.1', 'Password < 8 chars rejected', '400', `${weakPwRes1.status}`, weakPwRes1.status === 400);

  const weakPwRes2 = await request({ method: 'POST', path: '/api/v1/auth/register', body: { name: 'Test', email: 'pw2@test.local', password: '' } });
  record('T04.2', 'Empty password rejected', '400', `${weakPwRes2.status}`, weakPwRes2.status === 400);

  // ─── T05: Privilege Escalation via Registration ───────────────────────────
  const testEmail = `sec_test_${Date.now()}@test.local`;
  const regRoleInject = await request({
    method: 'POST',
    path: '/api/v1/auth/register',
    body: { name: 'Attacker', email: testEmail, password: 'SecurePassword123!', role: 'admin' },
  });
  const createdUser = await User.findOne({ email: testEmail });
  record('T05', 'Role injection prevented in registration', 'role=customer', `status=${regRoleInject.status}, DB role=${createdUser?.role}`, createdUser?.role === 'customer');

  // ─── T06: Secure OTP Storage (Hashed) ─────────────────────────────────────
  const otpRecord = await Otp.findOne({ userId: createdUser._id });
  const isPlainOtp = otpRecord?.code?.length === 6 && /^\d+$/.test(otpRecord?.code);
  const isHashedOtp = otpRecord?.code?.length === 64; // SHA-256 hex length
  record('T06', 'OTP stored as SHA-256 hash in MongoDB', '64 hex chars (not plain 6-digit)', `length=${otpRecord?.code?.length}, plain=${isPlainOtp}`, !isPlainOtp && isHashedOtp);

  // ─── T07: OTP Verification (Negative: Wrong Code) ─────────────────────────
  const wrongOtpRes = await request({
    method: 'POST',
    path: '/api/v1/auth/verify-otp',
    body: { email: testEmail, otp: '000000' },
  });
  record('T07', 'Wrong OTP rejected', '400', `${wrongOtpRes.status}`, wrongOtpRes.status === 400);

  // ─── T08: OTP Verification (Positive with Mocked Known Code) ──────────────
  const knownOtp = '789123';
  const knownOtpHash = sha256(knownOtp);
  await Otp.updateOne({ userId: createdUser._id }, { code: knownOtpHash, expiresAt: new Date(Date.now() + 600000) });

  const correctOtpRes = await request({
    method: 'POST',
    path: '/api/v1/auth/verify-otp',
    body: { email: testEmail, otp: knownOtp },
  });
  const verifiedUser = await User.findOne({ email: testEmail });
  const remainingOtps = await Otp.countDocuments({ userId: createdUser._id });
  record('T08', 'Valid OTP verification + single-use invalidation', '200 + verified=true + remainingOtps=0', `${correctOtpRes.status}, verified=${verifiedUser?.isVerified}, remaining=${remainingOtps}`, correctOtpRes.status === 200 && verifiedUser?.isVerified === true && remainingOtps === 0);

  // ─── T09: OTP Replay ──────────────────────────────────────────────────────
  const replayOtpRes = await request({
    method: 'POST',
    path: '/api/v1/auth/verify-otp',
    body: { email: testEmail, otp: knownOtp },
  });
  record('T09', 'OTP replay rejected (already verified / OTP deleted)', '200 (already verified message) or 400', `${replayOtpRes.status}`, replayOtpRes.status === 200 || replayOtpRes.status === 400);

  // ─── T10: Login Positive & JWT Validation ─────────────────────────────────
  const loginRes = await request({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: testEmail, password: 'SecurePassword123!' },
  });
  const token = loginRes.body?.token;
  const decodedToken = token ? jwt.decode(token) : null;
  record('T10.1', 'Login successful for verified user', '200 + token', `${loginRes.status}`, loginRes.status === 200 && Boolean(token));
  record('T10.2', 'JWT claims minimal (userId and role only)', 'userId, role, iat, exp', Object.keys(decodedToken || {}).join(','), decodedToken && decodedToken.userId && decodedToken.role && !('password' in decodedToken));

  // ─── T11: JWT Security & Tampering ────────────────────────────────────────
  const tamperedToken = token ? token.substring(0, token.lastIndexOf('.') + 1) + 'badsignature123' : '';
  const tamperedRes = await request({
    method: 'GET',
    path: '/api/v1/auth/me',
    headers: { 'Authorization': `Bearer ${tamperedToken}` },
  });
  record('T11.1', 'Tampered JWT rejected', '401', `${tamperedRes.status}`, tamperedRes.status === 401);

  const expiredToken = jwt.sign({ userId: createdUser._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '-10s' });
  const expiredRes = await request({
    method: 'GET',
    path: '/api/v1/auth/me',
    headers: { 'Authorization': `Bearer ${expiredToken}` },
  });
  record('T11.2', 'Expired JWT rejected', '401', `${expiredRes.status}`, expiredRes.status === 401);

  const missingAuthRes = await request({ method: 'GET', path: '/api/v1/auth/me' });
  record('T11.3', 'Missing Authorization header rejected', '401', `${missingAuthRes.status}`, missingAuthRes.status === 401);

  // ─── T12: NoSQL Injection Defense ─────────────────────────────────────────
  const nosqlEmailRes = await request({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: { $ne: null }, password: 'SecurePassword123!' },
  });
  record('T12.1', 'NoSQL injection on email rejected', '401', `${nosqlEmailRes.status}`, nosqlEmailRes.status === 401);

  const nosqlPwRes = await request({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: testEmail, password: { $gt: '' } },
  });
  record('T12.2', 'NoSQL injection on password rejected', '401', `${nosqlPwRes.status}`, nosqlPwRes.status === 401);

  // ─── T13: Password Reset Lifecycle ────────────────────────────────────────
  const forgotUnknown = await request({ method: 'POST', path: '/api/v1/auth/forgot-password', body: { email: 'nonexistent_user@test.local' } });
  const forgotKnown = await request({ method: 'POST', path: '/api/v1/auth/forgot-password', body: { email: testEmail } });
  record('T13.1', 'Forgot password generic response (enumeration defense)', 'Equal generic messages', `unknown="${forgotUnknown.body?.message}", known="${forgotKnown.body?.message}"`, forgotUnknown.body?.message === forgotKnown.body?.message);

  const prRecord = await PasswordReset.findOne({ userId: createdUser._id });
  const isHashedPR = prRecord?.token?.length === 64;
  record('T13.2', 'Password reset token stored as SHA-256 hash in DB', '64 hex chars', `length=${prRecord?.token?.length}`, isHashedPR);

  const testResetToken = 'mock_reset_token_secret_12345';
  const testResetHash = sha256(testResetToken);
  await PasswordReset.updateOne({ userId: createdUser._id }, { token: testResetHash, used: false, expiresAt: new Date(Date.now() + 900000) });

  const resetRes = await request({
    method: 'POST',
    path: '/api/v1/auth/reset-password',
    body: { email: testEmail, token: testResetToken, newPassword: 'BrandNewPassword@456!' },
  });
  record('T13.3', 'Password reset with valid token', '200 OK', `${resetRes.status}`, resetRes.status === 200);

  const replayResetRes = await request({
    method: 'POST',
    path: '/api/v1/auth/reset-password',
    body: { email: testEmail, token: testResetToken, newPassword: 'AnotherPassword@789!' },
  });
  record('T13.4', 'Reset token replay rejected (already used)', '400', `${replayResetRes.status}`, replayResetRes.status === 400);

  const loginOldPw = await request({ method: 'POST', path: '/api/v1/auth/login', body: { email: testEmail, password: 'SecurePassword123!' } });
  const loginNewPw = await request({ method: 'POST', path: '/api/v1/auth/login', body: { email: testEmail, password: 'BrandNewPassword@456!' } });
  record('T13.5', 'Old password rejected / new password accepted', 'Old=401, New=200', `Old=${loginOldPw.status}, New=${loginNewPw.status}`, loginOldPw.status === 401 && loginNewPw.status === 200);

  // ─── T14: RBAC Verification using Seeded Test Accounts ────────────────────
  const customerDoc = await User.findOne({ email: 'supportdesk.customer@test.local' });
  const agentDoc = await User.findOne({ email: 'supportdesk.agent@test.local' });
  const adminDoc = await User.findOne({ email: 'supportdesk.admin@test.local' });

  const cToken = generateToken({ userId: customerDoc._id, role: customerDoc.role });
  const aToken = generateToken({ userId: agentDoc._id, role: agentDoc.role });
  const admToken = generateToken({ userId: adminDoc._id, role: adminDoc.role });

  const cToC = await request({ method: 'GET', path: '/api/v1/auth/customer-protected', headers: { 'Authorization': `Bearer ${cToken}` } });
  const cToA = await request({ method: 'GET', path: '/api/v1/auth/agent-protected', headers: { 'Authorization': `Bearer ${cToken}` } });
  const cToAdm = await request({ method: 'GET', path: '/api/v1/auth/admin-protected', headers: { 'Authorization': `Bearer ${cToken}` } });
  const aToA = await request({ method: 'GET', path: '/api/v1/auth/agent-protected', headers: { 'Authorization': `Bearer ${aToken}` } });
  const aToAdm = await request({ method: 'GET', path: '/api/v1/auth/admin-protected', headers: { 'Authorization': `Bearer ${aToken}` } });
  const admToAdm = await request({ method: 'GET', path: '/api/v1/auth/admin-protected', headers: { 'Authorization': `Bearer ${admToken}` } });

  record('T14.1', 'Customer → Customer Endpoint', '200 Allowed', `${cToC.status}`, cToC.status === 200);
  record('T14.2', 'Customer → Agent Endpoint', '403 Denied', `${cToA.status}`, cToA.status === 403);
  record('T14.3', 'Customer → Admin Endpoint', '403 Denied', `${cToAdm.status}`, cToAdm.status === 403);
  record('T14.4', 'Agent → Agent Endpoint', '200 Allowed', `${aToA.status}`, aToA.status === 200);
  record('T14.5', 'Agent → Admin Endpoint', '403 Denied', `${aToAdm.status}`, aToAdm.status === 403);
  record('T14.6', 'Admin → Admin Endpoint', '200 Allowed', `${admToAdm.status}`, admToAdm.status === 200);

  // ─── T15: Rate Limiting Verification ──────────────────────────────────────
  // Test that repeated registration or login triggers 429
  console.log('\nTesting Rate Limiter Trigger (5 rapid requests to trigger 429)...');
  let hitRateLimit = false;
  for (let i = 0; i < 6; i++) {
    const r = await request({
      method: 'POST',
      path: '/api/v1/auth/register',
      body: { name: 'Spam', email: `spam_${i}_${Date.now()}@test.local`, password: 'ValidPassword123!' },
    });
    if (r.status === 429) {
      hitRateLimit = true;
      break;
    }
  }
  record('T15', 'Rate limiting triggers HTTP 429 on abuse', '429', `hitRateLimit=${hitRateLimit}`, hitRateLimit);

  // Clean up temporary test user
  await Otp.deleteMany({ userId: createdUser._id });
  await PasswordReset.deleteMany({ userId: createdUser._id });
  await User.deleteOne({ _id: createdUser._id });

  await mongoose.disconnect();

  const passedCount = testReport.filter(r => r.pass).length;
  const totalCount = testReport.length;

  console.log('\n===============================================================');
  console.log(` FINAL AUDIT TEST SUITE: ${passedCount} / ${totalCount} PASSED (${Math.round(passedCount/totalCount*100)}%)`);
  console.log('===============================================================');
}

runSecurityAuditTests().catch(err => {
  console.error('Audit run error:', err);
  process.exit(1);
});
