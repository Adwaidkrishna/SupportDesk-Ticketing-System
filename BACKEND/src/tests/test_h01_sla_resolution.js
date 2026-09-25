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
import { recordResolution } from '../services/sla/sla.service.js';
import { updateAgentTicketStatus } from '../services/ticket/agent/updateAgentTicketStatus.service.js';
import { updateTicketStatus } from '../services/admin/tickets/updateTicketStatus.service.js';
import { reopenTicket } from '../services/ticket/shared/reopenTicket.service.js';

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
  console.log('\n================================================================');
  console.log('--- H-01: SLA RESOLUTION TIMESTAMP STALE OVERWRITE TEST SUITE ---');
  console.log('================================================================\n');

  console.log('--- 1. Database Connection & Test Setup ---');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/supportdesk';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB.');

  const hashedPassword = await hashPassword('Password123!');
  const testSuffix = Date.now().toString().slice(-6);

  // Setup Users: Customer, Agent 1, Agent 2, Admin
  const customer = await User.create({
    name: `Cust H01 ${testSuffix}`,
    email: `cust_h01_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'customer',
    isEmailVerified: true,
    isActive: true,
  });

  const agent1 = await User.create({
    name: `Agent1 H01 ${testSuffix}`,
    email: `agent1_h01_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'agent',
    department: 'Support',
    availability: 'Available',
    isEmailVerified: true,
    isActive: true,
  });

  const agent2 = await User.create({
    name: `Agent2 H01 ${testSuffix}`,
    email: `agent2_h01_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'agent',
    department: 'Billing',
    availability: 'Available',
    isEmailVerified: true,
    isActive: true,
  });

  const admin = await User.create({
    name: `Admin H01 ${testSuffix}`,
    email: `admin_h01_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'admin',
    isEmailVerified: true,
    isActive: true,
  });

  const category = await Category.create({
    name: `Cat_H01_${testSuffix}`,
    description: 'Category for testing H-01 SLA resolution persistence',
    isActive: true,
  });

  const tokenCust = generateToken({ userId: customer._id.toString(), role: 'customer' });
  const tokenAgent1 = generateToken({ userId: agent1._id.toString(), role: 'agent' });
  const tokenAgent2 = generateToken({ userId: agent2._id.toString(), role: 'agent' });
  const tokenAdmin = generateToken({ userId: admin._id.toString(), role: 'admin' });

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

  console.log('\n--- 2. Unit Verification of recordResolution In-Memory Support ---');

  // Test 2.1: recordResolution with in-memory document and save: false
  {
    const mockTicket = new Ticket({
      ticketNumber: `TKT-MOCK-${testSuffix}`,
      customerId: customer._id,
      categoryId: category._id,
      subject: 'Mock ticket for unit check',
      description: 'Testing in-memory resolution',
      status: 'IN_PROGRESS',
      sla: {
        resolutionDeadline: new Date(Date.now() + 3600000), // 1 hour in future
        resolvedAt: null,
        resolutionBreached: false,
        isBreached: false,
      },
    });

    const resolvedDoc = await recordResolution(mockTicket, { save: false });
    assert(resolvedDoc.sla.resolvedAt instanceof Date, 'recordResolution sets resolvedAt on in-memory doc');
    assert(resolvedDoc.sla.resolutionBreached === false, 'recordResolution marks resolutionBreached=false when within deadline');
    assert(mockTicket.isNew, 'Mock ticket was not saved to MongoDB when save: false');
  }

  // Test 2.2: recordResolution with in-memory document when resolution is breached
  {
    const mockLateTicket = new Ticket({
      ticketNumber: `TKT-LATE-${testSuffix}`,
      customerId: customer._id,
      categoryId: category._id,
      subject: 'Mock late ticket',
      description: 'Testing breach detection',
      status: 'IN_PROGRESS',
      sla: {
        resolutionDeadline: new Date(Date.now() - 3600000), // 1 hour in past
        resolvedAt: null,
        resolutionBreached: false,
        isBreached: false,
      },
    });

    await recordResolution(mockLateTicket, { save: false });
    assert(mockLateTicket.sla.resolvedAt instanceof Date, 'Late ticket resolvedAt is set');
    assert(mockLateTicket.sla.resolutionBreached === true, 'Late ticket resolutionBreached is marked true');
    assert(mockLateTicket.sla.isBreached === true, 'Late ticket isBreached is marked true');
  }

  console.log('\n--- 3. Test 1 & 2: Agent Resolves Ticket & sla.resolvedAt Persists in MongoDB ---');

  // Create ticket for agent test
  let agentTestTicket;
  {
    const resCreate = await makeRequest(
      '/api/v1/tickets',
      'POST',
      {
        subject: 'Agent resolution test ticket',
        description: 'Verify sla.resolvedAt persistence in MongoDB after agent resolution.',
        categoryId: category._id.toString(),
        priority: 'MEDIUM',
      },
      tokenCust
    );
    assert(resCreate.status === 201, 'Customer creates test ticket');
    agentTestTicket = resCreate.body.data.ticket;
  }

  // Agent 1 claims ticket -> status becomes IN_PROGRESS
  {
    const resClaim = await makeRequest(
      `/api/v1/agent/tickets/${agentTestTicket.ticketNumber}/claim`,
      'POST',
      null,
      tokenAgent1
    );
    assert(resClaim.status === 200 && resClaim.body.data.status === 'IN_PROGRESS', 'Agent 1 claims ticket');
  }

  // Verify before resolution: resolvedAt is null in MongoDB
  {
    const rawBefore = await Ticket.findById(agentTestTicket.id || agentTestTicket._id).lean();
    assert(rawBefore.status === 'IN_PROGRESS', 'Ticket is IN_PROGRESS before resolution');
    assert(rawBefore.sla.resolvedAt === null, 'Ticket sla.resolvedAt is initially null in MongoDB');
  }

  // Agent 1 resolves ticket via HTTP endpoint (PATCH /api/v1/agent/tickets/:ticketId/status)
  let resolvedAtFromResponse;
  {
    const resResolve = await makeRequest(
      `/api/v1/agent/tickets/${agentTestTicket.ticketNumber}/status`,
      'PATCH',
      { status: 'RESOLVED' },
      tokenAgent1
    );
    assert(resResolve.status === 200, 'Agent 1 resolves ticket via HTTP endpoint (200 OK)');
    const ticketData = resResolve.body.data?.ticket;
    assert(ticketData?.status === 'RESOLVED', 'Response payload status is RESOLVED');
    assert(Boolean(ticketData?.sla?.resolvedAt), `Response payload sla.resolvedAt is non-null: ${ticketData?.sla?.resolvedAt}`);
    resolvedAtFromResponse = ticketData?.sla?.resolvedAt;
  }

  // Test 2 (CRITICAL): Re-fetch directly from MongoDB to ensure timestamp was NOT overwritten with null!
  {
    const rawAfter = await Ticket.findById(agentTestTicket.id || agentTestTicket._id).lean();
    assert(rawAfter.status === 'RESOLVED', 'MongoDB document status is RESOLVED');
    assert(rawAfter.sla !== null && rawAfter.sla.resolvedAt !== null, 'MongoDB document sla.resolvedAt is NOT null');
    assert(rawAfter.sla.resolvedAt instanceof Date, 'MongoDB document sla.resolvedAt is a valid Date instance');

    const mongoTime = new Date(rawAfter.sla.resolvedAt).toISOString();
    const respTime = new Date(resolvedAtFromResponse).toISOString();
    assert(mongoTime === respTime, `MongoDB persisted timestamp (${mongoTime}) matches response timestamp (${respTime})`);
  }

  console.log('\n--- 4. Test 3: Admin Resolves Ticket & sla.resolvedAt Persists in MongoDB ---');

  // Create ticket for admin test
  let adminTestTicket;
  {
    const resCreate = await makeRequest(
      '/api/v1/tickets',
      'POST',
      {
        subject: 'Admin resolution test ticket',
        description: 'Verify sla.resolvedAt persistence in MongoDB after admin resolution.',
        categoryId: category._id.toString(),
        priority: 'HIGH',
      },
      tokenCust
    );
    assert(resCreate.status === 201, 'Customer creates second test ticket');
    adminTestTicket = resCreate.body.data.ticket;
  }

  // Admin resolves ticket directly via admin endpoint (PATCH /api/v1/admin/tickets/:ticketId/status)
  let adminResolvedAtResponse;
  {
    const resAdminResolve = await makeRequest(
      `/api/v1/admin/tickets/${adminTestTicket.ticketNumber}/status`,
      'PATCH',
      { status: 'RESOLVED' },
      tokenAdmin
    );
    assert(resAdminResolve.status === 200, 'Admin resolves ticket via HTTP endpoint (200 OK)');
    const ticketData = resAdminResolve.body.data?.ticket;
    assert(ticketData?.status === 'RESOLVED', 'Admin response payload status is RESOLVED');
    assert(Boolean(ticketData?.sla?.resolvedAt), `Admin response payload sla.resolvedAt is non-null: ${ticketData?.sla?.resolvedAt}`);
    adminResolvedAtResponse = ticketData?.sla?.resolvedAt;
  }

  // Test 3 Verification: Fetch directly from MongoDB
  {
    const rawAdminTicket = await Ticket.findById(adminTestTicket.id || adminTestTicket._id).lean();
    assert(rawAdminTicket.status === 'RESOLVED', 'Admin resolved ticket status in MongoDB is RESOLVED');
    assert(rawAdminTicket.sla.resolvedAt !== null, 'Admin resolved ticket sla.resolvedAt in MongoDB is NOT null');
    assert(rawAdminTicket.sla.resolvedAt instanceof Date, 'Admin resolved ticket sla.resolvedAt is a Date in MongoDB');

    const mongoAdminTime = new Date(rawAdminTicket.sla.resolvedAt).toISOString();
    const respAdminTime = new Date(adminResolvedAtResponse).toISOString();
    assert(mongoAdminTime === respAdminTime, `Admin MongoDB timestamp (${mongoAdminTime}) matches response (${respAdminTime})`);
  }

  console.log('\n--- 5. Test 4: Reopen Ticket Preserves State ---');

  // Reopen agentTestTicket (currently RESOLVED) -> IN_PROGRESS
  {
    const resReopen = await makeRequest(
      `/api/v1/tickets/${agentTestTicket.ticketNumber}/reopen`,
      'PATCH',
      null,
      tokenCust
    );
    assert(resReopen.status === 200, 'Customer reopens RESOLVED ticket (200 OK)');
    const reopenedData = resReopen.body.data?.ticket;
    assert(reopenedData?.status === 'IN_PROGRESS', 'Reopened ticket status is IN_PROGRESS');
  }

  // Check MongoDB document after reopen
  {
    const rawReopened = await Ticket.findById(agentTestTicket.id || agentTestTicket._id).lean();
    assert(rawReopened.status === 'IN_PROGRESS', 'MongoDB document status after reopen is IN_PROGRESS');
    assert(rawReopened.sla.resolvedAt !== null, 'Original resolvedAt timestamp is preserved after reopen');
  }

  console.log('\n--- 6. Test 5: Authorization & Regression Verification ---');

  // 6.1: Unauthorized Agent 2 cannot resolve Agent 1's ticket -> 403
  {
    // First set ticket back to IN_PROGRESS directly or use agentTestTicket
    const resForbidden = await makeRequest(
      `/api/v1/agent/tickets/${agentTestTicket.ticketNumber}/status`,
      'PATCH',
      { status: 'RESOLVED' },
      tokenAgent2
    );
    assert(resForbidden.status === 403, 'Unauthorized Agent 2 cannot update status of Agent 1 ticket (403 Forbidden)');
  }

  // 6.2: Customer cannot call agent status endpoint -> 403
  {
    const resCustForbidden = await makeRequest(
      `/api/v1/agent/tickets/${agentTestTicket.ticketNumber}/status`,
      'PATCH',
      { status: 'RESOLVED' },
      tokenCust
    );
    assert(resCustForbidden.status === 403, 'Customer cannot access agent status route (403 Forbidden)');
  }

  // 6.3: Agent cannot resolve already RESOLVED ticket without reopening (transition check)
  {
    // Resolve agentTestTicket with Agent 1
    const resResolveAgain = await makeRequest(
      `/api/v1/agent/tickets/${agentTestTicket.ticketNumber}/status`,
      'PATCH',
      { status: 'RESOLVED' },
      tokenAgent1
    );
    assert(resResolveAgain.status === 200, 'Agent 1 re-resolves ticket to RESOLVED');

    // Attempting to resolve again when already RESOLVED -> 400
    const resInvalidTransition = await makeRequest(
      `/api/v1/agent/tickets/${agentTestTicket.ticketNumber}/status`,
      'PATCH',
      { status: 'RESOLVED' },
      tokenAgent1
    );
    assert(resInvalidTransition.status === 400, 'Resolving an already RESOLVED ticket is rejected with 400 (only IN_PROGRESS allowed)');
  }

  // 6.4: C-01 resolution using ObjectId works seamlessly
  {
    const resResolveObjId = await makeRequest(
      `/api/v1/admin/tickets/${adminTestTicket.id || adminTestTicket._id}/status`,
      'PATCH',
      { status: 'CLOSED' },
      tokenAdmin
    );
    assert(resResolveObjId.status === 200 && resResolveObjId.body.data.ticket.status === 'CLOSED', 'Admin updates status via ObjectId parameter (C-01 compatibility)');
  }

  // 6.5: Direct service calls (without HTTP) function correctly
  {
    const directTicket = await Ticket.create({
      ticketNumber: `TKT-DIR-${testSuffix}`,
      customerId: customer._id,
      assignedTo: agent1._id,
      categoryId: category._id,
      subject: 'Direct service update ticket',
      description: 'Testing updateAgentTicketStatus directly',
      status: 'IN_PROGRESS',
      sla: {
        resolutionDeadline: new Date(Date.now() + 7200000),
        resolvedAt: null,
        resolutionBreached: false,
        isBreached: false,
      },
    });

    const updatedDirect = await updateAgentTicketStatus(directTicket._id.toString(), agent1._id.toString(), 'RESOLVED');
    assert(updatedDirect.status === 'RESOLVED', 'Direct updateAgentTicketStatus call sets status to RESOLVED');
    assert(updatedDirect.sla.resolvedAt instanceof Date, 'Direct updateAgentTicketStatus returns Date resolvedAt');

    const reloadedDirect = await Ticket.findById(directTicket._id).lean();
    assert(reloadedDirect.sla.resolvedAt !== null, 'Directly updated ticket has non-null resolvedAt in MongoDB');
  }

  // Clean up
  console.log('\n--- Cleaning Up Test Records ---');
  await TicketMessage.deleteMany({ senderId: { $in: [customer._id, agent1._id, agent2._id, admin._id] } });
  await Notification.deleteMany({ recipient: { $in: [customer._id, agent1._id, agent2._id, admin._id] } });
  await Ticket.deleteMany({ customerId: customer._id });
  await Category.deleteOne({ _id: category._id });
  await User.deleteMany({ _id: { $in: [customer._id, agent1._id, agent2._id, admin._id] } });

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();

  console.log(`\n================================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
