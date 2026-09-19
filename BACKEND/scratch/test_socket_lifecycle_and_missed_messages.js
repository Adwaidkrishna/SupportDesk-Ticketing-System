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

const BASE_URL = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

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

async function runLifecycleAndMissedMessagesTests() {
  console.log('--- STARTING SOCKET LIFECYCLE & MISSED MESSAGES SUITE ---\n');

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
  const cleanupCategoryIds = [];
  const cleanupTicketIds = [];
  const cleanupMessageIds = [];

  try {
    await connectDB();
    const hashedPassword = await hashPassword('SecurePass123!');

    // 1. Setup Customer and Agent
    const customer = await User.create({
      name: 'Lifecycle Cust',
      email: `lc_cust_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(customer._id);

    const agent = await User.create({
      name: 'Lifecycle Agent',
      email: `lc_agent_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(agent._id);

    const customerToken = generateToken({ userId: customer._id, role: 'customer' });
    const agentToken = generateToken({ userId: agent._id, role: 'agent' });

    const category = await Category.create({
      name: `Category LC ${Date.now()}`,
      description: 'Test category',
    });
    cleanupCategoryIds.push(category._id);

    const ticket = await Ticket.create({
      ticketNumber: `TKT-LC-${Date.now().toString().slice(-4)}`,
      customerId: customer._id,
      categoryId: category._id,
      subject: 'Lifecycle Ticket',
      description: 'Testing lifecycle and missed messages',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assignedTo: agent._id,
    });
    cleanupTicketIds.push(ticket._id);

    // 2. Connect Sockets upon Login
    console.log('1. Establishing authenticated Socket.IO connections...');
    const agentSocket = await createClientSocket(agentToken);
    const customerSocket = await createClientSocket(customerToken);
    assert(agentSocket.connected, 'Agent socket connected on session start');
    assert(customerSocket.connected, 'Customer socket connected on session start');

    // 3. Agent & Customer join the ticket room
    console.log('\n2. Both users join the ticket room...');
    const agentJoin = await new Promise((res) => {
      agentSocket.emit('join-ticket', { ticketId: ticket._id.toString() }, res);
    });
    assert(agentJoin?.success && agentJoin?.room === `ticket:${ticket.ticketNumber}`, 'Agent joined canonical ticket room');

    const customerJoin = await new Promise((res) => {
      customerSocket.emit('join-ticket', { ticketId: ticket._id.toString() }, res);
    });
    assert(customerJoin?.success && customerJoin?.room === `ticket:${ticket.ticketNumber}`, 'Customer joined canonical ticket room');

    // 4. Agent navigates away (leaves ticket room, but socket stays alive)
    console.log('\n3. Agent leaves ticket page (socket connection must stay alive)...');
    const agentLeave = await new Promise((res) => {
      agentSocket.emit('leave-ticket', { ticketNumber: ticket.ticketNumber }, res);
    });
    assert(agentLeave?.success, 'Agent emitted leave-ticket successfully');
    assert(agentSocket.connected, 'Agent socket REMAINS CONNECTED after leaving ticket room');

    // Setup listener on agent socket to track any events received while outside the room
    const agentReceivedMessages = [];
    agentSocket.on('message:new', (msg) => {
      agentReceivedMessages.push(msg);
    });

    // 5. Customer sends a message while Agent is away
    console.log('\n4. Customer sends a message via REST while Agent is away...');
    const restMsg1 = await makeRequest(
      'POST',
      `/tickets/${ticket._id}/messages`,
      { body: 'Missed message: I sent this while you were on another page' },
      customerToken
    );
    assert(restMsg1.status === 201, 'Customer message persisted in MongoDB (201 Created)');
    if (restMsg1.body?.data?.id) {
      cleanupMessageIds.push(restMsg1.body.data.id);
    }

    // Wait a brief moment for any socket broadcast
    await new Promise((r) => setTimeout(r, 400));
    assert(
      agentReceivedMessages.length === 0,
      'Agent received 0 live socket messages while outside the room (Missed message isolation passed)'
    );

    // 6. Agent navigates back to ticket page:
    // First: loads complete message history from REST / MongoDB
    console.log('\n5. Agent re-opens ticket: fetching message history from MongoDB via REST...');
    const agentHistoryRes = await makeRequest(
      'GET',
      `/agent/tickets/${ticket._id}/messages`,
      null,
      agentToken
    );
    assert(agentHistoryRes.status === 200, 'Agent loaded conversation history via REST (200 OK)');
    const loadedMessages = agentHistoryRes.body?.data || [];
    const missedMsgFound = loadedMessages.some(
      (m) => m.body === 'Missed message: I sent this while you were on another page'
    );
    assert(missedMsgFound, 'Missed message successfully retrieved from MongoDB source of truth');

    // Second: Agent re-joins the ticket room
    console.log('\n6. Agent re-joins ticket room for future live messages...');
    const agentRejoin = await new Promise((res) => {
      agentSocket.emit('join-ticket', { ticketId: ticket._id.toString() }, res);
    });
    assert(agentRejoin?.success, 'Agent successfully rejoined ticket room');

    // 7. Customer sends another message: Agent now receives it in real-time
    console.log('\n7. Customer sends a new message: Agent receives it live...');
    const livePromise = new Promise((resolve) => {
      const handler = (msg) => {
        agentSocket.off('message:new', handler);
        resolve(msg);
      };
      agentSocket.on('message:new', handler);
    });

    const restMsg2 = await makeRequest(
      'POST',
      `/tickets/${ticket._id}/messages`,
      { body: 'Live message: you should see this instantly!' },
      customerToken
    );
    assert(restMsg2.status === 201, 'Customer second message created (201 Created)');
    if (restMsg2.body?.data?.id) {
      cleanupMessageIds.push(restMsg2.body.data.id);
    }

    const receivedLiveMsg = await Promise.race([
      livePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for live message')), 3000)),
    ]);
    assert(
      receivedLiveMsg?.body === 'Live message: you should see this instantly!',
      'Agent received future message in real-time through Socket.IO after rejoining'
    );

    // 8. Logout: Disconnect sockets
    console.log('\n8. User logout: Socket properly disconnects...');
    agentSocket.disconnect();
    customerSocket.disconnect();
    assert(!agentSocket.connected, 'Agent socket cleanly disconnected on logout');
    assert(!customerSocket.connected, 'Customer socket cleanly disconnected on logout');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    console.log('\n--- CLEANING UP TEST FIXTURES ---');
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
    console.log(`LIFECYCLE & MISSED MESSAGES RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`========================================`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runLifecycleAndMissedMessagesTests();
