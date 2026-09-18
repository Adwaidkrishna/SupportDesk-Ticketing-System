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

const PORT = 5097;
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
  console.log('--- STARTING CUSTOMER TICKET DETAILS TEST SUITE ---');
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
    server = app.listen(PORT);
    console.log(`Test server running on port ${PORT}`);

    const passwordHash = await hashPassword('TestPassword123!');

    // 1. Create Test Users: Customer A, Customer B, Agent, Admin
    let customerA = await User.findOne({ email: 'customer_det_a@example.com' });
    if (!customerA) {
      customerA = await User.create({
        name: 'Customer A Details',
        email: 'customer_det_a@example.com',
        passwordHash,
        role: 'customer',
        isVerified: true,
      });
    }

    let customerB = await User.findOne({ email: 'customer_det_b@example.com' });
    if (!customerB) {
      customerB = await User.create({
        name: 'Customer B Details',
        email: 'customer_det_b@example.com',
        passwordHash,
        role: 'customer',
        isVerified: true,
      });
    }

    let agent = await User.findOne({ email: 'agent_det@example.com' });
    if (!agent) {
      agent = await User.create({
        name: 'Test Agent Details',
        email: 'agent_det@example.com',
        passwordHash,
        role: 'agent',
        isVerified: true,
      });
    }

    let admin = await User.findOne({ email: 'admin_det@example.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Test Admin Details',
        email: 'admin_det@example.com',
        passwordHash,
        role: 'admin',
        isVerified: true,
      });
    }

    // 2. Create Support Category
    let category = await Category.findOne({ name: 'Technical Support' });
    if (!category) {
      category = await Category.create({
        name: 'Technical Support',
        description: 'Software & hardware issues',
        isActive: true,
      });
    }

    // Clear old tickets for test cleanliness
    await Ticket.deleteMany({ customerId: { $in: [customerA._id, customerB._id] } });

    // 3. Create Ticket for Customer A and Ticket for Customer B
    const ticketA = await Ticket.create({
      ticketNumber: 'TKT-700001',
      customerId: customerA._id,
      categoryId: category._id,
      subject: 'Customer A Ticket Details Test',
      description: 'Detailed description for Customer A ticket.',
      priority: 'HIGH',
      status: 'OPEN',
    });

    const ticketB = await Ticket.create({
      ticketNumber: 'TKT-700002',
      customerId: customerB._id,
      categoryId: category._id,
      subject: 'Customer B Secret Ticket Details Test',
      description: 'Secret description for Customer B ticket.',
      priority: 'URGENT',
      status: 'OPEN',
    });

    const tokenA = generateToken({ userId: customerA._id.toString(), role: 'customer' });
    const tokenB = generateToken({ userId: customerB._id.toString(), role: 'customer' });
    const agentToken = generateToken({ userId: agent._id.toString(), role: 'agent' });
    const adminToken = generateToken({ userId: admin._id.toString(), role: 'admin' });

    console.log('\n--- 1. AUTHENTICATION & RBAC SECURITY TESTS ---');

    // Test 1: No token -> 401
    const resNoAuth = await makeRequest('GET', `/tickets/${ticketA._id}`);
    assert(resNoAuth.status === 401, 'No Bearer token returns 401 Unauthorized');

    // Test 2: Agent token -> 403
    const resAgent = await makeRequest('GET', `/tickets/${ticketA._id}`, null, agentToken);
    assert(resAgent.status === 403, 'Agent role returns 403 Forbidden');

    // Test 3: Admin token -> 403
    const resAdmin = await makeRequest('GET', `/tickets/${ticketA._id}`, null, adminToken);
    assert(resAdmin.status === 403, 'Admin role returns 403 Forbidden');

    console.log('\n--- 2. PATH VALIDATION & NOT FOUND TESTS ---');

    // Test 4: Invalid ObjectId format -> 400
    const resInvalidId = await makeRequest('GET', '/tickets/not-a-valid-object-id', null, tokenA);
    assert(resInvalidId.status === 400, 'Invalid ObjectId format returns 400 Bad Request');

    // Test 5: Non-existent ObjectId -> 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const resNonExistent = await makeRequest('GET', `/tickets/${fakeId}`, null, tokenA);
    assert(resNonExistent.status === 404, 'Non-existent ticket returns 404 Not Found');

    console.log('\n--- 3. CUSTOMER OWNERSHIP & IDOR ISOLATION TESTS ---');

    // Test 6: Customer A requests Customer A's ticket -> 200 OK
    const resOwnTicket = await makeRequest('GET', `/tickets/${ticketA._id}`, null, tokenA);
    assert(resOwnTicket.status === 200, 'Customer A requests Customer A ticket returns 200 OK');
    assert(resOwnTicket.body?.data?.ticket?.ticketNumber === 'TKT-700001', 'Correct ticket number returned');
    assert(resOwnTicket.body?.data?.ticket?.subject === 'Customer A Ticket Details Test', 'Correct subject returned');

    // Test 7: Customer A requests Customer B's ticket -> 404 Not Found (IDOR Protection)
    const resIDOR = await makeRequest('GET', `/tickets/${ticketB._id}`, null, tokenA);
    assert(resIDOR.status === 404, 'Customer A requesting Customer B ticket returns 404 Not Found');
    assert(resIDOR.body?.success === false, 'IDOR request body success is false');
    assert(!resIDOR.body?.data?.ticket, 'Customer B ticket data is NOT returned to Customer A');

    // Test 8: Query Parameter Manipulation (?customerId=<Customer B ID>) -> Ignored
    const resManipulated = await makeRequest('GET', `/tickets/${ticketA._id}?customerId=${customerB._id}`, null, tokenA);
    assert(resManipulated.status === 200, 'Request with manipulated customerId param returns 200 OK');
    assert(resManipulated.body?.data?.ticket?.id === ticketA._id.toString(), 'Backend strictly used req.user.userId');

    console.log('\n--- 4. ROUTE REGRESSION TESTS ---');

    // Test 9: GET /api/v1/tickets/my-tickets still works and is NOT intercepted by /:ticketId
    const resMyTickets = await makeRequest('GET', '/tickets/my-tickets', null, tokenA);
    assert(resMyTickets.status === 200, 'GET /my-tickets route still functions correctly (not intercepted by /:ticketId)');
    assert(Array.isArray(resMyTickets.body?.data?.tickets), 'GET /my-tickets returns array of tickets');

    // Test 10: POST /api/v1/tickets creation still works
    const resCreate = await makeRequest('POST', '/tickets', {
      subject: 'Regression Creation Test Ticket',
      description: 'Testing creation regression check',
      categoryId: category._id.toString(),
      priority: 'LOW',
    }, tokenA);
    assert(resCreate.status === 201, 'POST /tickets creation still works (returns 201 Created)');

    console.log(`\n==========================================`);
    console.log(`SUMMARY: ${passedCount} Passed, ${failedCount} Failed`);
    console.log(`==========================================`);

  } catch (err) {
    console.error('CRITICAL TEST FAILURE:', err);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTests();
