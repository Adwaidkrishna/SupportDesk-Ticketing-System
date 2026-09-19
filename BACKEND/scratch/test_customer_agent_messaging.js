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

const PORT = 5098;
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
  console.log('--- STARTING STAGE 7 CUSTOMER <-> AGENT REST MESSAGING TEST SUITE ---');
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

  // IDs to clean up
  const cleanupUserIds = [];
  const cleanupTicketIds = [];
  const cleanupCategoryIds = [];
  const cleanupMessageIds = [];

  try {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`Test server listening on port ${PORT}`);

    const hashedPassword = await hashPassword('SecurePass123!');

    // 1. Create Test Users
    const customer1 = await User.create({
      name: 'Customer One MsgTest',
      email: `cust1_msg_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(customer1._id);

    const customer2 = await User.create({
      name: 'Customer Two MsgTest',
      email: `cust2_msg_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isVerified: true,
    });
    cleanupUserIds.push(customer2._id);

    const agentA = await User.create({
      name: 'Agent A MsgTest',
      email: `agentA_msg_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(agentA._id);

    const agentB = await User.create({
      name: 'Agent B MsgTest',
      email: `agentB_msg_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'agent',
      isVerified: true,
    });
    cleanupUserIds.push(agentB._id);

    const adminUser = await User.create({
      name: 'Admin MsgTest',
      email: `admin_msg_${Date.now()}@test.com`,
      passwordHash: hashedPassword,
      role: 'admin',
      isVerified: true,
    });
    cleanupUserIds.push(adminUser._id);

    // Create Tokens
    const customer1Token = generateToken({ userId: customer1._id, role: customer1.role });
    const customer2Token = generateToken({ userId: customer2._id, role: customer2.role });
    const agentAToken = generateToken({ userId: agentA._id, role: agentA.role });
    const agentBToken = generateToken({ userId: agentB._id, role: agentB.role });
    const adminToken = generateToken({ userId: adminUser._id, role: adminUser.role });

    // Category
    const category = await Category.create({
      name: `MsgTest Category ${Date.now()}`,
      description: 'Category for messaging test suite',
    });
    cleanupCategoryIds.push(category._id);

    // Tickets
    // Ticket 1: Owned by Customer 1, assigned to Agent A
    const ticket1 = await Ticket.create({
      ticketNumber: `TKT-MSG-${Date.now().toString().slice(-6)}`,
      customerId: customer1._id,
      categoryId: category._id,
      subject: 'Customer 1 Ticket Assigned to Agent A',
      description: 'Initial ticket description for messaging',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assignedTo: agentA._id,
    });
    cleanupTicketIds.push(ticket1._id);

    // Ticket 2: Owned by Customer 2, unassigned
    const ticket2 = await Ticket.create({
      ticketNumber: `TKT-MSG2-${Date.now().toString().slice(-6)}`,
      customerId: customer2._id,
      categoryId: category._id,
      subject: 'Customer 2 Unassigned Ticket',
      description: 'Unassigned ticket description',
      status: 'OPEN',
      priority: 'LOW',
      assignedTo: null,
    });
    cleanupTicketIds.push(ticket2._id);

    // ==========================================
    // CUSTOMER MESSAGE TESTS (1 to 15)
    // ==========================================

    // 1. Unauthenticated → 401
    const res1 = await makeRequest('POST', `/tickets/${ticket1._id}/messages`, { body: 'Hello' }, null);
    assert(res1.status === 401, '1. Unauthenticated customer message returns 401');

    // 2. Agent using customer endpoint → 403
    const res2 = await makeRequest('POST', `/tickets/${ticket1._id}/messages`, { body: 'Hello' }, agentAToken);
    assert(res2.status === 403, '2. Agent using customer message endpoint returns 403');

    // 3. Admin using customer endpoint → 403
    const res3 = await makeRequest('POST', `/tickets/${ticket1._id}/messages`, { body: 'Hello' }, adminToken);
    assert(res3.status === 403, '3. Admin using customer message endpoint returns 403');

    // 4. Customer can send message to own ticket → 201
    const res4 = await makeRequest(
      'POST',
      `/tickets/${ticket1._id}/messages`,
      { body: '  Hello, I still cannot log in.  ' },
      customer1Token
    );
    assert(res4.status === 201, '4. Customer can send message to own ticket returns 201');
    if (res4.body?.data?._id || res4.body?.data?.id) {
      cleanupMessageIds.push(res4.body.data._id || res4.body.data.id);
    }

    // 5. Message is persisted in MongoDB
    const persistedMsg = await TicketMessage.findOne({ ticketId: ticket1._id, senderId: customer1._id });
    assert(persistedMsg !== null, '5. Message is persisted in MongoDB');

    // 6. senderId comes from JWT
    assert(
      persistedMsg && String(persistedMsg.senderId) === String(customer1._id),
      '6. senderId comes from JWT (matches customer1._id)'
    );

    // 7. senderRole is CUSTOMER
    assert(
      persistedMsg && persistedMsg.senderRole.toLowerCase() === 'customer',
      '7. senderRole is CUSTOMER'
    );

    // 8. ticketId is correct
    assert(
      persistedMsg && String(persistedMsg.ticketId) === String(ticket1._id),
      '8. ticketId matches ticket1._id'
    );

    // 9. body is trimmed
    assert(
      persistedMsg && persistedMsg.body === 'Hello, I still cannot log in.',
      '9. Message body is trimmed'
    );

    // 10. Empty body → 400
    const res10 = await makeRequest('POST', `/tickets/${ticket1._id}/messages`, { body: '' }, customer1Token);
    assert(res10.status === 400, '10. Empty body returns 400');

    // 11. Whitespace-only body → 400
    const res11 = await makeRequest('POST', `/tickets/${ticket1._id}/messages`, { body: '     ' }, customer1Token);
    assert(res11.status === 400, '11. Whitespace-only body returns 400');

    // 12. Invalid body type → 400
    const res12 = await makeRequest('POST', `/tickets/${ticket1._id}/messages`, { body: 12345 }, customer1Token);
    assert(res12.status === 400, '12. Non-string body returns 400');

    // 13. Customer cannot send to another customer's ticket (IDOR) → 404
    const res13 = await makeRequest(
      'POST',
      `/tickets/${ticket2._id}/messages`,
      { body: 'Hacking Customer 2 Ticket' },
      customer1Token
    );
    assert(res13.status === 404, "13. Customer cannot send to another customer's ticket returns 404");

    // 14. senderId supplied in request body is ignored/rejected
    const res14 = await makeRequest(
      'POST',
      `/tickets/${ticket1._id}/messages`,
      { body: 'Attempting sender spoofing', senderId: customer2._id.toString() },
      customer1Token
    );
    assert(res14.status === 201, '14. Request succeeds but senderId override is ignored');
    if (res14.body?.data?._id || res14.body?.data?.id) {
      cleanupMessageIds.push(res14.body.data._id || res14.body.data.id);
      const spoofMsg = await TicketMessage.findById(res14.body.data._id || res14.body.data.id);
      assert(
        spoofMsg && String(spoofMsg.senderId) === String(customer1._id),
        '14b. Spoofed senderId was ignored; real senderId preserved'
      );
    }

    // 15. senderRole supplied in request body is ignored/rejected
    const res15 = await makeRequest(
      'POST',
      `/tickets/${ticket1._id}/messages`,
      { body: 'Attempting role spoofing', senderRole: 'AGENT' },
      customer1Token
    );
    assert(res15.status === 201, '15. Request succeeds but senderRole override is ignored');
    if (res15.body?.data?._id || res15.body?.data?.id) {
      cleanupMessageIds.push(res15.body.data._id || res15.body.data.id);
      const roleMsg = await TicketMessage.findById(res15.body.data._id || res15.body.data.id);
      assert(
        roleMsg && roleMsg.senderRole.toLowerCase() === 'customer',
        '15b. Spoofed senderRole was ignored; role remains customer'
      );
    }

    // ==========================================
    // AGENT MESSAGE TESTS (16 to 28)
    // ==========================================

    // 16. Unauthenticated → 401
    const res16 = await makeRequest('POST', `/agent/tickets/${ticket1._id}/messages`, { body: 'Agent reply' }, null);
    assert(res16.status === 401, '16. Unauthenticated agent message returns 401');

    // 17. Customer using agent endpoint → 403
    const res17 = await makeRequest(
      'POST',
      `/agent/tickets/${ticket1._id}/messages`,
      { body: 'Customer calling agent endpoint' },
      customer1Token
    );
    assert(res17.status === 403, '17. Customer using agent message endpoint returns 403');

    // 18. Admin using agent endpoint → 403
    const res18 = await makeRequest(
      'POST',
      `/agent/tickets/${ticket1._id}/messages`,
      { body: 'Admin calling agent endpoint' },
      adminToken
    );
    assert(res18.status === 403, '18. Admin using agent message endpoint returns 403');

    // 19. Assigned Agent can send → 201
    const res19 = await makeRequest(
      'POST',
      `/agent/tickets/${ticket1._id}/messages`,
      { body: '  I will help you troubleshoot the login issue.  ' },
      agentAToken
    );
    assert(res19.status === 201, '19. Assigned Agent can send message returns 201');
    if (res19.body?.data?._id || res19.body?.data?.id) {
      cleanupMessageIds.push(res19.body.data._id || res19.body.data.id);
    }

    // 20. senderId comes from JWT
    const agentMsg = await TicketMessage.findOne({ ticketId: ticket1._id, senderId: agentA._id });
    assert(
      agentMsg && String(agentMsg.senderId) === String(agentA._id),
      '20. Agent message senderId comes from JWT (matches agentA._id)'
    );

    // 21. senderRole is AGENT
    assert(
      agentMsg && agentMsg.senderRole.toLowerCase() === 'agent',
      '21. senderRole is AGENT'
    );

    // 22. Unassigned Agent cannot send → 403
    const res22 = await makeRequest(
      'POST',
      `/agent/tickets/${ticket2._id}/messages`,
      { body: 'Trying to send to unassigned ticket' },
      agentAToken
    );
    assert(res22.status === 403, '22. Agent cannot send message to unassigned ticket returns 403');

    // 23. Agent A cannot send to Agent B's assigned ticket → 403
    // First assign ticket2 to Agent B
    ticket2.assignedTo = agentB._id;
    ticket2.status = 'IN_PROGRESS';
    await ticket2.save();

    const res23 = await makeRequest(
      'POST',
      `/agent/tickets/${ticket2._id}/messages`,
      { body: 'Agent A messaging Agent B ticket' },
      agentAToken
    );
    assert(res23.status === 403, "23. Agent A cannot send to Agent B's assigned ticket returns 403");

    // 24. Agent cannot send to another ticket they do not own
    assert(res23.status === 403, '24. Agent cannot send to ticket they are not assigned to');

    // 25. Invalid ticket ID → 400
    const res25 = await makeRequest('POST', `/agent/tickets/invalid123/messages`, { body: 'Hello' }, agentAToken);
    assert(res25.status === 400, '25. Invalid ticket ID returns 400');

    // 26. Non-existent ticket → 404
    const fakeId = new mongoose.Types.ObjectId();
    const res26 = await makeRequest('POST', `/agent/tickets/${fakeId}/messages`, { body: 'Hello' }, agentAToken);
    assert(res26.status === 404, '26. Non-existent ticket returns 404');

    // 27. Message length validation works (> 5000 chars → 400)
    const longBody = 'A'.repeat(5001);
    const res27 = await makeRequest(
      'POST',
      `/agent/tickets/${ticket1._id}/messages`,
      { body: longBody },
      agentAToken
    );
    assert(res27.status === 400, '27. Message exceeding length limit returns 400');

    // 28. Sensitive fields are never returned
    const res28Data = res19.body?.data;
    const sender = res28Data?.sender;
    const hasSensitiveFields =
      res28Data?.password ||
      res28Data?.passwordHash ||
      sender?.password ||
      sender?.passwordHash ||
      sender?.otp ||
      sender?.resetToken;
    assert(!hasSensitiveFields, '28. Sensitive fields (password, hash, OTP, resetToken) are never returned');

    // ==========================================
    // GET MESSAGE REGRESSION (29 to 33)
    // ==========================================

    // 29. Customer can still retrieve own conversation
    const res29 = await makeRequest('GET', `/tickets/${ticket1._id}/messages`, null, customer1Token);
    assert(res29.status === 200 && Array.isArray(res29.body?.data), '29. Customer can still retrieve own conversation');

    // 30. Authorized assigned Agent can retrieve conversation
    const res30 = await makeRequest('GET', `/agent/tickets/${ticket1._id}/messages`, null, agentAToken);
    assert(res30.status === 200 && Array.isArray(res30.body?.data), '30. Authorized assigned Agent can retrieve conversation');

    // 31. Unauthorized customer cannot retrieve another customer's conversation
    const res31 = await makeRequest('GET', `/tickets/${ticket2._id}/messages`, null, customer1Token);
    assert(res31.status === 404, "31. Unauthorized customer cannot retrieve another customer's conversation returns 404");

    // 32. Unassigned / unauthorized agent cannot access private conversation
    const res32 = await makeRequest('GET', `/agent/tickets/${ticket1._id}/messages`, null, agentBToken);
    assert(res32.status === 403, '32. Non-assigned agent cannot access private conversation returns 403');

    // 33. Messages remain chronological
    const messages = res30.body?.data || [];
    let isChronological = messages.length >= 2;
    for (let i = 1; i < messages.length; i++) {
      if (new Date(messages[i].createdAt) < new Date(messages[i - 1].createdAt)) {
        isChronological = false;
        break;
      }
    }
    assert(isChronological, '33. Messages are returned in chronological order (createdAt ASC)');

  } catch (error) {
    console.error('Unexpected test error:', error);
    failedCount++;
  } finally {
    console.log('--- CLEANING UP TEST DATA ---');
    if (cleanupMessageIds.length > 0) {
      await TicketMessage.deleteMany({ _id: { $in: cleanupMessageIds } });
    }
    if (cleanupTicketIds.length > 0) {
      // Clean any messages attached to test tickets
      await TicketMessage.deleteMany({ ticketId: { $in: cleanupTicketIds } });
      await Ticket.deleteMany({ _id: { $in: cleanupTicketIds } });
    }
    if (cleanupCategoryIds.length > 0) {
      await Category.deleteMany({ _id: { $in: cleanupCategoryIds } });
    }
    if (cleanupUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: cleanupUserIds } });
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();

    console.log(`\n================================`);
    console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log(`================================`);

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests();
