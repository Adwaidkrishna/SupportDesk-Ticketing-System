import 'dotenv/config';
import mongoose from 'mongoose';
import http from 'http';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Ticket from '../src/models/Ticket.js';
import { generateToken } from '../src/utils/jwt.util.js';
import { hashPassword } from '../src/utils/hash.util.js';

const BASE_URL = 'http://localhost:5000/api/v1';

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

async function runAssignedTicketsTests() {
  console.log('--- STARTING AGENT ASSIGNED TICKETS TEST SUITE ---\n');

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

  const cleanupUserIds = [];
  const cleanupTicketIds = [];
  const cleanupCategoryIds = [];

  try {
    await connectDB();

    // 1. Verify Development Ticket TKT-000002
    console.log('1. Checking Development Ticket TKT-000002 in MongoDB...');
    const tkt2 = await Ticket.findOne({ ticketNumber: 'TKT-000002' });
    assert(Boolean(tkt2), 'TKT-000002 exists in database');
    assert(tkt2 && tkt2.status === 'IN_PROGRESS', `TKT-000002 status is IN_PROGRESS (actual: ${tkt2?.status})`);
    assert(Boolean(tkt2 && tkt2.assignedTo), `TKT-000002 is assigned to an agent (assignedTo: ${tkt2?.assignedTo})`);

    const alexAgentId = tkt2.assignedTo.toString();
    const alexToken = generateToken({ userId: alexAgentId, role: 'agent' });

    // 2. Test Available Tickets Queue: TKT-000002 must NOT appear
    console.log('\n2. Testing Available Tickets Queue (/api/v1/agent/queue)...');
    const queueRes = await makeRequest('GET', '/agent/queue', null, alexToken);
    assert(queueRes.status === 200, `Queue endpoint returned 200 (status: ${queueRes.status})`);
    const queueTickets = queueRes.body?.data?.tickets || [];
    const tkt2InQueue = queueTickets.some((t) => t.ticketNumber === 'TKT-000002');
    assert(!tkt2InQueue, 'TKT-000002 does NOT appear in Available Tickets queue (correctly filtered out)');

    // 3. Test My Assigned Tickets: TKT-000002 MUST appear for Agent Alex
    console.log('\n3. Testing My Assigned Tickets (/api/v1/agent/my-tickets) for assigned Agent Alex...');
    const myTicketsRes = await makeRequest('GET', '/agent/my-tickets', null, alexToken);
    assert(myTicketsRes.status === 200, `My Assigned Tickets returned 200 (status: ${myTicketsRes.status})`);
    const assignedTickets = myTicketsRes.body?.data?.tickets || [];
    const tkt2InAssigned = assignedTickets.find((t) => t.ticketNumber === 'TKT-000002');
    assert(Boolean(tkt2InAssigned), 'TKT-000002 appears in My Assigned Tickets for Agent Alex');
    assert(tkt2InAssigned && tkt2InAssigned.status === 'IN_PROGRESS', 'TKT-000002 has status IN_PROGRESS in assigned tickets');
    assert(Boolean(tkt2InAssigned && tkt2InAssigned.customer?.name), 'TKT-000002 includes populated customer info');
    assert(Boolean(tkt2InAssigned && tkt2InAssigned.category?.name), 'TKT-000002 includes populated category info');

    // 4. Create Agent B and verify Agent B cannot see TKT-000002
    console.log('\n4. Testing Agent B Isolation...');
    const hashedPassword = await hashPassword('SecurePass123!');
    const agentB = await User.create({
      name: 'Agent Bob Test',
      email: `agent_b_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(agentB._id);

    const agentBToken = generateToken({ userId: agentB._id, role: 'agent' });
    const agentBRes = await makeRequest('GET', '/agent/my-tickets', null, agentBToken);
    assert(agentBRes.status === 200, `Agent B assigned tickets returned 200`);
    const agentBTickets = agentBRes.body?.data?.tickets || [];
    const tkt2InAgentB = agentBTickets.some((t) => t.ticketNumber === 'TKT-000002');
    assert(!tkt2InAgentB, 'Agent B does NOT see TKT-000002 in their assigned tickets (Agent Isolation passed)');

    // 5. Verify client cannot spoof agent identity via query parameters
    console.log('\n5. Testing Query Parameter Spoofing Prevention...');
    const spoofRes = await makeRequest('GET', `/agent/my-tickets?agentId=${alexAgentId}&userId=${alexAgentId}`, null, agentBToken);
    assert(spoofRes.status === 200, `Spoof attempt returned 200`);
    const spoofTickets = spoofRes.body?.data?.tickets || [];
    const tkt2InSpoof = spoofTickets.some((t) => t.ticketNumber === 'TKT-000002');
    assert(!tkt2InSpoof, 'Spoofing agentId in query parameters is ignored (server uses JWT identity)');

    // 6. Test isolated ticket assigned to Agent B
    console.log('\n6. Testing dedicated ticket assigned to Agent B...');
    const cat = await Category.create({
      name: `Category Test ${Date.now()}`,
      description: 'Test category',
    });
    cleanupCategoryIds.push(cat._id);

    const bTicket = await Ticket.create({
      ticketNumber: `TKT-B-${Date.now().toString().slice(-4)}`,
      customerId: tkt2.customerId,
      categoryId: cat._id,
      subject: 'Agent B Exclusive Ticket',
      description: 'Ticket assigned strictly to Agent B',
      status: 'OPEN',
      priority: 'HIGH',
      assignedTo: agentB._id,
    });
    cleanupTicketIds.push(bTicket._id);

    const agentBUpdatedRes = await makeRequest('GET', '/agent/my-tickets', null, agentBToken);
    const agentBUpdatedTickets = agentBUpdatedRes.body?.data?.tickets || [];
    assert(
      agentBUpdatedTickets.some((t) => t.ticketNumber === bTicket.ticketNumber),
      'Agent B sees their newly assigned ticket'
    );

    const alexCheckRes = await makeRequest('GET', '/agent/my-tickets', null, alexToken);
    const alexUpdatedTickets = alexCheckRes.body?.data?.tickets || [];
    assert(
      !alexUpdatedTickets.some((t) => t.ticketNumber === bTicket.ticketNumber),
      'Agent Alex does NOT see Agent B exclusive ticket (Strict Mutual Isolation passed)'
    );

    // 7. Non-agent (Customer) cannot access /agent/my-tickets
    console.log('\n7. Testing RBAC on /agent/my-tickets...');
    const customerToken = generateToken({ userId: tkt2.customerId, role: 'customer' });
    const rbacRes = await makeRequest('GET', '/agent/my-tickets', null, customerToken);
    assert(rbacRes.status === 403, `Customer access to /agent/my-tickets rejected with 403 (status: ${rbacRes.status})`);

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    console.log('\n--- CLEANING UP TEST FIXTURES (PRESERVING TKT-000002) ---');
    if (cleanupTicketIds.length > 0) {
      await Ticket.deleteMany({ _id: { $in: cleanupTicketIds } });
    }
    if (cleanupCategoryIds.length > 0) {
      await Category.deleteMany({ _id: { $in: cleanupCategoryIds } });
    }
    if (cleanupUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: cleanupUserIds } });
    }
    await mongoose.disconnect();

    console.log(`\n========================================`);
    console.log(`MY ASSIGNED TICKETS RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`========================================`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runAssignedTicketsTests();
