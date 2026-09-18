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

const PORT = 5096;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let server;

function makeRequest(method, path, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING AGENT TICKET QUEUE TEST SUITE ---');
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

    // Setup Test Data
    const dummyPasswordHash = await hashPassword('Password123!');

    // Clean prior test fixtures
    await User.deleteMany({ email: /@test-agent-queue\.com$/ });
    await Category.deleteMany({ name: 'Agent Queue Test Cat' });
    await Ticket.deleteMany({ subject: /Agent Queue Test/ });

    // 1. Create Customer User
    const customer = await User.create({
      name: 'Queue Customer',
      email: 'customer@test-agent-queue.com',
      passwordHash: dummyPasswordHash,
      role: 'customer',
      isVerified: true,
    });

    // 2. Create Agent User
    const agent = await User.create({
      name: 'Queue Agent',
      email: 'agent@test-agent-queue.com',
      passwordHash: dummyPasswordHash,
      role: 'agent',
      isVerified: true,
    });

    // 3. Create Another Agent (for assignment test)
    const agent2 = await User.create({
      name: 'Assigned Agent',
      email: 'agent2@test-agent-queue.com',
      passwordHash: dummyPasswordHash,
      role: 'agent',
      isVerified: true,
    });

    // 4. Create Admin User
    const admin = await User.create({
      name: 'Queue Admin',
      email: 'admin@test-agent-queue.com',
      passwordHash: dummyPasswordHash,
      role: 'admin',
      isVerified: true,
    });

    // 5. Create Category
    const category = await Category.create({
      name: 'Agent Queue Test Cat',
      description: 'Category for testing agent queue',
    });

    // Generate JWT Tokens
    const customerToken = generateToken({ userId: customer._id.toString(), role: customer.role });
    const agentToken = generateToken({ userId: agent._id.toString(), role: agent.role });
    const adminToken = generateToken({ userId: admin._id.toString(), role: admin.role });

    // Seed Tickets:
    // Ticket 1: OPEN, unassigned
    const ticket1 = await Ticket.create({
      ticketNumber: 'TKT-AQ-001',
      customerId: customer._id,
      assignedTo: null,
      categoryId: category._id,
      subject: 'Agent Queue Test Ticket 1 (Oldest)',
      description: 'First available ticket in the queue',
      priority: 'MEDIUM',
      status: 'OPEN',
      createdAt: new Date(Date.now() - 30000),
    });

    // Ticket 2: OPEN, unassigned (Newer)
    const ticket2 = await Ticket.create({
      ticketNumber: 'TKT-AQ-002',
      customerId: customer._id,
      assignedTo: null,
      categoryId: category._id,
      subject: 'Agent Queue Test Ticket 2 (Newest)',
      description: 'Second available ticket in the queue',
      priority: 'HIGH',
      status: 'OPEN',
      createdAt: new Date(Date.now() - 10000),
    });

    // Ticket 3: OPEN, ASSIGNED to agent2 -> Must NOT be returned in available queue!
    const assignedTicket = await Ticket.create({
      ticketNumber: 'TKT-AQ-003',
      customerId: customer._id,
      assignedTo: agent2._id,
      categoryId: category._id,
      subject: 'Agent Queue Test Ticket 3 (Assigned)',
      description: 'This ticket is already assigned',
      priority: 'URGENT',
      status: 'OPEN',
    });

    // --- TEST 1: Unauthenticated request -> 401 ---
    const res1 = await makeRequest('GET', '/agent/queue');
    assert(res1.status === 401, '1. Unauthenticated request returns 401');
    assert(res1.body.success === false, '1b. Unauthenticated response success is false');

    // --- TEST 2: Customer role -> 403 ---
    const res2 = await makeRequest('GET', '/agent/queue', customerToken);
    assert(res2.status === 403, '2. Customer role receives 403 Forbidden');
    assert(res2.body.message && res2.body.message.includes('Forbidden'), '2b. Customer receives Forbidden message');

    // --- TEST 3: Admin role -> 403 ---
    const res3 = await makeRequest('GET', '/agent/queue', adminToken);
    assert(res3.status === 403, '3. Admin role receives 403 Forbidden');

    // --- TEST 4: Agent role -> 200 ---
    const res4 = await makeRequest('GET', '/agent/queue', agentToken);
    assert(res4.status === 200, '4. Agent receives 200 OK');
    assert(res4.body.success === true, '4b. Agent response success is true');

    // --- TEST 5: Agent receives real OPEN unassigned tickets ---
    const tickets = res4.body.data?.tickets || [];
    const queueTicketNumbers = tickets.map((t) => t.ticketNumber);
    assert(queueTicketNumbers.includes('TKT-AQ-001'), '5. Queue contains TKT-AQ-001');
    assert(queueTicketNumbers.includes('TKT-AQ-002'), '5b. Queue contains TKT-AQ-002');

    // --- TEST 6: Assigned tickets are not returned in available queue ---
    assert(!queueTicketNumbers.includes('TKT-AQ-003'), '6. Assigned ticket TKT-AQ-003 is NOT returned in available queue');

    // --- TEST 7: Pagination structure and calculations ---
    assert(res4.body.data?.pagination !== undefined, '7. Pagination metadata exists');
    assert(res4.body.data?.pagination?.page === 1, '7b. Default page is 1');
    assert(res4.body.data?.pagination?.limit === 10, '7c. Default limit is 10');

    // --- TEST 8: Invalid page (< 1) -> 400 ---
    const res8 = await makeRequest('GET', '/agent/queue?page=0', agentToken);
    assert(res8.status === 400, '8. Invalid page=0 returns 400');

    // Non-integer page -> 400
    const res8b = await makeRequest('GET', '/agent/queue?page=abc', agentToken);
    assert(res8b.status === 400, '8b. Non-integer page returns 400');

    // --- TEST 9: Invalid limit (< 1) -> 400 ---
    const res9 = await makeRequest('GET', '/agent/queue?limit=0', agentToken);
    assert(res9.status === 400, '9. Invalid limit=0 returns 400');

    // --- TEST 10: limit above maximum (> 50) -> 400 ---
    const res10 = await makeRequest('GET', '/agent/queue?limit=51', agentToken);
    assert(res10.status === 400, '10. limit=51 returns 400');

    // --- TEST 11: Tickets sorted newest first (createdAt: -1) ---
    const testTickets = tickets.filter((t) => t.ticketNumber === 'TKT-AQ-001' || t.ticketNumber === 'TKT-AQ-002');
    if (testTickets.length >= 2) {
      assert(testTickets[0].ticketNumber === 'TKT-AQ-002', '11. Newer ticket TKT-AQ-002 appears before older ticket TKT-AQ-001');
    } else {
      assert(false, '11. Could not verify sort order: test tickets missing');
    }

    // --- TEST 12: Customer information populated safely ---
    const ticketWithCustomer = tickets.find((t) => t.ticketNumber === 'TKT-AQ-002');
    assert(ticketWithCustomer?.customer?.name === 'Queue Customer', '12. Customer name is populated safely');
    assert(ticketWithCustomer?.customer?.email === 'customer@test-agent-queue.com', '12b. Customer email is populated safely');

    // --- TEST 13: Sensitive User fields not exposed ---
    assert(ticketWithCustomer?.customer?.passwordHash === undefined, '13. passwordHash is NOT exposed');
    assert(ticketWithCustomer?.customer?.password === undefined, '13b. password is NOT exposed');
    assert(ticketWithCustomer?.customer?.otp === undefined, '13c. otp is NOT exposed');

    // --- TEST 14: No mock/static ticket data is returned ---
    assert(ticketWithCustomer?.id === ticket2._id.toString(), '14. Ticket ID matches real MongoDB ObjectId');
    assert(ticketWithCustomer?.category?.name === 'Agent Queue Test Cat', '14b. Real Category name is populated from MongoDB');

    // Pagination query test
    const resPage = await makeRequest('GET', '/agent/queue?page=1&limit=1', agentToken);
    assert(resPage.status === 200, '15. Pagination query with limit=1 returns 200');
    assert(resPage.body.data?.tickets?.length === 1, '15b. Returned ticket count equals requested limit 1');
    assert(resPage.body.data?.pagination?.limit === 1, '15c. Pagination metadata reflects limit=1');

    console.log(`\n========================================`);
    console.log(`TOTAL PASSED: ${passedCount}`);
    console.log(`TOTAL FAILED: ${failedCount}`);
    console.log(`========================================\n`);

    if (failedCount > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Fatal error running agent queue tests:', error);
    process.exitCode = 1;
  } finally {
    try {
      await User.deleteMany({ email: /@test-agent-queue\.com$/ });
      await Category.deleteMany({ name: 'Agent Queue Test Cat' });
      await Ticket.deleteMany({ subject: /Agent Queue Test/ });
    } catch (cleanErr) {
      console.error('Cleanup error in agent queue tests:', cleanErr);
    }
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}


runTests();
