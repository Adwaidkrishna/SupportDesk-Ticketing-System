import 'dotenv/config';
import mongoose from 'mongoose';
import http from 'http';
import { io } from '../../FRONTEND/node_modules/socket.io-client/build/esm/index.js';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Ticket from '../src/models/Ticket.js';
import TicketMessage from '../src/models/TicketMessage.js';
import { generateToken } from '../src/utils/jwt.util.js';
import { hashPassword } from '../src/utils/hash.util.js';

const BASE_URL = 'http://127.0.0.1:5000/api/v1';
const SOCKET_URL = 'http://127.0.0.1:5000';

async function makeRequest(method, path, data = null, token = null, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
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
    } catch (err) {
      if (err.code === 'ECONNREFUSED' && attempt < retries) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      throw err;
    }
  }
}

function createClientSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
}

async function runTicketLifecycleTests() {
  console.log('--- STARTING COMPREHENSIVE TICKET LIFECYCLE TEST SUITE ---\n');

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
  const cleanupMessageIds = [];

  try {
    await connectDB();
    const hashedPassword = await hashPassword('SecurePass123!');

    // 1. Create Test Fixtures
    const customerA = await User.create({
      name: 'Customer A LC',
      email: `custA_lc_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(customerA._id);

    const customerB = await User.create({
      name: 'Customer B LC',
      email: `custB_lc_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(customerB._id);

    const agentA = await User.create({
      name: 'Agent A LC',
      email: `agentA_lc_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(agentA._id);

    const agentB = await User.create({
      name: 'Agent B LC',
      email: `agentB_lc_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(agentB._id);

    const admin = await User.create({
      name: 'Admin LC',
      email: `admin_lc_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'admin',
      isVerified: true,
    });
    cleanupUserIds.push(admin._id);

    const customerAToken = generateToken({ userId: customerA._id, role: 'customer' });
    const customerBToken = generateToken({ userId: customerB._id, role: 'customer' });
    const agentAToken = generateToken({ userId: agentA._id, role: 'agent' });
    const agentBToken = generateToken({ userId: agentB._id, role: 'agent' });
    const adminToken = generateToken({ userId: admin._id, role: 'admin' });

    const category = await Category.create({
      name: `Category LC ${Date.now()}`,
      description: 'Test category',
    });
    cleanupCategoryIds.push(category._id);

    // Create Test Tickets
    // Ticket 1: Customer A, Assigned to Agent A, Status: IN_PROGRESS
    const ticket1 = await Ticket.create({
      ticketNumber: `TKT-LC1-${Date.now().toString().slice(-4)}`,
      customerId: customerA._id,
      categoryId: category._id,
      subject: 'Lifecycle Ticket 1',
      description: 'Active ticket for resolve/close tests',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assignedTo: agentA._id,
    });
    cleanupTicketIds.push(ticket1._id);

    // Ticket 2: Customer A, Unassigned, Status: OPEN
    const ticket2 = await Ticket.create({
      ticketNumber: `TKT-LC2-${Date.now().toString().slice(-4)}`,
      customerId: customerA._id,
      categoryId: category._id,
      subject: 'Lifecycle Ticket 2 (Open Unassigned)',
      description: 'Open ticket to test invalid direct transitions',
      status: 'OPEN',
      priority: 'MEDIUM',
      assignedTo: null,
    });
    cleanupTicketIds.push(ticket2._id);

    // =========================================================================
    // SECTION A: RESOLVE STATUS TRANSITION & RBAC
    // =========================================================================
    console.log('--- SECTION A: RESOLVE STATUS TRANSITIONS & RBAC ---');

    // 1. Customer cannot resolve
    const resCustResolve = await makeRequest('PATCH', `/agent/tickets/${ticket1._id}/status`, { status: 'RESOLVED' }, customerAToken);
    assert(resCustResolve.status === 403, 'Customer attempting to call agent status endpoint returns 403 Forbidden');

    // 2. Unassigned / Wrong agent cannot resolve
    const resAgentBResolve = await makeRequest('PATCH', `/agent/tickets/${ticket1._id}/status`, { status: 'RESOLVED' }, agentBToken);
    assert(resAgentBResolve.status === 403, 'Unassigned / Wrong Agent B attempting to resolve ticket1 returns 403 Forbidden');

    // 3. OPEN ticket cannot directly resolve
    const resOpenResolve = await makeRequest('PATCH', `/agent/tickets/${ticket2._id}/status`, { status: 'RESOLVED' }, agentAToken);
    assert(resOpenResolve.status === 403 || resOpenResolve.status === 400, 'OPEN unassigned ticket cannot directly transition to RESOLVED');

    // 4. Invalid status in request body returns 400
    const resInvalidStatus = await makeRequest('PATCH', `/agent/tickets/${ticket1._id}/status`, { status: 'REJECTED' }, agentAToken);
    assert(resInvalidStatus.status === 400, 'Rejecting status outside [RESOLVED, CLOSED] returns 400 Bad Request');

    // 5. Connect Agent A & Customer A sockets to test real-time ticket:status event emission
    console.log('\nConnecting Sockets to test real-time ticket:status broadcast on Resolve...');
    const agentASocket = await createClientSocket(agentAToken);
    const customerASocket = await createClientSocket(customerAToken);

    await new Promise((res) => agentASocket.emit('join-ticket', { ticketId: ticket1._id.toString() }, res));
    await new Promise((res) => customerASocket.emit('join-ticket', { ticketId: ticket1._id.toString() }, res));

    let receivedStatusEvent = null;
    customerASocket.on('ticket:status', (data) => {
      receivedStatusEvent = data;
    });

    // 6. Assigned Agent A successfully resolves ticket1 (IN_PROGRESS -> RESOLVED)
    const resResolveSuccess = await makeRequest('PATCH', `/agent/tickets/${ticket1._id}/status`, { status: 'RESOLVED' }, agentAToken);
    assert(resResolveSuccess.status === 200, 'Assigned Agent A resolves IN_PROGRESS ticket returns 200 OK');
    assert(resResolveSuccess.body?.data?.ticket?.status === 'RESOLVED', 'Ticket status updated to RESOLVED in database');
    assert(resResolveSuccess.body?.data?.ticket?.assignedTo?.id === agentA._id.toString(), 'assignedTo preserved as Agent A');

    // Wait for socket event
    await new Promise((r) => setTimeout(r, 400));
    assert(
      receivedStatusEvent?.status === 'RESOLVED' && receivedStatusEvent?.ticketNumber === ticket1.ticketNumber,
      'Socket.IO broadcasted ticket:status event with status: "RESOLVED" to canonical room'
    );

    // 7. Cannot send message while ticket is RESOLVED without reopening
    const resMsgOnResolved = await makeRequest('POST', `/tickets/${ticket1._id}/messages`, { body: 'Hello on resolved' }, customerAToken);
    assert(resMsgOnResolved.status === 400, 'Attempting to send message on RESOLVED ticket returns 400 (explicit reopen required)');

    // =========================================================================
    // SECTION B: REOPEN OPERATION (RESOLVED -> IN_PROGRESS)
    // =========================================================================
    console.log('\n--- SECTION B: REOPEN OPERATION ---');

    // 8. Unrelated Customer B cannot reopen ticket1
    const resCustBReopen = await makeRequest('PATCH', `/tickets/${ticket1._id}/reopen`, {}, customerBToken);
    assert(resCustBReopen.status === 403, 'Unrelated Customer B cannot reopen Customer A ticket (returns 403)');

    // 9. Unrelated Agent B cannot reopen ticket1
    const resAgentBReopen = await makeRequest('PATCH', `/tickets/${ticket1._id}/reopen`, {}, agentBToken);
    assert(resAgentBReopen.status === 403, 'Unrelated Agent B cannot reopen Agent A assigned ticket (returns 403)');

    // 10. Customer A reopens own RESOLVED ticket
    receivedStatusEvent = null;
    const resReopenCust = await makeRequest('PATCH', `/tickets/${ticket1._id}/reopen`, {}, customerAToken);
    assert(resReopenCust.status === 200, 'Customer A reopens own ticket returns 200 OK');
    assert(resReopenCust.body?.data?.ticket?.status === 'IN_PROGRESS', 'Ticket status transitioned from RESOLVED -> IN_PROGRESS');
    assert(
      resReopenCust.body?.data?.ticket?.assignedTo?.id === agentA._id.toString(),
      'assignedTo remains strictly assigned to Agent A after reopen'
    );

    await new Promise((r) => setTimeout(r, 400));
    assert(
      receivedStatusEvent?.status === 'IN_PROGRESS',
      'Socket.IO broadcasted ticket:status event with status: "IN_PROGRESS" upon reopen'
    );

    // 11. Customer can now send message after reopen
    const resMsgAfterReopen = await makeRequest('POST', `/tickets/${ticket1._id}/messages`, { body: 'Message after reopen' }, customerAToken);
    assert(resMsgAfterReopen.status === 201, 'Customer successfully sends message after ticket is reopened (201 Created)');
    if (resMsgAfterReopen.body?.data?.id) {
      cleanupMessageIds.push(resMsgAfterReopen.body.data.id);
    }

    // 12. Cannot reopen ticket if it is already IN_PROGRESS
    const resReopenAlreadyInProgress = await makeRequest('PATCH', `/tickets/${ticket1._id}/reopen`, {}, customerAToken);
    assert(resReopenAlreadyInProgress.status === 400, 'Attempting to reopen an already IN_PROGRESS ticket returns 400 Bad Request');

    // 13. Admin can also reopen a RESOLVED ticket
    // First resolve it again
    await makeRequest('PATCH', `/agent/tickets/${ticket1._id}/status`, { status: 'RESOLVED' }, agentAToken);
    const resAdminReopen = await makeRequest('PATCH', `/tickets/${ticket1._id}/reopen`, {}, adminToken);
    assert(resAdminReopen.status === 200, 'Administrator can reopen RESOLVED ticket returns 200 OK');
    assert(resAdminReopen.body?.data?.ticket?.status === 'IN_PROGRESS', 'Admin reopen transitions status to IN_PROGRESS');

    // =========================================================================
    // SECTION C: CLOSE OPERATION (IN_PROGRESS -> CLOSED)
    // =========================================================================
    console.log('\n--- SECTION C: CLOSE OPERATION ---');

    // 14. Customer cannot close ticket
    const resCustClose = await makeRequest('PATCH', `/agent/tickets/${ticket1._id}/status`, { status: 'CLOSED' }, customerAToken);
    assert(resCustClose.status === 403, 'Customer attempting to close ticket returns 403 Forbidden');

    // 15. Unassigned Agent B cannot close ticket
    const resAgentBClose = await makeRequest('PATCH', `/agent/tickets/${ticket1._id}/status`, { status: 'CLOSED' }, agentBToken);
    assert(resAgentBClose.status === 403, 'Unassigned Agent B attempting to close ticket returns 403 Forbidden');

    // 16. Assigned Agent A closes ticket
    const resCloseSuccess = await makeRequest('PATCH', `/agent/tickets/${ticket1._id}/status`, { status: 'CLOSED' }, agentAToken);
    assert(resCloseSuccess.status === 200, 'Assigned Agent A closes IN_PROGRESS ticket returns 200 OK');
    assert(resCloseSuccess.body?.data?.ticket?.status === 'CLOSED', 'Ticket status transitioned to CLOSED');

    // 17. CLOSED tickets cannot be reopened
    const resReopenClosed = await makeRequest('PATCH', `/tickets/${ticket1._id}/reopen`, {}, customerAToken);
    assert(resReopenClosed.status === 400, 'CLOSED ticket cannot be reopened (terminal status)');

    // 18. Cannot send messages on CLOSED ticket
    const resMsgClosed = await makeRequest('POST', `/tickets/${ticket1._id}/messages`, { body: 'Hello on closed' }, customerAToken);
    assert(resMsgClosed.status === 400, 'Attempting to send message on CLOSED ticket returns 400 Bad Request');

    agentASocket.disconnect();
    customerASocket.disconnect();

    // =========================================================================
    // SECTION D: MY ASSIGNED TICKETS FILTERING & ISOLATION
    // =========================================================================
    console.log('\n--- SECTION D: MY ASSIGNED TICKETS FILTERING & DEFAULTS ---');

    // Create an IN_PROGRESS ticket for Agent A and a RESOLVED ticket for Agent A
    const tktActive = await Ticket.create({
      ticketNumber: `TKT-ACT-${Date.now().toString().slice(-4)}`,
      customerId: customerA._id,
      categoryId: category._id,
      subject: 'Active Assigned Ticket',
      description: 'Active IN_PROGRESS ticket',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assignedTo: agentA._id,
    });
    cleanupTicketIds.push(tktActive._id);

    const tktResolved = await Ticket.create({
      ticketNumber: `TKT-RES-${Date.now().toString().slice(-4)}`,
      customerId: customerA._id,
      categoryId: category._id,
      subject: 'Resolved Assigned Ticket',
      description: 'Resolved ticket',
      status: 'RESOLVED',
      priority: 'LOW',
      assignedTo: agentA._id,
    });
    cleanupTicketIds.push(tktResolved._id);

    // 19. Default GET /agent/my-tickets returns ONLY IN_PROGRESS
    const resDefaultAssigned = await makeRequest('GET', '/agent/my-tickets', null, agentAToken);
    assert(resDefaultAssigned.status === 200, 'GET /agent/my-tickets returned 200');
    const defaultList = resDefaultAssigned.body?.data?.tickets || [];
    const hasActive = defaultList.some((t) => t.ticketNumber === tktActive.ticketNumber);
    const hasResolved = defaultList.some((t) => t.ticketNumber === tktResolved.ticketNumber);
    const hasClosed = defaultList.some((t) => t.ticketNumber === ticket1.ticketNumber); // ticket1 is CLOSED
    assert(hasActive, 'Default assigned view includes active IN_PROGRESS ticket');
    assert(!hasResolved, 'Default assigned view EXCLUDES RESOLVED ticket');
    assert(!hasClosed, 'Default assigned view EXCLUDES CLOSED ticket');

    // 20. GET /agent/my-tickets?status=RESOLVED returns RESOLVED tickets
    const resResolvedAssigned = await makeRequest('GET', '/agent/my-tickets?status=RESOLVED', null, agentAToken);
    const resolvedList = resResolvedAssigned.body?.data?.tickets || [];
    assert(
      resolvedList.some((t) => t.ticketNumber === tktResolved.ticketNumber),
      'GET /agent/my-tickets?status=RESOLVED returns resolved ticket'
    );
    assert(
      !resolvedList.some((t) => t.ticketNumber === tktActive.ticketNumber),
      'GET /agent/my-tickets?status=RESOLVED excludes active IN_PROGRESS ticket'
    );

    // 21. GET /agent/my-tickets?status=ALL includes IN_PROGRESS, RESOLVED, and CLOSED (Full History)
    const resAllAssigned = await makeRequest('GET', '/agent/my-tickets?status=ALL', null, agentAToken);
    const allList = resAllAssigned.body?.data?.tickets || [];
    assert(allList.some((t) => t.ticketNumber === tktActive.ticketNumber), 'ALL assigned view includes IN_PROGRESS');
    assert(allList.some((t) => t.ticketNumber === tktResolved.ticketNumber), 'ALL assigned view includes RESOLVED');
    assert(allList.some((t) => t.ticketNumber === ticket1.ticketNumber), 'ALL assigned view includes CLOSED (full historical access)');

    // 22. Available Tickets queue excludes IN_PROGRESS, RESOLVED, CLOSED, and assigned tickets
    const resQueue = await makeRequest('GET', '/agent/queue', null, agentAToken);
    const queueList = resQueue.body?.data?.tickets || [];
    assert(!queueList.some((t) => t.ticketNumber === tktActive.ticketNumber), 'Queue excludes IN_PROGRESS assigned ticket');
    assert(!queueList.some((t) => t.ticketNumber === tktResolved.ticketNumber), 'Queue excludes RESOLVED ticket');
    assert(!queueList.some((t) => t.ticketNumber === ticket1.ticketNumber), 'Queue excludes CLOSED ticket');
    assert(queueList.some((t) => t.ticketNumber === ticket2.ticketNumber), 'Queue correctly includes OPEN unassigned ticket2');

    // =========================================================================
    // SECTION E: REFRESH PERSISTENCE & DATA PRESERVATION (TKT-000002)
    // =========================================================================
    console.log('\n--- SECTION E: REFRESH PERSISTENCE & TKT-000002 INTEGRITY ---');

    // 23. Verify TKT-000002 in MongoDB
    const tkt2 = await Ticket.findOne({ ticketNumber: 'TKT-000002' });
    assert(Boolean(tkt2), 'TKT-000002 exists and is untouched');
    assert(tkt2.status === 'IN_PROGRESS', 'TKT-000002 status is IN_PROGRESS');

    const alexToken = generateToken({ userId: tkt2.assignedTo, role: 'agent' });

    // 24. Simulate browser refresh / session restore:
    // Call GET /agent/my-tickets
    const alexAssigned = await makeRequest('GET', '/agent/my-tickets', null, alexToken);
    assert(alexAssigned.status === 200, 'Session restore GET /agent/my-tickets returned 200');
    const alexList = alexAssigned.body?.data?.tickets || [];
    const tkt2InAlex = alexList.find((t) => t.ticketNumber === 'TKT-000002');
    assert(Boolean(tkt2InAlex), 'TKT-000002 persists and appears in Alex\'s active assigned tickets after refresh');
    assert(tkt2InAlex?.status === 'IN_PROGRESS', 'TKT-000002 status is still IN_PROGRESS after refresh');

    // 25. Simulate reopening ticket details and message history via REST
    const tkt2Details = await makeRequest('GET', `/agent/tickets/${tkt2._id}`, null, alexToken);
    assert(tkt2Details.status === 200, 'GET /agent/tickets/:ticketId successfully reconstructs ticket after refresh');

    const tkt2Messages = await makeRequest('GET', `/agent/tickets/${tkt2._id}/messages`, null, alexToken);
    assert(tkt2Messages.status === 200, 'GET /agent/tickets/:ticketId/messages successfully reconstructs complete message history');

    // 26. Dedicated test cycle: IN_PROGRESS -> RESOLVED -> reload still RESOLVED -> Reopen -> IN_PROGRESS -> reload still IN_PROGRESS
    console.log('\nTesting state persistence across simulate reloads on isolated test ticket...');
    const cycleTicket = await Ticket.create({
      ticketNumber: `TKT-CYC-${Date.now().toString().slice(-4)}`,
      customerId: customerA._id,
      categoryId: category._id,
      subject: 'Cycle Persistence Ticket',
      description: 'Testing resolve, reload, reopen, reload',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assignedTo: agentA._id,
    });
    cleanupTicketIds.push(cycleTicket._id);

    // Resolve
    await makeRequest('PATCH', `/agent/tickets/${cycleTicket._id}/status`, { status: 'RESOLVED' }, agentAToken);
    // Reload
    const reload1 = await makeRequest('GET', `/agent/tickets/${cycleTicket._id}`, null, agentAToken);
    assert(reload1.body?.data?.ticket?.status === 'RESOLVED', 'Ticket remains RESOLVED after reload simulation');

    // Reopen
    await makeRequest('PATCH', `/tickets/${cycleTicket._id}/reopen`, {}, customerAToken);
    // Reload
    const reload2 = await makeRequest('GET', `/agent/tickets/${cycleTicket._id}`, null, agentAToken);
    assert(reload2.body?.data?.ticket?.status === 'IN_PROGRESS', 'Ticket remains IN_PROGRESS after reopen and reload simulation');
    assert(
      reload2.body?.data?.ticket?.assignedTo?._id === agentA._id.toString() ||
      reload2.body?.data?.ticket?.assignedTo?.id === agentA._id.toString(),
      'assignedTo is preserved through the entire resolve-reload-reopen-reload cycle'
    );

  } catch (err) {
    console.error('Lifecycle test error:', err);
    failed++;
  } finally {
    console.log('\n--- CLEANING UP TEST FIXTURES (PRESERVING TKT-000002) ---');
    if (cleanupMessageIds.length > 0) {
      await TicketMessage.deleteMany({ _id: { $in: cleanupMessageIds } });
    }
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
    console.log(`LIFECYCLE TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`========================================`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTicketLifecycleTests();
