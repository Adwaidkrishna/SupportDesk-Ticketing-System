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

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let server;

// Helper for making HTTP requests
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
  console.log('--- STARTING TICKET CREATION TEST SUITE (ESM) ---');
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
    // 1. Connect DB and Start HTTP Server
    await connectDB();
    server = app.listen(PORT);
    console.log(`Test server running on port ${PORT}`);

    // 2. Setup Test Data (Users & Categories)
    const passwordHash = await hashPassword('TestPassword123!');
    
    // Create/update Test Customer
    let customer = await User.findOne({ email: 'testcustomer@example.com' });
    if (!customer) {
      customer = await User.create({
        name: 'Test Customer',
        email: 'testcustomer@example.com',
        passwordHash,
        role: 'customer',
        isVerified: true,
      });
    }

    // Create/update Test Agent
    let agent = await User.findOne({ email: 'testagent@example.com' });
    if (!agent) {
      agent = await User.create({
        name: 'Test Agent',
        email: 'testagent@example.com',
        passwordHash,
        role: 'agent',
        isVerified: true,
      });
    }

    // Create/update Test Admin
    let admin = await User.findOne({ email: 'testadmin@example.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Test Admin',
        email: 'testadmin@example.com',
        passwordHash,
        role: 'admin',
        isVerified: true,
      });
    }

    // Create Category
    let category = await Category.findOne({ name: 'Billing' });
    if (!category) {
      category = await Category.create({
        name: 'Billing',
        description: 'Billing and invoice issues',
        isActive: true,
      });
    }

    // Tokens
    const customerToken = generateToken({ userId: customer._id.toString(), role: 'customer' });
    const agentToken = generateToken({ userId: agent._id.toString(), role: 'agent' });
    const adminToken = generateToken({ userId: admin._id.toString(), role: 'admin' });

    console.log('\n--- 1. SECURITY / RBAC TESTS ---');

    // Security Test 1: No JWT -> 401
    const resNoAuth = await makeRequest('POST', '/tickets', {
      subject: 'Valid Subject Text',
      description: 'Valid Description Text Long Enough',
      categoryId: category._id.toString(),
      priority: 'MEDIUM',
    });
    assert(resNoAuth.status === 401, 'No JWT token returns 401 Unauthorized');

    // Security Test 2: Agent JWT -> 403
    const resAgent = await makeRequest(
      'POST',
      '/tickets',
      {
        subject: 'Valid Subject Text',
        description: 'Valid Description Text Long Enough',
        categoryId: category._id.toString(),
        priority: 'MEDIUM',
      },
      agentToken
    );
    assert(resAgent.status === 403, 'Agent role returns 403 Forbidden');

    // Security Test 3: Admin JWT -> 403
    const resAdmin = await makeRequest(
      'POST',
      '/tickets',
      {
        subject: 'Valid Subject Text',
        description: 'Valid Description Text Long Enough',
        categoryId: category._id.toString(),
        priority: 'MEDIUM',
      },
      adminToken
    );
    assert(resAdmin.status === 403, 'Admin role returns 403 Forbidden');

    console.log('\n--- 2. SERVER-SIDE VALIDATION TESTS ---');

    // Validation Test 1: Missing subject -> 400
    const resNoSubject = await makeRequest(
      'POST',
      '/tickets',
      {
        description: 'Valid Description Text Long Enough',
        categoryId: category._id.toString(),
        priority: 'MEDIUM',
      },
      customerToken
    );
    assert(resNoSubject.status === 400, 'Missing subject returns 400 Bad Request');

    // Validation Test 2: Short subject (< 5 chars) -> 400
    const resShortSubject = await makeRequest(
      'POST',
      '/tickets',
      {
        subject: 'Hi',
        description: 'Valid Description Text Long Enough',
        categoryId: category._id.toString(),
      },
      customerToken
    );
    assert(resShortSubject.status === 400, 'Short subject (<5 chars) returns 400 Bad Request');

    // Validation Test 3: Missing description -> 400
    const resNoDesc = await makeRequest(
      'POST',
      '/tickets',
      {
        subject: 'Valid Subject Text',
        categoryId: category._id.toString(),
      },
      customerToken
    );
    assert(resNoDesc.status === 400, 'Missing description returns 400 Bad Request');

    // Validation Test 4: Short description (< 10 chars) -> 400
    const resShortDesc = await makeRequest(
      'POST',
      '/tickets',
      {
        subject: 'Valid Subject Text',
        description: 'Too short',
        categoryId: category._id.toString(),
      },
      customerToken
    );
    assert(resShortDesc.status === 400, 'Short description (<10 chars) returns 400 Bad Request');

    // Validation Test 5: Invalid Category ID format -> 400
    const resBadCatFormat = await makeRequest(
      'POST',
      '/tickets',
      {
        subject: 'Valid Subject Text',
        description: 'Valid Description Text Long Enough',
        categoryId: 'not-an-object-id',
      },
      customerToken
    );
    assert(resBadCatFormat.status === 400, 'Invalid category ID format returns 400 Bad Request');

    // Validation Test 6: Non-existent Category -> 404
    const fakeCatId = new mongoose.Types.ObjectId().toString();
    const resNonExistentCat = await makeRequest(
      'POST',
      '/tickets',
      {
        subject: 'Valid Subject Text',
        description: 'Valid Description Text Long Enough',
        categoryId: fakeCatId,
      },
      customerToken
    );
    assert(resNonExistentCat.status === 404, 'Non-existent category returns 404 Not Found');

    // Validation Test 7: Invalid Priority -> 400
    const resInvalidPriority = await makeRequest(
      'POST',
      '/tickets',
      {
        subject: 'Valid Subject Text',
        description: 'Valid Description Text Long Enough',
        categoryId: category._id.toString(),
        priority: 'SUPER_URGENT_INVALID',
      },
      customerToken
    );
    assert(resInvalidPriority.status === 400, 'Invalid priority string returns 400 Bad Request');

    // Validation Test 8: Empty whitespace input -> 400
    const resWhitespace = await makeRequest(
      'POST',
      '/tickets',
      {
        subject: '     ',
        description: '            ',
        categoryId: category._id.toString(),
      },
      customerToken
    );
    assert(resWhitespace.status === 400, 'Whitespace subject/description returns 400 Bad Request');

    console.log('\n--- 3. SUCCESSFUL CREATION & MASS ASSIGNMENT TESTS ---');

    // Security Manipulation Test: Attacker attempts mass assignment (fake customerId and status: CLOSED)
    const attackerFakeId = new mongoose.Types.ObjectId().toString();
    const resSuccess = await makeRequest(
      'POST',
      '/tickets',
      {
        subject: 'Billing Inquiry regarding monthly invoice',
        description: 'I noticed an unexpected charge on my invoice for this month. Please clarify.',
        categoryId: category._id.toString(),
        priority: 'HIGH',
        // Attack payload fields:
        customerId: attackerFakeId,
        status: 'CLOSED',
        ticketNumber: 'TKT-999999',
      },
      customerToken
    );

    assert(resSuccess.status === 201, 'Valid ticket creation returns 201 Created');
    assert(resSuccess.body.success === true, 'Response body success is true');
    
    const createdTicketData = resSuccess.body?.data?.ticket;
    assert(Boolean(createdTicketData), 'Response contains ticket object in data');
    assert(Boolean(createdTicketData?.ticketNumber?.startsWith('TKT-')), `Ticket number auto-generated: ${createdTicketData?.ticketNumber}`);
    assert(createdTicketData?.status === 'OPEN', `Initial status is OPEN (ignored attacker payload 'CLOSED'): ${createdTicketData?.status}`);
    assert(createdTicketData?.priority === 'HIGH', `Priority correctly set to HIGH`);
    assert(createdTicketData?.subject === 'Billing Inquiry regarding monthly invoice', `Subject correctly saved`);

    // Verify DB persistence & mass-assignment override
    const dbTicket = await Ticket.findById(createdTicketData.id);
    assert(Boolean(dbTicket), 'Ticket document persisted successfully in MongoDB');
    assert(dbTicket.customerId.toString() === customer.toObject()._id.toString(), `CustomerId bound to authenticated user (${customer._id}), ignoring payload (${attackerFakeId})`);
    assert(dbTicket.customerId.toString() !== attackerFakeId, 'Mass-assignment attempt successfully prevented');

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
