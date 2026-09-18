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

function makeRequest(method, path, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING CUSTOMER TICKET LISTING TEST SUITE ---');
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
    let customerA = await User.findOne({ email: 'customera@example.com' });
    if (!customerA) {
      customerA = await User.create({
        name: 'Customer A',
        email: 'customera@example.com',
        passwordHash,
        role: 'customer',
        isVerified: true,
      });
    }

    let customerB = await User.findOne({ email: 'customerb@example.com' });
    if (!customerB) {
      customerB = await User.create({
        name: 'Customer B',
        email: 'customerb@example.com',
        passwordHash,
        role: 'customer',
        isVerified: true,
      });
    }

    let agent = await User.findOne({ email: 'agent_listing@example.com' });
    if (!agent) {
      agent = await User.create({
        name: 'Test Agent Listing',
        email: 'agent_listing@example.com',
        passwordHash,
        role: 'agent',
        isVerified: true,
      });
    }

    let admin = await User.findOne({ email: 'admin_listing@example.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Test Admin Listing',
        email: 'admin_listing@example.com',
        passwordHash,
        role: 'admin',
        isVerified: true,
      });
    }

    // 2. Create Support Category
    let category = await Category.findOne({ name: 'General Support' });
    if (!category) {
      category = await Category.create({
        name: 'General Support',
        description: 'General support inquiries',
        isActive: true,
      });
    }

    // Clear old tickets for test cleanliness
    await Ticket.deleteMany({ customerId: { $in: [customerA._id, customerB._id] } });

    // 3. Create Tickets for Customer A (3 tickets) and Customer B (2 tickets)
    await Ticket.create([
      {
        ticketNumber: 'TKT-100001',
        customerId: customerA._id,
        categoryId: category._id,
        subject: 'Customer A Ticket 1',
        description: 'Description for Ticket 1',
        priority: 'LOW',
        status: 'OPEN',
      },
      {
        ticketNumber: 'TKT-100002',
        customerId: customerA._id,
        categoryId: category._id,
        subject: 'Customer A Ticket 2',
        description: 'Description for Ticket 2',
        priority: 'MEDIUM',
        status: 'OPEN',
      },
      {
        ticketNumber: 'TKT-100003',
        customerId: customerA._id,
        categoryId: category._id,
        subject: 'Customer A Ticket 3',
        description: 'Description for Ticket 3',
        priority: 'HIGH',
        status: 'OPEN',
      },
      {
        ticketNumber: 'TKT-200001',
        customerId: customerB._id,
        categoryId: category._id,
        subject: 'Customer B Secret Ticket 1',
        description: 'Secret description for B',
        priority: 'URGENT',
        status: 'OPEN',
      },
      {
        ticketNumber: 'TKT-200002',
        customerId: customerB._id,
        categoryId: category._id,
        subject: 'Customer B Secret Ticket 2',
        description: 'Secret description for B 2',
        priority: 'MEDIUM',
        status: 'OPEN',
      },
    ]);

    const tokenA = generateToken({ userId: customerA._id.toString(), role: 'customer' });
    const tokenB = generateToken({ userId: customerB._id.toString(), role: 'customer' });
    const agentToken = generateToken({ userId: agent._id.toString(), role: 'agent' });
    const adminToken = generateToken({ userId: admin._id.toString(), role: 'admin' });

    console.log('\n--- 1. AUTHENTICATION & RBAC SECURITY TESTS ---');

    // Security 1: No token -> 401
    const resNoAuth = await makeRequest('GET', '/tickets/my-tickets');
    assert(resNoAuth.status === 401, 'No Bearer token returns 401 Unauthorized');

    // Security 2: Agent token -> 403
    const resAgent = await makeRequest('GET', '/tickets/my-tickets', agentToken);
    assert(resAgent.status === 403, 'Agent role returns 403 Forbidden');

    // Security 3: Admin token -> 403
    const resAdmin = await makeRequest('GET', '/tickets/my-tickets', adminToken);
    assert(resAdmin.status === 403, 'Admin role returns 403 Forbidden');

    console.log('\n--- 2. INPUT VALIDATION TESTS (PAGINATION & STATUS) ---');

    // Validation 1: Negative page -> 400
    const resNegPage = await makeRequest('GET', '/tickets/my-tickets?page=-5', tokenA);
    assert(resNegPage.status === 400, 'Negative page (-5) returns 400 Bad Request');

    // Validation 2: Non-integer page -> 400
    const resAlphaPage = await makeRequest('GET', '/tickets/my-tickets?page=abc', tokenA);
    assert(resAlphaPage.status === 400, 'Non-integer page (abc) returns 400 Bad Request');

    // Validation 3: Excessive limit -> 400
    const resMaxLimit = await makeRequest('GET', '/tickets/my-tickets?limit=999999', tokenA);
    assert(resMaxLimit.status === 400, 'Limit > 50 (999999) returns 400 Bad Request');

    // Validation 4: Zero limit -> 400
    const resZeroLimit = await makeRequest('GET', '/tickets/my-tickets?limit=0', tokenA);
    assert(resZeroLimit.status === 400, 'Limit = 0 returns 400 Bad Request');

    // Validation 5: Invalid status -> 400
    const resBadStatus = await makeRequest('GET', '/tickets/my-tickets?status=HELLO', tokenA);
    assert(resBadStatus.status === 400, 'Invalid status filter (HELLO) returns 400 Bad Request');

    console.log('\n--- 3. CUSTOMER ISOLATION & IDOR TESTS ---');

    // Customer Isolation Test: Customer A requests listing
    const resCustA = await makeRequest('GET', '/tickets/my-tickets', tokenA);
    assert(resCustA.status === 200, 'Customer A request returns 200 OK');
    const ticketsA = resCustA.body?.data?.tickets || [];
    assert(ticketsA.length === 3, `Customer A receives exactly 3 tickets (received ${ticketsA.length})`);

    const hasBInA = ticketsA.some((t) => t.subject.includes('Customer B'));
    assert(!hasBInA, 'Customer A response contains ZERO tickets belonging to Customer B');

    // IDOR Security Test: Customer A attempts query parameter ?customerId=<Customer B ID>
    const resIDOR = await makeRequest('GET', `/tickets/my-tickets?customerId=${customerB._id}`, tokenA);
    assert(resIDOR.status === 200, 'Request with IDOR customerId param returns 200 OK');
    const ticketsIDOR = resIDOR.body?.data?.tickets || [];
    const hasBInIDOR = ticketsIDOR.some((t) => t.subject.includes('Customer B'));
    assert(!hasBInIDOR, 'IDOR query param ?customerId=... is completely ignored (Customer B tickets NOT returned)');
    assert(ticketsIDOR.length === 3, 'Backend strictly used req.user.userId');

    console.log('\n--- 4. PAGINATION & STATUS FILTER TESTS ---');

    // Pagination Test: Page 1, limit 2
    const resPage1 = await makeRequest('GET', '/tickets/my-tickets?page=1&limit=2', tokenA);
    assert(resPage1.status === 200, 'Page 1 limit 2 returns 200 OK');
    assert(resPage1.body.data.tickets.length === 2, 'Page 1 contains 2 items');
    assert(resPage1.body.data.pagination.page === 1, 'Pagination page metadata is 1');
    assert(resPage1.body.data.pagination.limit === 2, 'Pagination limit metadata is 2');
    assert(resPage1.body.data.pagination.total === 3, 'Pagination total metadata is 3');
    assert(resPage1.body.data.pagination.totalPages === 2, 'Pagination totalPages metadata is 2');
    assert(resPage1.body.data.pagination.hasNextPage === true, 'Pagination hasNextPage is true');
    assert(resPage1.body.data.pagination.hasPreviousPage === false, 'Pagination hasPreviousPage is false');

    // Pagination Test: Page 2, limit 2
    const resPage2 = await makeRequest('GET', '/tickets/my-tickets?page=2&limit=2', tokenA);
    assert(resPage2.status === 200, 'Page 2 limit 2 returns 200 OK');
    assert(resPage2.body.data.tickets.length === 1, 'Page 2 contains 1 remaining item');
    assert(resPage2.body.data.pagination.hasNextPage === false, 'Page 2 hasNextPage is false');
    assert(resPage2.body.data.pagination.hasPreviousPage === true, 'Page 2 hasPreviousPage is true');

    // Status Filter Test: status=OPEN
    const resOpenFilter = await makeRequest('GET', '/tickets/my-tickets?status=OPEN', tokenA);
    assert(resOpenFilter.status === 200, 'Status filter ?status=OPEN returns 200 OK');
    assert(resOpenFilter.body.data.tickets.length === 3, 'Returned 3 tickets with status OPEN');

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
