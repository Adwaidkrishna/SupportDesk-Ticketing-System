import 'dotenv/config';
import mongoose from 'mongoose';
import http from 'http';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Ticket from '../src/models/Ticket.js';
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
  console.log('--- STARTING AGENT TICKET DETAILS INTEGRATION TEST SUITE ---');
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

  try {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`Test server listening on port ${PORT}`);

    // Clean prior test fixtures
    await User.deleteMany({ email: /@test-agent-details\.com$/ });
    await Category.deleteMany({ name: 'Agent Details Test Cat' });
    await Ticket.deleteMany({ subject: /Agent Details Test/ });

    const dummyPasswordHash = await hashPassword('Password123!');

    // 1. Create Agent User
    const agent = await User.create({
      name: 'Details Agent',
      email: 'agent@test-agent-details.com',
      passwordHash: dummyPasswordHash,
      role: 'agent',
      isVerified: true,
    });

    // 2. Create Assigned Agent User
    const assignedAgent = await User.create({
      name: 'Assigned Agent Staff',
      email: 'assigned-staff@test-agent-details.com',
      passwordHash: dummyPasswordHash,
      role: 'agent',
      isVerified: true,
    });

    // 3. Create Customer User
    const customer = await User.create({
      name: 'Details Customer',
      email: 'customer@test-agent-details.com',
      passwordHash: dummyPasswordHash,
      role: 'customer',
      isVerified: true,
    });

    // 4. Create Admin User
    const admin = await User.create({
      name: 'Details Admin',
      email: 'admin@test-agent-details.com',
      passwordHash: dummyPasswordHash,
      role: 'admin',
      isVerified: true,
    });

    // 5. Create Category for temporary tests
    const category = await Category.create({
      name: 'Agent Details Test Cat',
      description: 'Category for testing agent ticket details',
    });

    // Generate JWT Tokens
    const agentToken = generateToken({ userId: agent._id.toString(), role: agent.role });
    const customerToken = generateToken({ userId: customer._id.toString(), role: customer.role });
    const adminToken = generateToken({ userId: admin._id.toString(), role: admin.role });

    // Look up real development ticket TKT-000002
    let realTicket = await Ticket.findOne({ ticketNumber: 'TKT-000002' })
      .populate('customerId', 'name email')
      .populate('categoryId', 'name description');

    if (!realTicket) {
      console.log('TKT-000002 not found in DB, creating it to match spec...');
      realTicket = await Ticket.create({
        ticketNumber: 'TKT-000002',
        customerId: customer._id,
        categoryId: category._id,
        subject: 'login not possible',
        description: 'it was a heavy problem',
        priority: 'HIGH',
        status: 'OPEN',
        assignedTo: null,
      });
      realTicket = await Ticket.findById(realTicket._id)
        .populate('customerId', 'name email')
        .populate('categoryId', 'name description');
    }

    const realTicketId = realTicket._id.toString();

    // 1. Unauthenticated -> 401
    const resUnauth = await makeRequest('GET', `/agent/tickets/${realTicketId}`, null, null);
    assert(resUnauth.status === 401, '1. Unauthenticated request to /agent/tickets/:ticketId returns 401 Unauthorized');

    // 2. Customer -> 403
    const resCustomer = await makeRequest('GET', `/agent/tickets/${realTicketId}`, null, customerToken);
    assert(resCustomer.status === 403, '2. Customer role access to /agent/tickets/:ticketId returns 403 Forbidden');

    // 3. Admin -> 403 (strict agent-only stage)
    const resAdmin = await makeRequest('GET', `/agent/tickets/${realTicketId}`, null, adminToken);
    assert(resAdmin.status === 403, '3. Admin role access to /agent/tickets/:ticketId returns 403 Forbidden');

    // 4. Agent -> 200
    const resAgent = await makeRequest('GET', `/agent/tickets/${realTicketId}`, null, agentToken);
    assert(resAgent.status === 200, '4. Agent role access to /agent/tickets/:ticketId returns 200 OK');

    const data = resAgent.body?.data?.ticket || resAgent.body?.data;

    // 5. Existing TKT-000002 can be retrieved
    assert(data !== undefined && data !== null, '5. Existing TKT-000002 data is present in response');

    // 6. Correct ticketNumber returned
    assert(data?.ticketNumber === 'TKT-000002', `6. Correct ticketNumber returned (got: "${data?.ticketNumber}")`);

    // 7. Correct subject returned
    assert(data?.subject === 'login not possible', `7. Correct subject returned (got: "${data?.subject}")`);

    // 8. Correct description returned
    assert(data?.description === realTicket.description, `8. Correct description returned (got: "${data?.description}")`);

    // 9. Correct priority returned
    assert(data?.priority === realTicket.priority, `9. Correct priority returned (got: "${data?.priority}")`);

    // 10. Correct status returned
    assert(data?.status === realTicket.status, `10. Correct status returned (got: "${data?.status}", expected: "${realTicket.status}")`);

    // 11. Customer name/email returned
    assert(
      data?.customer && data.customer.name && data.customer.email,
      `11. Customer name and email returned (name: "${data?.customer?.name}", email: "${data?.customer?.email}")`
    );

    // 12. Category returned
    assert(
      data?.category && data.category.name,
      `12. Category details returned (name: "${data?.category?.name}")`
    );

    // 13. assignedTo matches realTicket
    if (!realTicket.assignedTo) {
      assert(data?.assignedTo === null, '13. assignedTo is null when ticket is unassigned');
    } else {
      assert(data?.assignedTo !== null, '13. assignedTo is populated when ticket is assigned');
    }

    // 14. Nonexistent ticket -> 404
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res404 = await makeRequest('GET', `/agent/tickets/${nonExistentId}`, null, agentToken);
    assert(res404.status === 404, '14. Nonexistent ticket ID returns 404 Not Found');

    // 15. Invalid ticket ObjectId -> 400
    const res400 = await makeRequest('GET', '/agent/tickets/invalid-object-id-format', null, agentToken);
    assert(res400.status === 400, '15. Invalid ticket ObjectId format returns 400 Bad Request');

    // 16. Sensitive User fields are not returned
    const customerObj = data?.customer || {};
    const hasSensitiveFields =
      customerObj.password !== undefined ||
      customerObj.passwordHash !== undefined ||
      customerObj.otp !== undefined ||
      customerObj.resetToken !== undefined ||
      customerObj.passwordResetToken !== undefined;
    assert(!hasSensitiveFields, '16. Sensitive User fields (password, hash, otp, resetToken) are never returned');

    // Create an assigned ticket to verify assigned agent populated data
    const assignedTicket = await Ticket.create({
      ticketNumber: 'TKT-AT-999999',
      customerId: customer._id,
      categoryId: category._id,
      subject: 'Agent Details Test Assigned Ticket',
      description: 'Testing assigned agent population in agent details',
      priority: 'MEDIUM',
      status: 'OPEN',
      assignedTo: assignedAgent._id,
    });

    const resAssigned = await makeRequest('GET', `/agent/tickets/${assignedTicket._id}`, null, agentToken);
    const assignedData = resAssigned.body?.data?.ticket || resAssigned.body?.data;
    assert(
      assignedData?.assignedTo?.name === 'Assigned Agent Staff' &&
      assignedData?.assignedTo?.email === 'assigned-staff@test-agent-details.com' &&
      assignedData?.assignedTo?.passwordHash === undefined,
      '17. Assigned agent name/email populated correctly without sensitive fields when assignedTo is set'
    );

    // 18. Existing Customer Ticket Details endpoint still works and preserves customer isolation
    // Customer who owns customerId can access /tickets/:ticketId
    const realTicketOwnerToken = generateToken({
      userId: realTicket.customerId._id ? realTicket.customerId._id.toString() : realTicket.customerId.toString(),
      role: 'customer',
    });
    const resCustomerEndpoint = await makeRequest('GET', `/tickets/${realTicketId}`, null, realTicketOwnerToken);
    assert(
      resCustomerEndpoint.status === 200 && resCustomerEndpoint.body?.data?.ticket?.ticketNumber === 'TKT-000002',
      '18. Existing Customer Ticket Details endpoint (/tickets/:ticketId) still functions for ticket owner'
    );

    // Agent trying to access Customer endpoint /tickets/:ticketId gets 403 Forbidden
    const resAgentOnCustomerRoute = await makeRequest('GET', `/tickets/${realTicketId}`, null, agentToken);
    assert(
      resAgentOnCustomerRoute.status === 403,
      '19. Agent cannot access Customer endpoint (/tickets/:ticketId) - Customer IDOR/Role isolation preserved'
    );

    // Clean up only the temporary test fixtures (preserve TKT-000002)
    await User.deleteMany({ email: /@test-agent-details\.com$/ });
    await Category.deleteMany({ name: 'Agent Details Test Cat' });
    await Ticket.deleteMany({ ticketNumber: 'TKT-AT-999999' });

  } catch (err) {
    console.error('Test execution error:', err);
    failedCount++;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.connection.close();
    console.log(`\n========================================`);
    console.log(`TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
    console.log(`========================================\n`);

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests();
