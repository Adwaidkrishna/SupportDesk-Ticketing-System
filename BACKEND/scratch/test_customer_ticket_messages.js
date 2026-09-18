import 'dotenv/config';
import mongoose from 'mongoose';
import http from 'http';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Ticket from '../src/models/Ticket.js';
import TicketMessage from '../src/models/TicketMessage.js';
import { generateToken } from '../src/utils/jwt.util.js';
import { hashPassword } from '../src/utils/hash.util.js';

const PORT = 5096;
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
  console.log('--- STARTING CUSTOMER TICKET MESSAGES TEST SUITE ---');
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

  let customerA = null;
  let customerB = null;
  let agentUser = null;
  let adminUser = null;

  try {
    await connectDB();
    server = app.listen(PORT);
    console.log(`Test server running on port ${PORT}`);

    const passwordHash = await hashPassword('TestPassword123!');

    // 1. Setup Test Users: Customer A, Customer B, Agent, Admin
    customerA = await User.findOne({ email: 'msg_customer_a@example.com' });
    if (!customerA) {
      customerA = await User.create({
        name: 'Customer A Messages',
        email: 'msg_customer_a@example.com',
        passwordHash,
        role: 'customer',
        isVerified: true,
      });
    }


    customerB = await User.findOne({ email: 'msg_customer_b@example.com' });
    if (!customerB) {
      customerB = await User.create({
        name: 'Customer B Messages',
        email: 'msg_customer_b@example.com',
        passwordHash,
        role: 'customer',
        isVerified: true,
      });
    }

    agentUser = await User.findOne({ email: 'msg_agent@example.com' });
    if (!agentUser) {
      agentUser = await User.create({
        name: 'Agent Messages',
        email: 'msg_agent@example.com',
        passwordHash,
        role: 'agent',
        isVerified: true,
      });
    }

    adminUser = await User.findOne({ email: 'msg_admin@example.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin Messages',
        email: 'msg_admin@example.com',
        passwordHash,
        role: 'admin',
        isVerified: true,
      });
    }


    // 2. Setup Category
    let category = await Category.findOne({ name: 'Technical' });
    if (!category) {
      category = await Category.create({
        name: 'Technical',
        description: 'Software & hardware technical issues',
        isActive: true,
      });
    }

    // 3. Setup Tickets: Ticket A (with messages), Ticket Empty (no messages), Ticket B (owned by B)
    await TicketMessage.deleteMany({});
    await Ticket.deleteMany({
      customerId: { $in: [customerA._id, customerB._id] },
    });

    const ticketA = await Ticket.create({
      ticketNumber: 'TKT-990001',
      customerId: customerA._id,
      categoryId: category._id,
      subject: 'Ticket A with messages',
      description: 'Customer A issue description',
      priority: 'MEDIUM',
      status: 'OPEN',
    });

    const ticketEmpty = await Ticket.create({
      ticketNumber: 'TKT-990002',
      customerId: customerA._id,
      categoryId: category._id,
      subject: 'Ticket A empty messages',
      description: 'Customer A issue description empty',
      priority: 'LOW',
      status: 'OPEN',
    });

    const ticketB = await Ticket.create({
      ticketNumber: 'TKT-990003',
      customerId: customerB._id,
      categoryId: category._id,
      subject: 'Ticket B owned by Customer B',
      description: 'Customer B issue description',
      priority: 'HIGH',
      status: 'OPEN',
    });

    // Seed messages into Ticket A with distinct timestamps
    const msg1Time = new Date(Date.now() - 10000);
    const msg2Time = new Date(Date.now() - 5000);
    const msg3Time = new Date(Date.now());

    const message1 = await TicketMessage.create({
      ticketId: ticketA._id,
      senderId: customerA._id,
      senderRole: 'customer',
      body: 'First message: I need help',
      createdAt: msg1Time,
      updatedAt: msg1Time,
    });

    const message2 = await TicketMessage.create({
      ticketId: ticketA._id,
      senderId: agentUser._id,
      senderRole: 'agent',
      body: 'Second message: We are investigating',
      createdAt: msg2Time,
      updatedAt: msg2Time,
    });

    const message3 = await TicketMessage.create({
      ticketId: ticketA._id,
      senderId: customerA._id,
      senderRole: 'customer',
      body: 'Third message: Thank you for the update',
      createdAt: msg3Time,
      updatedAt: msg3Time,
    });

    // Generate JWTs
    const customerAToken = generateToken({ userId: customerA._id.toString(), role: customerA.role });
    const customerBToken = generateToken({ userId: customerB._id.toString(), role: customerB.role });
    const agentToken = generateToken({ userId: agentUser._id.toString(), role: agentUser.role });
    const adminToken = generateToken({ userId: adminUser._id.toString(), role: adminUser.role });

    console.log('\n--- 1. AUTHENTICATION & RBAC SECURITY TESTS ---');
    // Test 1: Unauthenticated request -> 401
    const resUnauth = await makeRequest('GET', `/tickets/${ticketA._id}/messages`);
    assert(resUnauth.status === 401, 'No Bearer token returns 401 Unauthorized');

    // Test 2: Agent request -> 403
    const resAgent = await makeRequest('GET', `/tickets/${ticketA._id}/messages`, null, agentToken);
    assert(resAgent.status === 403, 'Agent role returns 403 Forbidden');

    // Test 3: Admin request -> 403
    const resAdmin = await makeRequest('GET', `/tickets/${ticketA._id}/messages`, null, adminToken);
    assert(resAdmin.status === 403, 'Admin role returns 403 Forbidden');

    console.log('\n--- 2. PATH VALIDATION & NOT FOUND TESTS ---');
    // Test 4: Invalid ticket ObjectId format -> 400
    const resInvalidId = await makeRequest('GET', '/tickets/invalid-id-123/messages', null, customerAToken);
    assert(resInvalidId.status === 400, 'Invalid ObjectId format returns 400 Bad Request');

    // Test 5: Non-existent ticket -> 404
    const fakeObjectId = new mongoose.Types.ObjectId();
    const resNonExistent = await makeRequest('GET', `/tickets/${fakeObjectId}/messages`, null, customerAToken);
    assert(resNonExistent.status === 404, 'Non-existent ticket returns 404 Not Found');

    console.log('\n--- 3. CUSTOMER OWNERSHIP & IDOR ISOLATION TESTS ---');
    // Test 6: Customer A requests messages from Customer B ticket -> 404 Not Found (IDOR protected)
    const resIdor = await makeRequest('GET', `/tickets/${ticketB._id}/messages`, null, customerAToken);
    assert(resIdor.status === 404, 'Customer A requesting Customer B ticket messages returns 404 Not Found');
    assert(resIdor.body.success === false, 'IDOR request body success is false');

    // Test 7: Query parameter manipulation attempt (?customerId=...)
    const resParamManip = await makeRequest(
      'GET',
      `/tickets/${ticketA._id}/messages?customerId=${customerB._id}`,
      null,
      customerAToken
    );
    assert(resParamManip.status === 200, 'Request with manipulated customerId param returns 200 OK');
    assert(resParamManip.body.data.length === 3, 'Backend strictly used req.user.userId, ignoring query param');

    console.log('\n--- 4. SUCCESS & CHRONOLOGICAL ORDERING TESTS ---');
    // Test 8: Ticket with no messages -> 200 + empty array []
    const resEmpty = await makeRequest('GET', `/tickets/${ticketEmpty._id}/messages`, null, customerAToken);
    assert(resEmpty.status === 200, 'Ticket with no messages returns 200 OK');
    assert(Array.isArray(resEmpty.body.data), 'Returns an array of messages');
    assert(resEmpty.body.data.length === 0, 'Empty ticket returns empty array []');

    // Test 9: Ticket with messages -> 200 + messages list
    const resMessages = await makeRequest('GET', `/tickets/${ticketA._id}/messages`, null, customerAToken);
    assert(resMessages.status === 200, 'Customer A requests own ticket messages returns 200 OK');
    assert(resMessages.body.data.length === 3, 'Returned exactly 3 messages');

    // Test 10: Chronological ordering (oldest first)
    const msgs = resMessages.body.data;
    const isChronological =
      new Date(msgs[0].createdAt).getTime() <= new Date(msgs[1].createdAt).getTime() &&
      new Date(msgs[1].createdAt).getTime() <= new Date(msgs[2].createdAt).getTime();
    assert(isChronological, 'Messages are sorted chronologically (oldest first)');
    assert(msgs[0].body === 'First message: I need help', 'First message is the earliest created message');
    assert(msgs[2].body === 'Third message: Thank you for the update', 'Last message is the most recent message');

    // Test 11: Security & response structure: no passwordHash, no sensitive credentials exposed
    const noSensitiveFields = msgs.every((m) => !m.passwordHash && !m.password && !m.otp && !m.resetToken);
    assert(noSensitiveFields, 'No sensitive credentials (password, otp, tokens) exposed in message payload');

    console.log('\n--- 5. ROUTE REGRESSION TESTS ---');
    // Test 12: GET /my-tickets route still functions correctly
    const resMyTickets = await makeRequest('GET', '/tickets/my-tickets', null, customerAToken);
    assert(resMyTickets.status === 200, 'GET /my-tickets route still functions correctly');

    // Test 13: GET /:ticketId route still functions correctly
    const resDetails = await makeRequest('GET', `/tickets/${ticketA._id}`, null, customerAToken);
    assert(resDetails.status === 200, 'GET /:ticketId route still functions correctly');

    console.log('\n==========================================');
    console.log(`SUMMARY: ${passedCount} Passed, ${failedCount} Failed`);
    console.log('==========================================\n');

    if (failedCount > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test runner encountered error:', err);
    process.exitCode = 1;
  } finally {
    try {
      if (customerA && customerB) {
        const testTickets = await Ticket.find({ customerId: { $in: [customerA._id, customerB._id] } });
        const testTicketIds = testTickets.map((t) => t._id);
        if (testTicketIds.length > 0) {
          await TicketMessage.deleteMany({ ticketId: { $in: testTicketIds } });
          await Ticket.deleteMany({ _id: { $in: testTicketIds } });
        }
        await User.deleteMany({
          _id: { $in: [customerA._id, customerB._id, agentUser?._id, adminUser?._id].filter(Boolean) },
        });
      }
    } catch (cleanErr) {
      console.error('Cleanup error in messages tests:', cleanErr);
    }
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}


runTests();
