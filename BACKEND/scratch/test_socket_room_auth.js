import 'dotenv/config';
import mongoose from 'mongoose';
import { io } from '../../FRONTEND/node_modules/socket.io-client/build/esm/index.js';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Ticket from '../src/models/Ticket.js';
import { generateToken } from '../src/utils/jwt.util.js';
import { hashPassword } from '../src/utils/hash.util.js';

const SOCKET_URL = 'http://localhost:5000';

async function runStage10Tests() {
  console.log('--- STARTING STAGE 10: TICKET AUTHORIZATION + ROOMS TEST SUITE ---\n');

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

  try {
    await connectDB();

    const hashedPassword = await hashPassword('SecurePass123!');

    // 1. Create Test Users
    const customer1 = await User.create({
      name: 'Customer 1 RoomTest',
      email: `cust1_room_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(customer1._id);

    const customer2 = await User.create({
      name: 'Customer 2 RoomTest',
      email: `cust2_room_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(customer2._id);

    const agentA = await User.create({
      name: 'Agent A RoomTest',
      email: `agentA_room_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(agentA._id);

    const agentB = await User.create({
      name: 'Agent B RoomTest',
      email: `agentB_room_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(agentB._id);

    const admin = await User.create({
      name: 'Admin RoomTest',
      email: `admin_room_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'admin',
      isVerified: true,
    });
    cleanupUserIds.push(admin._id);

    // Create Tokens
    const customer1Token = generateToken({ userId: customer1._id, role: customer1.role });
    const customer2Token = generateToken({ userId: customer2._id, role: customer2.role });
    const agentAToken = generateToken({ userId: agentA._id, role: agentA.role });
    const agentBToken = generateToken({ userId: agentB._id, role: agentB.role });
    const adminToken = generateToken({ userId: admin._id, role: admin.role });

    // Category
    const category = await Category.create({
      name: `RoomTest Category ${Date.now()}`,
      description: 'Category for room test',
    });
    cleanupCategoryIds.push(category._id);

    // Ticket 1: Customer 1, assigned to Agent A
    const ticket1 = await Ticket.create({
      ticketNumber: `TKT-RM1-${Date.now().toString().slice(-5)}`,
      customerId: customer1._id,
      categoryId: category._id,
      subject: 'Ticket 1 Room Test',
      description: 'Customer 1 assigned to Agent A',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assignedTo: agentA._id,
    });
    cleanupTicketIds.push(ticket1._id);

    // Ticket 2: Customer 2, unassigned
    const ticket2 = await Ticket.create({
      ticketNumber: `TKT-RM2-${Date.now().toString().slice(-5)}`,
      customerId: customer2._id,
      categoryId: category._id,
      subject: 'Ticket 2 Room Test',
      description: 'Customer 2 unassigned ticket',
      status: 'OPEN',
      priority: 'LOW',
      assignedTo: null,
    });
    cleanupTicketIds.push(ticket2._id);

    // Helper to connect a socket client with a given token
    const createClientSocket = (token) => {
      return new Promise((resolve, reject) => {
        const socket = io(SOCKET_URL, {
          auth: { token },
          transports: ['polling', 'websocket'],
          reconnection: false,
        });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', (err) => reject(err));
      });
    };

    // -------------------------------------------------------------------------
    // TEST 1: Customer joining their own ticket -> Allowed
    // -------------------------------------------------------------------------
    console.log('1. Testing: Customer joining own ticket...');
    const cust1Socket = await createClientSocket(customer1Token);
    const res1 = await new Promise((resolve) => {
      cust1Socket.emit('join-ticket', { ticketId: ticket1._id.toString() }, resolve);
    });
    assert(
      res1?.success === true && res1?.room === `ticket:${ticket1.ticketNumber}`,
      `Customer successfully joined own ticket room (${res1?.room})`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Customer joining another customer's ticket -> Denied
    // -------------------------------------------------------------------------
    console.log('\n2. Testing: Customer joining another customer\'s ticket...');
    const res2 = await new Promise((resolve) => {
      cust1Socket.emit('join-ticket', { ticketId: ticket2._id.toString() }, resolve);
    });
    assert(
      res2?.success === false && res2?.message.includes('do not own'),
      `Customer joining other ticket denied with: "${res2?.message}"`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Assigned Agent joining ticket -> Allowed
    // -------------------------------------------------------------------------
    console.log('\n3. Testing: Assigned agent joining ticket...');
    const agentASocket = await createClientSocket(agentAToken);
    const res3 = await new Promise((resolve) => {
      agentASocket.emit('join-ticket', { ticketNumber: ticket1.ticketNumber }, resolve);
    });
    assert(
      res3?.success === true && res3?.room === `ticket:${ticket1.ticketNumber}`,
      `Assigned Agent successfully joined ticket room (${res3?.room})`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Agent joining unassigned ticket -> Denied
    // -------------------------------------------------------------------------
    console.log('\n4. Testing: Agent joining unassigned ticket...');
    const res4 = await new Promise((resolve) => {
      agentASocket.emit('join-ticket', { ticketId: ticket2._id.toString() }, resolve);
    });
    assert(
      res4?.success === false && res4?.message.includes('unassigned'),
      `Agent joining unassigned ticket denied with: "${res4?.message}"`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Agent B joining Agent A's assigned ticket -> Denied
    // -------------------------------------------------------------------------
    console.log('\n5. Testing: Agent B joining Agent A\'s assigned ticket...');
    const agentBSocket = await createClientSocket(agentBToken);
    const res5 = await new Promise((resolve) => {
      agentBSocket.emit('join-ticket', { ticketId: ticket1._id.toString() }, resolve);
    });
    assert(
      res5?.success === false && res5?.message.includes('not assigned'),
      `Agent B joining Agent A ticket denied with: "${res5?.message}"`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Invalid / Non-existent ticket -> Denied
    // -------------------------------------------------------------------------
    console.log('\n6. Testing: Joining non-existent ticket...');
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res6 = await new Promise((resolve) => {
      agentASocket.emit('join-ticket', { ticketId: fakeId }, resolve);
    });
    assert(
      res6?.success === false && res6?.message.includes('not found'),
      `Non-existent ticket rejected with: "${res6?.message}"`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Admin joining any ticket -> Allowed
    // -------------------------------------------------------------------------
    console.log('\n7. Testing: Admin joining ticket...');
    const adminSocket = await createClientSocket(adminToken);
    const res7 = await new Promise((resolve) => {
      adminSocket.emit('join-ticket', { ticketId: ticket1._id.toString() }, resolve);
    });
    assert(
      res7?.success === true && res7?.room === `ticket:${ticket1.ticketNumber}`,
      `Admin successfully authorized for any ticket (${res7?.room})`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Leave ticket room -> Success
    // -------------------------------------------------------------------------
    console.log('\n8. Testing: Leaving ticket room...');
    const res8 = await new Promise((resolve) => {
      cust1Socket.emit('leave-ticket', { ticketNumber: ticket1.ticketNumber }, resolve);
    });
    assert(res8?.success === true, 'Socket successfully left ticket room');

    // Disconnect sockets
    cust1Socket.disconnect();
    agentASocket.disconnect();
    agentBSocket.disconnect();
    adminSocket.disconnect();

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---');
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
    console.log(`STAGE 10 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`========================================`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runStage10Tests();
