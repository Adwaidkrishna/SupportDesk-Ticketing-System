import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Category from '../models/Category.js';
import TicketMessage from '../models/TicketMessage.js';
import Notification from '../models/Notification.js';
import { generateToken } from '../utils/jwt.util.js';
import { hashPassword } from '../utils/hash.util.js';
import { validateTicketIdParam } from '../validators/ticket.validator.js';

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
  console.log('--- C-01: TICKET IDENTIFIER / URL MISMATCH TEST SUITE ---');
  console.log('======================================================\n');

  console.log('--- 1. Testing validateTicketIdParam Unit Validation ---');

  // Test 1.1: Valid ObjectId
  {
    let nextCalled = false;
    const req = { params: { ticketId: '507f1f77bcf86cd799439011' } };
    const res = {};
    validateTicketIdParam(req, res, () => { nextCalled = true; });
    assert(nextCalled && req.params.ticketId === '507f1f77bcf86cd799439011', 'Valid 24-hex ObjectId accepted');
  }

  // Test 1.2: Valid ticketNumber TKT-000001
  {
    let nextCalled = false;
    const req = { params: { ticketId: 'TKT-000001' } };
    const res = {};
    validateTicketIdParam(req, res, () => { nextCalled = true; });
    assert(nextCalled && req.params.ticketId === 'TKT-000001', 'Valid business ticket number TKT-000001 accepted');
  }

  // Test 1.3: Leading # prefix #TKT-000001
  {
    let nextCalled = false;
    const req = { params: { ticketId: '#TKT-000001' } };
    const res = {};
    validateTicketIdParam(req, res, () => { nextCalled = true; });
    assert(nextCalled && req.params.ticketId === 'TKT-000001', 'Leading # prefix normalized and accepted (#TKT-000001 -> TKT-000001)');
  }

  // Test 1.4: Lowercase ticket number tkt-000123
  {
    let nextCalled = false;
    const req = { params: { ticketId: 'tkt-000123' } };
    const res = {};
    validateTicketIdParam(req, res, () => { nextCalled = true; });
    assert(nextCalled && req.params.ticketId === 'TKT-000123', 'Lowercase ticket number normalized to uppercase TKT-000123');
  }

  // Test 1.5: Invalid "hello" rejected with 400
  {
    let statusCode = null;
    let errorMsg = '';
    const req = { params: { ticketId: 'hello' } };
    const res = { status: (c) => ({ json: (b) => { statusCode = c; errorMsg = b.message; } }) };
    validateTicketIdParam(req, res, () => {});
    assert(statusCode === 400 && errorMsg.includes('Invalid ticket ID format'), 'Invalid identifier "hello" rejected with 400');
  }

  // Test 1.6: Invalid "123" rejected with 400
  {
    let statusCode = null;
    const req = { params: { ticketId: '123' } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateTicketIdParam(req, res, () => {});
    assert(statusCode === 400, 'Invalid identifier "123" rejected with 400');
  }

  // Test 1.7: Invalid "TICKET" rejected with 400
  {
    let statusCode = null;
    const req = { params: { ticketId: 'TICKET' } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateTicketIdParam(req, res, () => {});
    assert(statusCode === 400, 'Invalid identifier "TICKET" rejected with 400');
  }

  // Test 1.8: Invalid "TKT-ABC" rejected with 400
  {
    let statusCode = null;
    const req = { params: { ticketId: 'TKT-ABC' } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateTicketIdParam(req, res, () => {});
    assert(statusCode === 400, 'Invalid identifier "TKT-ABC" rejected with 400');
  }

  // Test 1.9: Invalid "random-user-input" rejected with 400
  {
    let statusCode = null;
    const req = { params: { ticketId: 'random-user-input' } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateTicketIdParam(req, res, () => {});
    assert(statusCode === 400, 'Invalid identifier "random-user-input" rejected with 400');
  }

  // Test 1.10: Empty/whitespace string rejected with 400
  {
    let statusCode = null;
    const req = { params: { ticketId: '   ' } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateTicketIdParam(req, res, () => {});
    assert(statusCode === 400, 'Whitespace-only ticketId rejected with 400');
  }

  console.log('\n--- 2. Setting Up Database & HTTP Server ---');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/supportdesk';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB.');

  const hashedPassword = await hashPassword('Password123!');
  const testSuffix = Date.now().toString().slice(-6);

  // Setup Users: Customer A, Customer B, Agent 1, Agent 2, Admin
  const customerA = await User.create({
    name: `Customer Alpha ${testSuffix}`,
    email: `custA_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'customer',
    isEmailVerified: true,
    isActive: true,
  });

  const customerB = await User.create({
    name: `Customer Beta ${testSuffix}`,
    email: `custB_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'customer',
    isEmailVerified: true,
    isActive: true,
  });

  const agent1 = await User.create({
    name: `Agent Prime ${testSuffix}`,
    email: `agent1_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'agent',
    department: 'Support',
    availability: 'Available',
    isEmailVerified: true,
    isActive: true,
  });

  const agent2 = await User.create({
    name: `Agent Secondary ${testSuffix}`,
    email: `agent2_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'agent',
    department: 'Billing',
    availability: 'Available',
    isEmailVerified: true,
    isActive: true,
  });

  const testCategory = await Category.create({
    name: `Cat_${testSuffix}`,
    description: 'Category for testing C-01 identifier flows',
    isActive: true,
  });

  const tokenCustA = generateToken({ userId: customerA._id.toString(), role: 'customer' });
  const tokenCustB = generateToken({ userId: customerB._id.toString(), role: 'customer' });
  const tokenAgent1 = generateToken({ userId: agent1._id.toString(), role: 'agent' });
  const tokenAgent2 = generateToken({ userId: agent2._id.toString(), role: 'agent' });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  function makeRequest(path, method, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  console.log('\n--- 3. Testing Customer Flow via Ticket Number & ObjectId ---');

  // Test 3.1: Customer A creates ticket
  let ticketA;
  {
    const res = await makeRequest(
      '/api/v1/tickets',
      'POST',
      {
        subject: 'Internet connection is completely broken',
        description: 'Unable to connect to router since morning.',
        categoryId: testCategory._id.toString(),
        priority: 'HIGH',
      },
      tokenCustA
    );
    assert(res.status === 201 && res.body.success === true, 'Customer A creates ticket successfully (201)');
    ticketA = res.body.data.ticket;
    assert(Boolean(ticketA?.ticketNumber && ticketA?.ticketNumber.startsWith('TKT-')), `Ticket created with business ticket number: ${ticketA?.ticketNumber}`);
  }

  const tktNumberA = ticketA.ticketNumber;
  const tktObjectIdA = ticketA.id || ticketA._id;

  // Test 3.2: Customer A gets ticket details via ticketNumber (TKT-XXXXXX)
  {
    const res = await makeRequest(`/api/v1/tickets/${tktNumberA}`, 'GET', null, tokenCustA);
    assert(res.status === 200 && res.body.data?.ticket?.ticketNumber === tktNumberA, `GET /api/v1/tickets/${tktNumberA} returns 200 with ticket data`);
  }

  // Test 3.3: Customer A gets ticket details via ObjectId
  {
    const res = await makeRequest(`/api/v1/tickets/${tktObjectIdA}`, 'GET', null, tokenCustA);
    assert(res.status === 200 && res.body.data?.ticket?.id === tktObjectIdA, `GET /api/v1/tickets/${tktObjectIdA} returns 200 with ticket data`);
  }

  // Test 3.4: Customer A gets ticket details with leading '#' (#TKT-XXXXXX)
  {
    const res = await makeRequest(`/api/v1/tickets/%23${tktNumberA}`, 'GET', null, tokenCustA);
    assert(res.status === 200 && res.body.data?.ticket?.ticketNumber === tktNumberA, `GET /api/v1/tickets/#${tktNumberA} returns 200`);
  }

  // Test 3.5: Customer A sends message via ticketNumber (TKT-XXXXXX)
  {
    const res = await makeRequest(
      `/api/v1/tickets/${tktNumberA}/messages`,
      'POST',
      { body: 'Hello support, here is more detail about the outage.' },
      tokenCustA
    );
    assert(res.status === 201 && res.body.data?.body.includes('more detail'), `POST /api/v1/tickets/${tktNumberA}/messages creates message (201)`);
    assert(res.body.data?.ticketId === tktObjectIdA, 'Message ticketId is stored as MongoDB ObjectId');
  }

  // Test 3.6: Customer A sends message via ObjectId
  {
    const res = await makeRequest(
      `/api/v1/tickets/${tktObjectIdA}/messages`,
      'POST',
      { body: 'Another update sent using ObjectId route.' },
      tokenCustA
    );
    assert(res.status === 201 && res.body.data?.body.includes('using ObjectId'), `POST /api/v1/tickets/${tktObjectIdA}/messages creates message (201)`);
  }

  // Test 3.7: Customer A retrieves messages via ticketNumber (TKT-XXXXXX)
  {
    const res = await makeRequest(`/api/v1/tickets/${tktNumberA}/messages`, 'GET', null, tokenCustA);
    assert(res.status === 200 && Array.isArray(res.body.data) && res.body.data.length === 2, `GET /api/v1/tickets/${tktNumberA}/messages returns 2 messages`);
  }

  // Test 3.8: Customer A retrieves messages via ObjectId
  {
    const res = await makeRequest(`/api/v1/tickets/${tktObjectIdA}/messages`, 'GET', null, tokenCustA);
    assert(res.status === 200 && Array.isArray(res.body.data) && res.body.data.length === 2, `GET /api/v1/tickets/${tktObjectIdA}/messages returns 2 messages`);
  }

  // Test 3.9: Non-existent ticket number returns 404
  {
    const res = await makeRequest('/api/v1/tickets/TKT-999999', 'GET', null, tokenCustA);
    assert(res.status === 404, 'GET /api/v1/tickets/TKT-999999 returns 404 Not Found');
  }

  // Test 3.10: Malformed identifier returns 400
  {
    const res = await makeRequest('/api/v1/tickets/hello', 'GET', null, tokenCustA);
    assert(res.status === 400 && res.body.message.includes('Invalid ticket ID format'), 'GET /api/v1/tickets/hello returns 400 Validation Error');
  }

  console.log('\n--- 4. Testing Agent Flow via Ticket Number & ObjectId ---');

  // Test 4.1: Agent 1 views unassigned ticket details via ticketNumber
  {
    const res = await makeRequest(`/api/v1/agent/tickets/${tktNumberA}`, 'GET', null, tokenAgent1);
    assert(res.status === 200 && res.body.data?.ticketNumber === tktNumberA, `Agent GET /api/v1/agent/tickets/${tktNumberA} returns 200`);
  }

  // Test 4.2: Agent 1 claims ticket via ticketNumber (TKT-XXXXXX)
  {
    const res = await makeRequest(`/api/v1/agent/tickets/${tktNumberA}/claim`, 'POST', null, tokenAgent1);
    assert(res.status === 200 && res.body.data?.status === 'IN_PROGRESS', `Agent 1 POST /api/v1/agent/tickets/${tktNumberA}/claim returns 200 and sets status to IN_PROGRESS`);
    assert(res.body.data?.assignedTo?.id === agent1._id.toString(), 'Ticket assignedTo is set to Agent 1');
  }

  // Test 4.3: Agent 2 tries to claim already claimed ticket via ticketNumber -> 409 Conflict
  {
    const res = await makeRequest(`/api/v1/agent/tickets/${tktNumberA}/claim`, 'POST', null, tokenAgent2);
    assert(res.status === 409, `Agent 2 POST /api/v1/agent/tickets/${tktNumberA}/claim returns 409 Conflict (already claimed)`);
  }

  // Test 4.4: Assigned Agent 1 sends message via ticketNumber
  {
    const res = await makeRequest(
      `/api/v1/agent/tickets/${tktNumberA}/messages`,
      'POST',
      { body: 'Hello Customer A, I have picked up your ticket and am investigating.' },
      tokenAgent1
    );
    assert(res.status === 201 && res.body.data?.senderRole === 'agent', `Agent 1 POST /api/v1/agent/tickets/${tktNumberA}/messages returns 201`);
  }

  // Test 4.5: Assigned Agent 1 gets messages via ticketNumber
  {
    const res = await makeRequest(`/api/v1/agent/tickets/${tktNumberA}/messages`, 'GET', null, tokenAgent1);
    assert(res.status === 200 && Array.isArray(res.body.data) && res.body.data.length === 3, `Agent 1 GET /api/v1/agent/tickets/${tktNumberA}/messages returns 3 messages`);
  }

  // Test 4.6: Assigned Agent 1 marks ticket as RESOLVED via ticketNumber
  {
    const res = await makeRequest(
      `/api/v1/agent/tickets/${tktNumberA}/status`,
      'PATCH',
      { status: 'RESOLVED' },
      tokenAgent1
    );
    assert(res.status === 200 && res.body.data?.ticket?.status === 'RESOLVED', `Agent 1 PATCH /api/v1/agent/tickets/${tktNumberA}/status returns 200 (RESOLVED)`);
  }

  // Test 4.7: Customer A reopens ticket via ticketNumber
  {
    const res = await makeRequest(
      `/api/v1/tickets/${tktNumberA}/reopen`,
      'PATCH',
      null,
      tokenCustA
    );
    assert(res.status === 200 && res.body.data?.ticket?.status === 'IN_PROGRESS', `Customer A PATCH /api/v1/tickets/${tktNumberA}/reopen reopens ticket to IN_PROGRESS (200)`);
  }

  // Test 4.8: Customer A reopens ticket via ObjectId
  // First re-resolve ticket via ObjectId
  {
    const resResolve = await makeRequest(
      `/api/v1/agent/tickets/${tktObjectIdA}/status`,
      'PATCH',
      { status: 'RESOLVED' },
      tokenAgent1
    );
    assert(resResolve.status === 200 && resResolve.body.data?.ticket?.status === 'RESOLVED', 'Agent 1 resolves ticket via ObjectId');

    const resReopen = await makeRequest(
      `/api/v1/tickets/${tktObjectIdA}/reopen`,
      'PATCH',
      null,
      tokenCustA
    );
    assert(resReopen.status === 200 && resReopen.body.data?.ticket?.status === 'IN_PROGRESS', 'Customer A reopens ticket via ObjectId (200)');
  }

  console.log('\n--- 5. Testing Security & IDOR Isolation ---');

  // Customer B creates Ticket B
  let ticketB;
  {
    const res = await makeRequest(
      '/api/v1/tickets',
      'POST',
      {
        subject: 'Customer B confidential issue',
        description: 'Private billing inquiry for Customer B.',
        categoryId: testCategory._id.toString(),
        priority: 'MEDIUM',
      },
      tokenCustB
    );
    ticketB = res.body.data.ticket;
  }
  const tktNumberB = ticketB.ticketNumber;
  const tktObjectIdB = ticketB.id || ticketB._id;

  // Security Test 5.1: Customer A requests Customer B ticket details via ticketNumber -> 404 (BLOCKED)
  {
    const res = await makeRequest(`/api/v1/tickets/${tktNumberB}`, 'GET', null, tokenCustA);
    assert(res.status === 404, `Customer A GET /api/v1/tickets/${tktNumberB} (Customer B ticket) returns 404 BLOCKED`);
  }

  // Security Test 5.2: Customer A requests Customer B ticket details via ObjectId -> 404 (BLOCKED)
  {
    const res = await makeRequest(`/api/v1/tickets/${tktObjectIdB}`, 'GET', null, tokenCustA);
    assert(res.status === 404, `Customer A GET /api/v1/tickets/${tktObjectIdB} (Customer B ticket) returns 404 BLOCKED`);
  }

  // Security Test 5.3: Customer A requests Customer B ticket messages via ticketNumber -> 404 (BLOCKED)
  {
    const res = await makeRequest(`/api/v1/tickets/${tktNumberB}/messages`, 'GET', null, tokenCustA);
    assert(res.status === 404, `Customer A GET /api/v1/tickets/${tktNumberB}/messages (Customer B ticket) returns 404 BLOCKED`);
  }

  // Security Test 5.4: Customer A sends message on Customer B ticket via ticketNumber -> 404 (BLOCKED)
  {
    const res = await makeRequest(
      `/api/v1/tickets/${tktNumberB}/messages`,
      'POST',
      { body: 'Hacking Customer B ticket' },
      tokenCustA
    );
    assert(res.status === 404, `Customer A POST /api/v1/tickets/${tktNumberB}/messages returns 404 BLOCKED`);
  }

  // Security Test 5.5: Customer A reopens Customer B ticket via ticketNumber -> 403 (BLOCKED)
  {
    const res = await makeRequest(`/api/v1/tickets/${tktNumberB}/reopen`, 'PATCH', null, tokenCustA);
    assert(res.status === 403, `Customer A PATCH /api/v1/tickets/${tktNumberB}/reopen returns 403 Access Denied (BLOCKED)`);
  }

  // Security Test 5.6: Unassigned Agent 2 requests messages on Agent 1's assigned ticket via ticketNumber -> 403 (BLOCKED)
  {
    const res = await makeRequest(`/api/v1/agent/tickets/${tktNumberA}/messages`, 'GET', null, tokenAgent2);
    assert(res.status === 403, `Unassigned Agent 2 GET /api/v1/agent/tickets/${tktNumberA}/messages returns 403 Access Denied (BLOCKED)`);
  }

  // Security Test 5.7: Unassigned Agent 2 posts message on Agent 1's assigned ticket via ticketNumber -> 403 (BLOCKED)
  {
    const res = await makeRequest(
      `/api/v1/agent/tickets/${tktNumberA}/messages`,
      'POST',
      { body: 'Interfering agent message' },
      tokenAgent2
    );
    assert(res.status === 403, `Unassigned Agent 2 POST /api/v1/agent/tickets/${tktNumberA}/messages returns 403 Access Denied (BLOCKED)`);
  }

  // Security Test 5.8: Unassigned Agent 2 changes status on Agent 1's assigned ticket via ticketNumber -> 403 (BLOCKED)
  {
    const res = await makeRequest(
      `/api/v1/agent/tickets/${tktNumberA}/status`,
      'PATCH',
      { status: 'RESOLVED' },
      tokenAgent2
    );
    assert(res.status === 403, `Unassigned Agent 2 PATCH /api/v1/agent/tickets/${tktNumberA}/status returns 403 Access Denied (BLOCKED)`);
  }

  // Clean up
  console.log('\n--- Cleaning Up Test Records ---');
  await TicketMessage.deleteMany({ ticketId: { $in: [ticketA.id || ticketA._id, ticketB.id || ticketB._id] } });
  await Notification.deleteMany({ recipient: { $in: [customerA._id, customerB._id, agent1._id, agent2._id] } });
  await Ticket.deleteMany({ _id: { $in: [ticketA.id || ticketA._id, ticketB.id || ticketB._id] } });
  await Category.deleteOne({ _id: testCategory._id });
  await User.deleteMany({ _id: { $in: [customerA._id, customerB._id, agent1._id, agent2._id] } });

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();

  console.log(`\n======================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
