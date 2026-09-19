import 'dotenv/config';
import mongoose from 'mongoose';
import http from 'http';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Ticket from '../src/models/Ticket.js';
import { generateToken } from '../src/utils/jwt.util.js';
import { hashPassword } from '../src/utils/hash.util.js';

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let server;

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const postData = data ? JSON.stringify(data) : '';

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (data) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, rawBody: body });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (data) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING AGENT TICKET CLAIM INTEGRATION TEST SUITE ---');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASSED: ${message}`);
      passedCount++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      failedCount++;
    }
  }

  try {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`Test server listening on port ${PORT}`);

    // Clean prior test fixtures
    await User.deleteMany({ email: /@test-agent-claim\.com$/ });
    await Category.deleteMany({ name: 'Claim Test Cat' });
    await Ticket.deleteMany({ subject: /Claim Test Ticket/ });

    const dummyPasswordHash = await hashPassword('Password123!');

    // 1. Create Agent 1
    const agent1 = await User.create({
      name: 'Claim Agent One',
      email: 'agent1@test-agent-claim.com',
      passwordHash: dummyPasswordHash,
      role: 'agent',
      isVerified: true,
    });

    // 2. Create Agent 2
    const agent2 = await User.create({
      name: 'Claim Agent Two',
      email: 'agent2@test-agent-claim.com',
      passwordHash: dummyPasswordHash,
      role: 'agent',
      isVerified: true,
    });

    // 3. Create Customer
    const customer = await User.create({
      name: 'Claim Customer',
      email: 'customer@test-agent-claim.com',
      passwordHash: dummyPasswordHash,
      role: 'customer',
      isVerified: true,
    });

    // 4. Create Admin
    const admin = await User.create({
      name: 'Claim Admin',
      email: 'admin@test-agent-claim.com',
      passwordHash: dummyPasswordHash,
      role: 'admin',
      isVerified: true,
    });

    // 5. Create Category
    const category = await Category.create({
      name: 'Claim Test Cat',
      description: 'Category for testing ticket claiming',
    });

    // Generate JWT Tokens
    const agent1Token = generateToken({ userId: agent1._id.toString(), role: agent1.role });
    const agent2Token = generateToken({ userId: agent2._id.toString(), role: agent2.role });
    const customerToken = generateToken({ userId: customer._id.toString(), role: customer.role });
    const adminToken = generateToken({ userId: admin._id.toString(), role: admin.role });

    // Seed Tickets:
    // Ticket 1: OPEN and unassigned
    const ticket1 = await Ticket.create({
      ticketNumber: 'TKT-CLM-001',
      customerId: customer._id,
      categoryId: category._id,
      subject: 'Claim Test Ticket 1 (Standard Claim)',
      description: 'Test ticket for normal claiming flow',
      priority: 'HIGH',
      status: 'OPEN',
      assignedTo: null,
    });

    // Ticket 2: OPEN and unassigned for Race Condition testing
    const ticket2 = await Ticket.create({
      ticketNumber: 'TKT-CLM-002',
      customerId: customer._id,
      categoryId: category._id,
      subject: 'Claim Test Ticket 2 (Concurrent Race)',
      description: 'Test ticket for concurrent atomic race claiming',
      priority: 'MEDIUM',
      status: 'OPEN',
      assignedTo: null,
    });

    // Ticket 3: Already IN_PROGRESS (non-OPEN)
    const ticket3 = await Ticket.create({
      ticketNumber: 'TKT-CLM-003',
      customerId: customer._id,
      categoryId: category._id,
      subject: 'Claim Test Ticket 3 (Already IN_PROGRESS)',
      description: 'Test ticket with IN_PROGRESS status',
      priority: 'LOW',
      status: 'IN_PROGRESS',
      assignedTo: null,
    });

    // Ticket 4: Already assigned to Agent 1
    const ticket4 = await Ticket.create({
      ticketNumber: 'TKT-CLM-004',
      customerId: customer._id,
      categoryId: category._id,
      subject: 'Claim Test Ticket 4 (Already Assigned)',
      description: 'Test ticket that is already assigned',
      priority: 'URGENT',
      status: 'OPEN',
      assignedTo: agent1._id,
    });

    // Ticket 5: For body spoofing test
    const ticket5 = await Ticket.create({
      ticketNumber: 'TKT-CLM-005',
      customerId: customer._id,
      categoryId: category._id,
      subject: 'Claim Test Ticket 5 (Body Spoof Test)',
      description: 'Test ticket for checking agentId in body is ignored',
      priority: 'MEDIUM',
      status: 'OPEN',
      assignedTo: null,
    });

    // --- TEST 1: Unauthenticated request -> 401
    const res1 = await makeRequest('POST', `/agent/tickets/${ticket1._id}/claim`, null, null);
    assert(res1.status === 401, '1. Unauthenticated request to claim endpoint returns 401 Unauthorized');

    // --- TEST 2: Customer attempting claim -> 403
    const res2 = await makeRequest('POST', `/agent/tickets/${ticket1._id}/claim`, null, customerToken);
    assert(res2.status === 403, '2. Customer attempting to claim ticket returns 403 Forbidden');

    // --- TEST 3: Admin attempting claim -> 403 (agent-only route)
    const res3 = await makeRequest('POST', `/agent/tickets/${ticket1._id}/claim`, null, adminToken);
    assert(res3.status === 403, '3. Admin attempting to claim ticket returns 403 Forbidden');

    // --- TEST 4: Agent 1 claims OPEN unassigned ticket -> 200
    const res4 = await makeRequest('POST', `/agent/tickets/${ticket1._id}/claim`, null, agent1Token);
    assert(res4.status === 200, '4. Agent successfully claims OPEN unassigned ticket (200 OK)');
    assert(res4.body?.success === true, '4b. Response contains success: true');

    const data4 = res4.body?.data?.ticket || res4.body?.data;

    // --- TEST 5: assignedTo becomes authenticated Agent 1
    assert(
      data4?.assignedTo?.id === agent1._id.toString() || data4?.assignedTo?._id === agent1._id.toString(),
      `5. assignedTo matches authenticated agent ID (got: "${data4?.assignedTo?.id}")`
    );
    assert(
      data4?.assignedTo?.name === 'Claim Agent One' && data4?.assignedTo?.email === 'agent1@test-agent-claim.com',
      `5b. assignedTo populated with agent name and email`
    );

    // --- TEST 6: status changes from OPEN -> IN_PROGRESS
    assert(data4?.status === 'IN_PROGRESS', `6. Status changed to IN_PROGRESS (got: "${data4?.status}")`);

    // --- TEST 7-12: Integrity of other fields
    assert(data4?.ticketNumber === 'TKT-CLM-001', `7. ticketNumber remains unchanged ("${data4?.ticketNumber}")`);
    assert(data4?.subject === 'Claim Test Ticket 1 (Standard Claim)', `8. subject remains unchanged`);
    assert(data4?.description === 'Test ticket for normal claiming flow', `9. description remains unchanged`);
    assert(data4?.priority === 'HIGH', `10. priority remains unchanged`);
    assert(data4?.category?.name === 'Claim Test Cat', `11. category details remain unchanged`);
    assert(data4?.customer?.email === 'customer@test-agent-claim.com', `12. customer details remain unchanged`);

    // --- TEST 13: Agent ID cannot be supplied by request body (Body Spoofing Prevention)
    // Agent 1 passes { agentId: agent2._id } in body, but authenticated as Agent 1
    const res13 = await makeRequest('POST', `/agent/tickets/${ticket5._id}/claim`, { agentId: agent2._id.toString() }, agent1Token);
    const data13 = res13.body?.data?.ticket || res13.body?.data;
    assert(
      res13.status === 200 && data13?.assignedTo?.id === agent1._id.toString(),
      '13. Request body agentId is ignored; ticket strictly assigned to JWT agent identity'
    );

    // --- TEST 14: Invalid ObjectId -> 400
    const res14 = await makeRequest('POST', '/agent/tickets/invalid-id-format/claim', null, agent1Token);
    assert(res14.status === 400, '14. Invalid ticket ObjectId returns 400 Bad Request');

    // --- TEST 15: Non-existent ticket -> 404
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res15 = await makeRequest('POST', `/agent/tickets/${nonExistentId}/claim`, null, agent1Token);
    assert(res15.status === 404, '15. Non-existent ticket returns 404 Not Found');

    // --- TEST 16: Already assigned ticket -> 409
    const res16 = await makeRequest('POST', `/agent/tickets/${ticket4._id}/claim`, null, agent2Token);
    assert(res16.status === 409, '16. Already assigned ticket returns 409 Conflict');

    // --- TEST 17: Non-OPEN ticket -> 409
    const res17 = await makeRequest('POST', `/agent/tickets/${ticket3._id}/claim`, null, agent1Token);
    assert(res17.status === 409, '17. Non-OPEN ticket returns 409 Conflict');

    // --- TEST 18: Second agent cannot claim already claimed ticket -> 409
    const res18 = await makeRequest('POST', `/agent/tickets/${ticket1._id}/claim`, null, agent2Token);
    assert(res18.status === 409, '18. Second agent attempting to claim already claimed ticket returns 409 Conflict');

    // --- TEST 19: Concurrent race-condition safety with Promise.all
    // Agent 1 and Agent 2 attempt to claim Ticket 2 at the EXACT same time
    const [raceRes1, raceRes2] = await Promise.all([
      makeRequest('POST', `/agent/tickets/${ticket2._id}/claim`, null, agent1Token),
      makeRequest('POST', `/agent/tickets/${ticket2._id}/claim`, null, agent2Token),
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    assert(
      statuses[0] === 200 && statuses[1] === 409,
      `19. Atomic race condition test: exactly ONE agent receives 200 OK and ONE receives 409 Conflict (got ${raceRes1.status} and ${raceRes2.status})`
    );

    // Verify DB state of Ticket 2 has only one valid agent assigned
    const dbTicket2 = await Ticket.findById(ticket2._id).lean();
    const winningAgentId = raceRes1.status === 200 ? agent1._id.toString() : agent2._id.toString();
    assert(
      dbTicket2.assignedTo.toString() === winningAgentId && dbTicket2.status === 'IN_PROGRESS',
      '19b. Database state confirms ticket assigned exclusively to the race winner'
    );

    // --- TEST 20: Verify no sensitive credentials exposed
    const customerObj = data4?.customer || {};
    const assignedObj = data4?.assignedTo || {};
    const hasSensitive =
      customerObj.password !== undefined ||
      customerObj.passwordHash !== undefined ||
      customerObj.otp !== undefined ||
      assignedObj.password !== undefined ||
      assignedObj.passwordHash !== undefined;
    assert(!hasSensitive, '20. No password/passwordHash/otp or sensitive authentication data returned');

    // Clean up temporary fixtures
    await User.deleteMany({ email: /@test-agent-claim\.com$/ });
    await Category.deleteMany({ name: 'Claim Test Cat' });
    await Ticket.deleteMany({ subject: /Claim Test Ticket/ });

  } catch (err) {
    console.error('Test error:', err);
    failedCount++;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.connection.close();
    console.log(`\n========================================`);
    console.log(`TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
    console.log(`========================================\n`);

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests();
