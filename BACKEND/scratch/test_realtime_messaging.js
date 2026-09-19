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

async function runRealtimeTests() {
  console.log('--- STARTING STAGE 11 REAL-TIME MESSAGING TEST SUITE ---\n');

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

    // 1. Create Users
    const customer = await User.create({
      name: 'Customer RT User',
      email: `cust_rt_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(customer._id);

    const agent = await User.create({
      name: 'Agent RT User',
      email: `agent_rt_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(agent._id);

    const bystander = await User.create({
      name: 'Bystander User',
      email: `bystander_rt_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(bystander._id);

    const customerToken = generateToken({ userId: customer._id, role: customer.role });
    const agentToken = generateToken({ userId: agent._id, role: agent.role });
    const bystanderToken = generateToken({ userId: bystander._id, role: bystander.role });

    // Category
    const category = await Category.create({
      name: `RT Category ${Date.now()}`,
      description: 'Category for RT testing',
    });
    cleanupCategoryIds.push(category._id);

    // Ticket assigned to Agent
    const ticket = await Ticket.create({
      ticketNumber: `TKT-RT-${Date.now().toString().slice(-5)}`,
      customerId: customer._id,
      categoryId: category._id,
      subject: 'Realtime Ticket Test',
      description: 'Testing live message delivery',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assignedTo: agent._id,
    });
    cleanupTicketIds.push(ticket._id);

    // Connect Sockets
    const connectClient = (token) => {
      return new Promise((resolve, reject) => {
        const socket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnection: false,
        });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', (err) => reject(err));
      });
    };

    console.log('1. Connecting Customer, Agent, and Bystander Sockets...');
    const custSocket = await connectClient(customerToken);
    const agtSocket = await connectClient(agentToken);
    const bysSocket = await connectClient(bystanderToken);

    // Join room for customer and agent
    const custJoin = await new Promise((res) => custSocket.emit('join-ticket', { ticketId: ticket._id.toString() }, res));
    assert(custJoin.success, 'Customer joined ticket room');

    const agtJoin = await new Promise((res) => agtSocket.emit('join-ticket', { ticketId: ticket._id.toString() }, res));
    assert(agtJoin.success, 'Agent joined ticket room');

    // Track bystander events (should receive 0 messages)
    let bystanderReceived = 0;
    bysSocket.on('message:new', () => { bystanderReceived++; });

    // -------------------------------------------------------------------------
    // TEST 1: Customer sends REST message -> Agent receives Socket.IO message:new
    // -------------------------------------------------------------------------
    console.log('\n2. Testing Customer REST POST -> Real-time Agent Socket Delivery...');
    const agentReceivedPromise = new Promise((resolve) => {
      agtSocket.on('message:new', (msg) => {
        resolve(msg);
      });
    });

    const custPostRes = await makeRequest(
      'POST',
      `/tickets/${ticket._id}/messages`,
      { body: 'Hello Agent, I need live help!' },
      customerToken
    );
    assert(custPostRes.status === 201, 'Customer REST message created (201)');
    if (custPostRes.body?.data?.id) cleanupMessageIds.push(custPostRes.body.data.id);

    const receivedByAgent = await Promise.race([
      agentReceivedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Agent socket receive timed out')), 4000)),
    ]);

    assert(
      receivedByAgent && receivedByAgent.body === 'Hello Agent, I need live help!',
      `Agent received real-time message:new event: "${receivedByAgent?.body}"`
    );
    assert(
      receivedByAgent && receivedByAgent.senderRole === 'customer',
      'Sender role in live message is "customer"'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Agent sends REST reply -> Customer receives Socket.IO message:new
    // -------------------------------------------------------------------------
    console.log('\n3. Testing Agent REST POST -> Real-time Customer Socket Delivery...');
    const customerReceivedPromise = new Promise((resolve) => {
      custSocket.on('message:new', (msg) => {
        resolve(msg);
      });
    });

    const agtPostRes = await makeRequest(
      'POST',
      `/agent/tickets/${ticket._id}/messages`,
      { body: 'Hello Customer, I am helping you right now live!' },
      agentToken
    );
    assert(agtPostRes.status === 201, 'Agent REST reply created (201)');
    if (agtPostRes.body?.data?.id) cleanupMessageIds.push(agtPostRes.body.data.id);

    const receivedByCustomer = await Promise.race([
      customerReceivedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Customer socket receive timed out')), 4000)),
    ]);

    assert(
      receivedByCustomer && receivedByCustomer.body === 'Hello Customer, I am helping you right now live!',
      `Customer received real-time message:new event: "${receivedByCustomer?.body}"`
    );
    assert(
      receivedByCustomer && receivedByCustomer.senderRole === 'agent',
      'Sender role in live message is "agent"'
    );

    // -------------------------------------------------------------------------
    // TEST 3: Room Isolation -> Bystander outside room received 0 messages
    // -------------------------------------------------------------------------
    assert(
      bystanderReceived === 0,
      `Room isolation verified: Bystander outside room received 0 messages (got ${bystanderReceived})`
    );

    // Disconnect sockets
    custSocket.disconnect();
    agtSocket.disconnect();
    bysSocket.disconnect();

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---');
    if (cleanupMessageIds.length > 0) {
      await TicketMessage.deleteMany({ _id: { $in: cleanupMessageIds } });
    }
    if (cleanupTicketIds.length > 0) {
      await TicketMessage.deleteMany({ ticketId: { $in: cleanupTicketIds } });
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
    console.log(`STAGE 11 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`========================================`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runRealtimeTests();
