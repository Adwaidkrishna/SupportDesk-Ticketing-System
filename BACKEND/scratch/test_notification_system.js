import 'dotenv/config';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { io } from '../../FRONTEND/node_modules/socket.io-client/build/esm/index.js';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';
import initializeSocket from '../src/socket/socket.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Ticket from '../src/models/Ticket.js';
import Notification from '../src/models/Notification.js';
import TicketMessage from '../src/models/TicketMessage.js';
import { generateToken } from '../src/utils/jwt.util.js';
import { hashPassword } from '../src/utils/hash.util.js';
import * as notifService from '../src/services/notification/index.js';
import ticketService from '../src/services/ticket/index.js';

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
const SOCKET_URL = `http://localhost:${TEST_PORT}`;

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const postData = data ? JSON.stringify(data) : '';

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(postData);

    const req = (url.protocol === 'https:' ? https : import('http').then(h => h.default || h)).then ? null : null;
    import('http').then(({ default: http }) => {
      const request = http.request(
        url,
        { method, headers },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: body ? JSON.parse(body) : {} });
            } catch (e) {
              resolve({ status: res.statusCode, rawBody: body });
            }
          });
        }
      );
      request.on('error', reject);
      if (data) request.write(postData);
      request.end();
    });
  });
}

async function runNotificationSystemTests() {
  console.log('====================================================');
  console.log('   SUPPORTDESK END-TO-END NOTIFICATION TEST SUITE   ');
  console.log('====================================================\n');

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

  // Spin up dedicated in-process test server with Socket.IO
  const httpServer = createServer(app);
  initializeSocket(httpServer);
  await new Promise((resolve) => httpServer.listen(TEST_PORT, resolve));
  console.log(`📡 In-process test server running on port ${TEST_PORT}`);

  const cleanupUserIds = [];
  const cleanupCategoryIds = [];
  const cleanupTicketIds = [];
  const cleanupNotifIds = [];
  const activeSockets = [];

  try {
    await connectDB();
    const hashedPassword = await hashPassword('SecurePass123!');

    // 1. Create Test Users
    const customer = await User.create({
      name: 'Customer Alice',
      email: `cust_notif_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(customer._id);

    const assignedAgent = await User.create({
      name: 'Agent Bob',
      email: `agent_bob_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(assignedAgent._id);

    const bystanderAgent = await User.create({
      name: 'Agent Charlie (Bystander)',
      email: `agent_charlie_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(bystanderAgent._id);

    const customerToken = generateToken({ userId: customer._id, role: customer.role });
    const agentToken = generateToken({ userId: assignedAgent._id, role: assignedAgent.role });
    const bystanderToken = generateToken({ userId: bystanderAgent._id, role: bystanderAgent.role });

    const category = await Category.create({
      name: `Notif Test Category ${Date.now()}`,
      description: 'Category for testing notifications',
      isActive: true,
    });
    cleanupCategoryIds.push(category._id);

    // 2. Test Socket.IO Connection & Auto-joining user/role rooms
    const connectClient = (token) => {
      return new Promise((resolve, reject) => {
        const client = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnection: false,
        });
        activeSockets.push(client);
        client.on('connect', () => resolve(client));
        client.on('connect_error', reject);
      });
    };

    const customerSocket = await connectClient(customerToken);
    const agentSocket = await connectClient(agentToken);
    const bystanderSocket = await connectClient(bystanderToken);

    assert(customerSocket.connected, 'Customer socket connected successfully');
    assert(agentSocket.connected, 'Assigned Agent socket connected successfully');
    assert(bystanderSocket.connected, 'Bystander Agent socket connected successfully');

    // Setup event collectors
    const customerEvents = [];
    const agentEvents = [];
    const bystanderEvents = [];

    customerSocket.on('notification:new', (n) => customerEvents.push(n));
    agentSocket.on('notification:new', (n) => agentEvents.push(n));
    bystanderSocket.on('notification:new', (n) => bystanderEvents.push(n));

    // -------------------------------------------------------------------
    // UNIT / DIRECT SERVICE & API TESTS
    // -------------------------------------------------------------------
    console.log('\n--- 1. Notification Creation, Persistence, Unread Count & REST API ---');

    const createdNotif = await notifService.createNotification({
      recipient: customer._id,
      sender: assignedAgent._id,
      type: 'system',
      title: 'Welcome Alert',
      message: 'Welcome to the notification system!',
    });
    cleanupNotifIds.push(createdNotif._id);

    assert(createdNotif && createdNotif.read === false, 'Notification persisted with read: false');
    assert(createdNotif.title === 'Welcome Alert', 'Notification title persisted accurately');

    // Verify unread count endpoint
    const unreadRes = await makeRequest('GET', '/notifications/unread-count', null, customerToken);
    assert(unreadRes.status === 200 && unreadRes.body.data.unreadCount >= 1, 'GET /notifications/unread-count returns correct count');

    // Verify get notifications endpoint
    const getRes = await makeRequest('GET', '/notifications?limit=10', null, customerToken);
    assert(getRes.status === 200 && getRes.body.data.notifications.length >= 1, 'GET /notifications returns user notifications');
    assert(getRes.body.data.notifications[0].title === 'Welcome Alert', 'Fetched notification matches persisted title');

    // Verify mark single as read
    const markReadRes = await makeRequest('PATCH', `/notifications/${createdNotif._id}/read`, null, customerToken);
    assert(markReadRes.status === 200 && markReadRes.body.data.notification.read === true, 'PATCH /notifications/:id/read marks notification as read');

    // Verify mark all as read
    await notifService.createNotification({
      recipient: customer._id,
      type: 'system',
      title: 'Second Alert',
      message: 'Testing bulk mark read',
    });
    const markAllRes = await makeRequest('PATCH', '/notifications/read-all', null, customerToken);
    assert(markAllRes.status === 200 && markAllRes.body.data.unreadCount === 0, 'PATCH /notifications/read-all resets unreadCount to 0');

    // Verify delete ownership protection
    const notifForDeletion = await notifService.createNotification({
      recipient: customer._id,
      type: 'system',
      title: 'Delete Test',
      message: 'To be deleted',
    });

    // Agent attempts to delete Customer's notification -> 403 Forbidden
    const illegalDelRes = await makeRequest('DELETE', `/notifications/${notifForDeletion._id}`, null, agentToken);
    assert(illegalDelRes.status === 403, 'Unauthorized delete blocked with 403 Forbidden');

    // Customer deletes own notification -> 200 OK
    const legalDelRes = await makeRequest('DELETE', `/notifications/${notifForDeletion._id}`, null, customerToken);
    assert(legalDelRes.status === 200 && legalDelRes.body.success === true, 'Owner successfully deleted notification');

    // -------------------------------------------------------------------
    // LIFECYCLE ROUTING & NO-LEAKAGE TESTS
    // -------------------------------------------------------------------
    console.log('\n--- 2. Ticket Created Notification Flow ---');
    customerEvents.length = 0;
    agentEvents.length = 0;
    bystanderEvents.length = 0;

    const ticketResult = await ticketService.createTicket({
      customerId: customer._id,
      categoryId: category._id,
      subject: 'Login Issue On Mobile',
      description: 'Unable to login from iOS app',
      priority: 'HIGH',
    });
    const ticketId = ticketResult.ticket.id;
    cleanupTicketIds.push(ticketId);

    // Give socket events 150ms to arrive
    await new Promise((r) => setTimeout(r, 150));

    const custTicketCreated = customerEvents.find((e) => e.type === 'ticket_created');
    assert(custTicketCreated !== undefined, 'Customer received ticket_created notification in real time');

    const agentTicketCreated = agentEvents.find((e) => e.type === 'ticket_created');
    const bystanderTicketCreated = bystanderEvents.find((e) => e.type === 'ticket_created');
    assert(agentTicketCreated !== undefined, 'Agent 1 received new ticket alert via role:agent broadcast');
    assert(bystanderTicketCreated !== undefined, 'Agent 2 received new ticket alert via role:agent broadcast');

    console.log('\n--- 3. Ticket Claimed / Assigned Flow ---');
    customerEvents.length = 0;
    agentEvents.length = 0;
    bystanderEvents.length = 0;

    await ticketService.claimTicket(ticketId, assignedAgent._id);
    await new Promise((r) => setTimeout(r, 150));

    const custClaimNotif = customerEvents.find((e) => e.type === 'ticket_assigned');
    assert(custClaimNotif !== undefined, 'Customer received ticket_assigned notification');
    assert(bystanderEvents.length === 0, 'No notification leakage to bystander agent on claim');

    console.log('\n--- 4. Agent Reply Notification Flow ---');
    customerEvents.length = 0;
    agentEvents.length = 0;
    bystanderEvents.length = 0;

    await ticketService.sendAgentMessage(ticketId, assignedAgent._id, 'Hello Alice, we are investigating your issue.');
    await new Promise((r) => setTimeout(r, 150));

    const custReplyNotif = customerEvents.find((e) => e.type === 'ticket_reply');
    assert(custReplyNotif !== undefined, 'Customer received ticket_reply notification');
    assert(bystanderEvents.length === 0, 'No notification leakage to bystander agent on agent reply');

    console.log('\n--- 5. Customer Reply Notification Flow (Targeted vs Broadcast) ---');
    customerEvents.length = 0;
    agentEvents.length = 0;
    bystanderEvents.length = 0;

    await ticketService.sendCustomerMessage(ticketId, customer._id, 'Thank you Bob, here is the error log screenshot.');
    await new Promise((r) => setTimeout(r, 150));

    const agentReplyNotif = agentEvents.find((e) => e.type === 'ticket_reply');
    assert(agentReplyNotif !== undefined, 'Assigned agent Bob received customer reply notification');
    assert(bystanderEvents.length === 0, 'No leakage: Customer reply NOT broadcast to bystander agent on assigned ticket');

    console.log('\n--- 6. Ticket Resolved Flow ---');
    customerEvents.length = 0;
    agentEvents.length = 0;
    bystanderEvents.length = 0;

    await ticketService.updateAgentTicketStatus(ticketId, assignedAgent._id, 'RESOLVED');
    await new Promise((r) => setTimeout(r, 150));

    const custResolvedNotif = customerEvents.find((e) => e.type === 'ticket_resolved');
    assert(custResolvedNotif !== undefined, 'Customer received ticket_resolved notification');
    assert(bystanderEvents.length === 0, 'No notification leakage to bystander agent on resolve');

    console.log('\n--- 7. Ticket Reopened Flow ---');
    customerEvents.length = 0;
    agentEvents.length = 0;
    bystanderEvents.length = 0;

    await ticketService.reopenTicket(ticketId, customer._id, 'customer');
    await new Promise((r) => setTimeout(r, 150));

    const agentReopenNotif = agentEvents.find((e) => e.type === 'ticket_reopened');
    assert(agentReopenNotif !== undefined, 'Assigned agent Bob received ticket_reopened notification');
    assert(bystanderEvents.length === 0, 'No notification leakage to bystander agent on reopen');

  } catch (err) {
    console.error('❌ FATAL TEST ERROR:', err);
    failed++;
  } finally {
    // Teardown
    console.log('\n--- Teardown and Cleanup ---');
    for (const s of activeSockets) {
      if (s.connected) s.disconnect();
    }
    await new Promise((r) => httpServer.close(r));

    if (cleanupNotifIds.length > 0) await Notification.deleteMany({ _id: { $in: cleanupNotifIds } });
    if (cleanupTicketIds.length > 0) {
      await Ticket.deleteMany({ _id: { $in: cleanupTicketIds } });
      await TicketMessage.deleteMany({ ticketId: { $in: cleanupTicketIds } });
    }
    if (cleanupCategoryIds.length > 0) await Category.deleteMany({ _id: { $in: cleanupCategoryIds } });
    if (cleanupUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: cleanupUserIds } });
      await Notification.deleteMany({ recipient: { $in: cleanupUserIds } });
    }

    await mongoose.disconnect();

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runNotificationSystemTests();
