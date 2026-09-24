import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import { io } from '../../FRONTEND/node_modules/socket.io-client/build/esm/index.js';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Ticket from '../src/models/Ticket.js';
import { generateToken } from '../src/utils/jwt.util.js';
import { hashPassword } from '../src/utils/hash.util.js';
import { SIGNALING_EVENTS } from '../src/config/signalingEvents.js';

const SOCKET_URL = 'http://localhost:5000';
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

async function runWebRtcSignalingTests() {
  console.log('--- STARTING STEP 3 WEBRTC SIGNALING & CALL LIFECYCLE TEST SUITE ---\n');

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
  const sockets = [];

  function connectSocket(token) {
    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: false,
    });
    sockets.push(s);
    return new Promise((resolve, reject) => {
      s.on('connect', () => resolve(s));
      s.on('connect_error', reject);
    });
  }

  try {
    await connectDB();

    const hashedPassword = await hashPassword('SecurePass123!');

    // 1. Create Users
    const customer = await User.create({
      name: 'Customer WebRTC',
      email: `cust_webrtc_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(customer._id);

    const agent = await User.create({
      name: 'Agent WebRTC',
      email: `agent_webrtc_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(agent._id);

    const bystander = await User.create({
      name: 'Bystander WebRTC',
      email: `bystander_webrtc_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(bystander._id);

    const otherAgent = await User.create({
      name: 'Other Agent WebRTC',
      email: `other_agent_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(otherAgent._id);

    const admin = await User.create({
      name: 'Admin WebRTC',
      email: `admin_webrtc_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'admin',
      isVerified: true,
    });
    cleanupUserIds.push(admin._id);

    const category = await Category.create({
      name: `Category WebRTC ${Date.now()}`,
      description: 'WebRTC test category',
    });
    cleanupCategoryIds.push(category._id);

    // 2. Create Ticket assigned to agent
    const ticket = await Ticket.create({
      ticketNumber: `TKT-WTC-${Date.now()}`,
      subject: 'WebRTC Step 3 Test Ticket',
      description: 'Video-call signaling connection flow',
      customerId: customer._id,
      assignedTo: agent._id,
      categoryId: category._id,
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
    });
    cleanupTicketIds.push(ticket._id);

    // 3. Connect Sockets
    const custSocket = await connectSocket(generateToken({ userId: customer._id, role: customer.role }));
    const agentSocket = await connectSocket(generateToken({ userId: agent._id, role: agent.role }));
    const bystanderSocket = await connectSocket(generateToken({ userId: bystander._id, role: bystander.role }));
    const otherAgentSocket = await connectSocket(generateToken({ userId: otherAgent._id, role: otherAgent.role }));
    const adminSocket = await connectSocket(generateToken({ userId: admin._id, role: admin.role }));

    // Join ticket rooms
    await new Promise((resolve) => custSocket.emit('join-ticket', { ticketId: ticket._id.toString() }, resolve));
    await new Promise((resolve) => agentSocket.emit('join-ticket', { ticketId: ticket._id.toString() }, resolve));

    // -------------------------------------------------------------------------
    // TEST 1: Authorization Controls (Unauthorized user cannot participate)
    // -------------------------------------------------------------------------
    console.log('1. Testing Authorization Controls (Unauthorized Users Blocked)...');

    // A. Bystander Customer attempting call:initiate -> Rejected
    const bystanderInitiateRes = await new Promise((resolve) => {
      bystanderSocket.emit(
        SIGNALING_EVENTS.CALL_INITIATE,
        { ticketNumber: ticket.ticketNumber },
        (res) => resolve(res)
      );
    });
    assert(
      bystanderInitiateRes && bystanderInitiateRes.success === false && bystanderInitiateRes.code === 'UNAUTHORIZED',
      'Bystander customer cannot initiate call on another customer\'s ticket'
    );

    // B. Unassigned Agent attempting call:initiate -> Rejected
    const otherAgentInitiateRes = await new Promise((resolve) => {
      otherAgentSocket.emit(
        SIGNALING_EVENTS.CALL_INITIATE,
        { ticketNumber: ticket.ticketNumber },
        (res) => resolve(res)
      );
    });
    assert(
      otherAgentInitiateRes && otherAgentInitiateRes.success === false && otherAgentInitiateRes.code === 'UNAUTHORIZED',
      'Unassigned agent cannot initiate call on ticket assigned to another agent'
    );

    // C. Missing ticket identifier validation
    const missingTicketRes = await new Promise((resolve) => {
      agentSocket.emit(SIGNALING_EVENTS.CALL_INITIATE, {}, (res) => resolve(res));
    });
    assert(
      missingTicketRes && missingTicketRes.success === false && missingTicketRes.error?.includes('Ticket identifier is required'),
      'Missing ticket number rejected with appropriate validation error'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Agent initiates call -> Authorized customer receives incoming call
    // -------------------------------------------------------------------------
    console.log('\n2. Testing Agent Initiates Call -> Customer Receives call:incoming...');

    const custIncomingPromise = new Promise((resolve) => {
      custSocket.once(SIGNALING_EVENTS.CALL_INCOMING, (data) => resolve(data));
    });

    const agentInitiateRes = await new Promise((resolve) => {
      agentSocket.emit(
        SIGNALING_EVENTS.CALL_INITIATE,
        {
          ticketNumber: ticket.ticketNumber,
          ticketId: ticket._id.toString(),
          callerName: 'Agent WebRTC',
        },
        (res) => resolve(res)
      );
    });
    assert(agentInitiateRes && agentInitiateRes.success === true, 'Agent successfully initiated video call');

    const customerReceivedCall = await custIncomingPromise;
    assert(
      customerReceivedCall &&
      customerReceivedCall.ticketNumber === ticket.ticketNumber &&
      customerReceivedCall.ticketSubject === ticket.subject &&
      customerReceivedCall.callerName === 'Agent WebRTC' &&
      customerReceivedCall.callerId === agent._id.toString() &&
      customerReceivedCall.sender?.role === 'agent',
      'Authorized customer in ticket room received call:incoming with full details'
    );

    // -------------------------------------------------------------------------
    // TEST 3: Customer accepts call -> Agent receives call:accepted
    // -------------------------------------------------------------------------
    console.log('\n3. Testing Customer Accepts -> Agent Receives call:accepted...');

    const agentAcceptPromise = new Promise((resolve) => {
      agentSocket.once(SIGNALING_EVENTS.CALL_ACCEPTED, (data) => resolve(data));
    });

    const custAcceptRes = await new Promise((resolve) => {
      custSocket.emit(
        SIGNALING_EVENTS.CALL_ACCEPTED,
        { ticketNumber: ticket.ticketNumber },
        (res) => resolve(res)
      );
    });
    assert(custAcceptRes && custAcceptRes.success === true, 'Customer accepted call successfully');

    const agentReceivedAccept = await agentAcceptPromise;
    assert(
      agentReceivedAccept &&
      agentReceivedAccept.ticketNumber === ticket.ticketNumber &&
      agentReceivedAccept.acceptedBy === customer._id.toString(),
      'Agent received relayed call:accepted state'
    );

    // -------------------------------------------------------------------------
    // TEST 4: Customer declines call -> Agent receives call:declined
    // -------------------------------------------------------------------------
    console.log('\n4. Testing Customer Declines -> Agent Receives call:declined...');

    // Agent initiates another call
    await new Promise((resolve) => {
      agentSocket.emit(
        SIGNALING_EVENTS.CALL_INITIATE,
        { ticketNumber: ticket.ticketNumber, callerName: 'Agent WebRTC' },
        resolve
      );
    });

    const agentDeclinePromise = new Promise((resolve) => {
      agentSocket.once(SIGNALING_EVENTS.CALL_DECLINED, (data) => resolve(data));
    });

    const custDeclineRes = await new Promise((resolve) => {
      custSocket.emit(
        SIGNALING_EVENTS.CALL_DECLINED,
        {
          ticketNumber: ticket.ticketNumber,
          reason: 'Customer declined call invitation',
        },
        (res) => resolve(res)
      );
    });
    assert(custDeclineRes && custDeclineRes.success === true, 'Customer declined call successfully');

    const agentReceivedDecline = await agentDeclinePromise;
    assert(
      agentReceivedDecline &&
      agentReceivedDecline.ticketNumber === ticket.ticketNumber &&
      agentReceivedDecline.declinedBy === customer._id.toString() &&
      agentReceivedDecline.reason === 'Customer declined call invitation',
      'Agent received relayed call:declined state with reason'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Call Busy State
    // -------------------------------------------------------------------------
    console.log('\n5. Testing Call Busy State...');

    const agentBusyPromise = new Promise((resolve) => {
      agentSocket.once(SIGNALING_EVENTS.CALL_BUSY, (data) => resolve(data));
    });

    await new Promise((resolve) => {
      custSocket.emit(
        SIGNALING_EVENTS.CALL_BUSY,
        { ticketNumber: ticket.ticketNumber },
        resolve
      );
    });

    const agentReceivedBusy = await agentBusyPromise;
    assert(
      agentReceivedBusy &&
      agentReceivedBusy.ticketNumber === ticket.ticketNumber &&
      agentReceivedBusy.busyUser === customer._id.toString(),
      'Agent received relayed call:busy state'
    );

    // -------------------------------------------------------------------------
    // TEST 6: Call Ended & Call Error States
    // -------------------------------------------------------------------------
    console.log('\n6. Testing Call Ended and Call Error States...');

    // Call Ended
    const custEndPromise = new Promise((resolve) => {
      custSocket.once(SIGNALING_EVENTS.CALL_ENDED, (data) => resolve(data));
    });

    await new Promise((resolve) => {
      agentSocket.emit(
        SIGNALING_EVENTS.CALL_ENDED,
        { ticketNumber: ticket.ticketNumber, reason: 'Call ended by agent' },
        resolve
      );
    });

    const custReceivedEnd = await custEndPromise;
    assert(
      custReceivedEnd &&
      custReceivedEnd.ticketNumber === ticket.ticketNumber &&
      custReceivedEnd.endedBy === agent._id.toString(),
      'Customer received relayed call:ended state'
    );

    // Call Error
    const custErrorPromise = new Promise((resolve) => {
      custSocket.once(SIGNALING_EVENTS.CALL_ERROR, (data) => resolve(data));
    });

    await new Promise((resolve) => {
      agentSocket.emit(
        SIGNALING_EVENTS.CALL_ERROR,
        { ticketNumber: ticket.ticketNumber, message: 'Media device disconnected' },
        resolve
      );
    });

    const custReceivedError = await custErrorPromise;
    assert(
      custReceivedError &&
      custReceivedError.ticketNumber === ticket.ticketNumber &&
      custReceivedError.message === 'Media device disconnected',
      'Customer received relayed call:error state'
    );

    // Admin authorization
    const adminCallRes = await new Promise((resolve) => {
      adminSocket.emit(
        SIGNALING_EVENTS.CALL_INITIATE,
        { ticketNumber: ticket.ticketNumber },
        (res) => resolve(res)
      );
    });
    assert(adminCallRes && adminCallRes.success === true, 'Admin is authorized to participate in any ticket call');

    // -------------------------------------------------------------------------
    // TEST 7: Existing Socket Messaging Remains Completely Unaffected
    // -------------------------------------------------------------------------
    console.log('\n7. Testing Existing Socket Messaging Remains Unaffected...');

    const customerToken = generateToken({ userId: customer._id, role: customer.role });

    const agentMessagePromise = new Promise((resolve) => {
      agentSocket.once('message:new', (msg) => resolve(msg));
    });

    const msgRes = await makeRequest(
      'POST',
      `/tickets/${ticket._id}/messages`,
      { body: 'Testing that chat messaging works alongside WebRTC signaling!' },
      customerToken
    );
    assert(msgRes.status === 201, 'Customer successfully created ticket message via REST API');

    const receivedMsg = await Promise.race([
      agentMessagePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for message:new')), 4000)),
    ]);

    assert(
      receivedMsg &&
      (receivedMsg.body === 'Testing that chat messaging works alongside WebRTC signaling!' ||
       receivedMsg.message === 'Testing that chat messaging works alongside WebRTC signaling!'),
      'Agent socket received live message:new event without interference from signaling flow'
    );

    assert(custSocket.connected === true, 'Customer socket remains active and connected');
    assert(agentSocket.connected === true, 'Agent socket remains active and connected');

  } catch (err) {
    console.error('Error during test execution:', err);
    failed++;
  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---');
    for (const s of sockets) {
      s.disconnect();
    }
    if (cleanupTicketIds.length) {
      await Ticket.deleteMany({ _id: { $in: cleanupTicketIds } });
    }
    if (cleanupCategoryIds.length) {
      await Category.deleteMany({ _id: { $in: cleanupCategoryIds } });
    }
    if (cleanupUserIds.length) {
      await User.deleteMany({ _id: { $in: cleanupUserIds } });
    }
    await mongoose.disconnect();

    console.log(`\n========================================`);
    console.log(`WEBRTC SIGNALING TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`========================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runWebRtcSignalingTests();
