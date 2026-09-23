import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Category from '../models/Category.js';
import TicketMessage from '../models/TicketMessage.js';
import { generateToken } from '../utils/jwt.util.js';
import { hashPassword } from '../utils/hash.util.js';
import {
  validateTicketQuery,
  validateAdminTicketId,
  validateAssignAgent,
  validateUpdateStatus,
  validateUpdatePriority,
  validateAdminReply,
} from '../validators/adminTicket.validator.js';
import { getTickets } from '../services/admin/tickets/getTickets.service.js';
import { getTicketDetails } from '../services/admin/tickets/getTicketDetails.service.js';
import { assignTicketAgent } from '../services/admin/tickets/assignTicketAgent.service.js';
import { updateTicketStatus } from '../services/admin/tickets/updateTicketStatus.service.js';
import { updateTicketPriority } from '../services/admin/tickets/updateTicketPriority.service.js';
import { getTicketMessages } from '../services/admin/tickets/getTicketMessages.service.js';
import { sendAdminReply } from '../services/admin/tickets/sendAdminReply.service.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n--- 1. Testing Admin Ticket Validators ---');

  // Test 1: validateTicketQuery defaults
  {
    let nextCalled = false;
    const req = { query: {} };
    const res = {};
    validateTicketQuery(req, res, () => { nextCalled = true; });
    assert(
      nextCalled && req.validatedQuery.page === 1 && req.validatedQuery.limit === 20,
      'validateTicketQuery initializes correct defaults'
    );
  }

  // Test 2: validateTicketQuery rejects invalid status
  {
    let statusCode = null;
    const req = { query: { status: 'INVALID_STATUS' } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateTicketQuery(req, res, () => {});
    assert(statusCode === 400, 'validateTicketQuery rejects unsupported status value');
  }

  // Test 3: validateAdminTicketId strips '#'
  {
    let nextCalled = false;
    const req = { params: { ticketId: '#1024' } };
    const res = {};
    validateAdminTicketId(req, res, () => { nextCalled = true; });
    assert(nextCalled && req.sanitizedTicketId === '1024', 'validateAdminTicketId strips leading "#" prefix');
  }

  // Test 4: validateAssignAgent accepts null / unassigned
  {
    let nextCalled = false;
    const req = { body: { agentId: 'unassigned' } };
    const res = {};
    validateAssignAgent(req, res, () => { nextCalled = true; });
    assert(nextCalled && req.sanitizedAgentId === null, 'validateAssignAgent handles "unassigned" as null');
  }

  // Test 5: validateUpdateStatus accepts valid uppercase status
  {
    let nextCalled = false;
    const req = { body: { status: 'in_progress' } };
    const res = {};
    validateUpdateStatus(req, res, () => { nextCalled = true; });
    assert(nextCalled && req.sanitizedStatus === 'IN_PROGRESS', 'validateUpdateStatus normalizes status to uppercase');
  }

  // Test 6: validateUpdatePriority rejects invalid priority
  {
    let statusCode = null;
    const req = { body: { priority: 'SUPER_URGENT' } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateUpdatePriority(req, res, () => {});
    assert(statusCode === 400, 'validateUpdatePriority rejects invalid priority');
  }

  // Test 7: validateAdminReply rejects empty body
  {
    let statusCode = null;
    const req = { body: { body: '   ' } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateAdminReply(req, res, () => {});
    assert(statusCode === 400, 'validateAdminReply rejects whitespace-only reply');
  }

  console.log('\n--- 2. Testing Database Services (MongoDB) ---');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/supportdesk';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB successfully.');

  const hashedPassword = await hashPassword('Password123!');
  const testSuffix = Date.now().toString().slice(-6);

  // Setup Test Data
  const testCustomer = await User.create({
    name: `Customer Test ${testSuffix}`,
    email: `cust_${testSuffix}@example.com`,
    passwordHash: hashedPassword,
    role: 'customer',
    isEmailVerified: true,
    isActive: true,
  });

  const testAgent1 = await User.create({
    name: `Agent One ${testSuffix}`,
    email: `agent1_${testSuffix}@example.com`,
    passwordHash: hashedPassword,
    role: 'agent',
    department: 'Hardware',
    availability: 'Available',
    isEmailVerified: true,
    isActive: true,
  });

  const testAgent2 = await User.create({
    name: `Agent Two ${testSuffix}`,
    email: `agent2_${testSuffix}@example.com`,
    passwordHash: hashedPassword,
    role: 'agent',
    department: 'Network',
    availability: 'Busy',
    isEmailVerified: true,
    isActive: true,
  });

  const testAdmin = await User.create({
    name: `Admin User ${testSuffix}`,
    email: `admin_${testSuffix}@example.com`,
    passwordHash: hashedPassword,
    role: 'admin',
    isEmailVerified: true,
    isActive: true,
  });

  const testCategory = await Category.create({
    name: `TicketCat_${testSuffix}`,
    description: 'Category for testing admin ticket workflows',
    isActive: true,
  });

  const testTicket1 = await Ticket.create({
    ticketNumber: `TK-${testSuffix}-1`,
    customerId: testCustomer._id,
    categoryId: testCategory._id,
    subject: `Cannot connect to VPN server ${testSuffix}`,
    description: 'VPN connection keeps dropping after 2 minutes',
    priority: 'HIGH',
    status: 'OPEN',
    assignedTo: null,
  });

  const testTicket2 = await Ticket.create({
    ticketNumber: `TK-${testSuffix}-2`,
    customerId: testCustomer._id,
    categoryId: testCategory._id,
    subject: `Billing invoice query ${testSuffix}`,
    description: 'Need invoice receipt for latest quarterly billing',
    priority: 'LOW',
    status: 'RESOLVED',
    assignedTo: testAgent2._id,
  });

  // Test 8: getTickets retrieves tickets with pagination and stats
  {
    const res = await getTickets({ page: 1, limit: 10 });
    assert(Array.isArray(res.tickets) && res.tickets.length > 0, 'getTickets returns tickets array');
    assert(res.pagination.total >= 2, 'getTickets calculates total count');
    assert(res.stats.total >= 2, 'getTickets includes summary stats');
  }

  // Test 9: getTickets search by ticketNumber
  {
    const res = await getTickets({ search: testTicket1.ticketNumber });
    assert(res.tickets.length === 1 && res.tickets[0].ticketNumber === testTicket1.ticketNumber, 'getTickets search finds ticket by number');
  }

  // Test 10: getTickets search by customer email
  {
    const res = await getTickets({ search: testCustomer.email });
    assert(res.tickets.length === 2, 'getTickets search finds tickets by customer email');
  }

  // Test 11: getTickets filter by status and priority
  {
    const res = await getTickets({ status: 'RESOLVED', priority: 'LOW' });
    const found = res.tickets.some((t) => t.ticketNumber === testTicket2.ticketNumber);
    assert(found, 'getTickets filter by status and priority matches correctly');
  }

  // Test 12: getTickets filter by unassigned agent
  {
    const res = await getTickets({ agentId: 'unassigned' });
    const found = res.tickets.some((t) => t.ticketNumber === testTicket1.ticketNumber);
    assert(found, 'getTickets filter by "unassigned" matches unassigned ticket');
  }

  // Test 13: getTicketDetails retrieves ticket by ObjectId and ticketNumber
  {
    const resById = await getTicketDetails(testTicket1._id.toString());
    const resByNum = await getTicketDetails(testTicket1.ticketNumber);
    assert(resById.ticket.ticketNumber === testTicket1.ticketNumber, 'getTicketDetails works via ObjectId');
    assert(resByNum.ticket.id === testTicket1._id.toString(), 'getTicketDetails works via ticketNumber');
    assert(resById.ticket.customer.totalTickets === 2, 'getTicketDetails includes customer total ticket count');
    assert(resById.ticket.relatedTickets.length === 1, 'getTicketDetails returns related tickets');
  }

  // Test 14: assignTicketAgent assigns agent and PRESERVES OPEN status
  {
    const res = await assignTicketAgent(testTicket1._id.toString(), testAgent1._id.toString(), testAdmin._id.toString());
    assert(res.ticket.assignedTo.name === testAgent1.name, 'assignTicketAgent assigns target agent');
    assert(res.ticket.status === 'OPEN', 'assignTicketAgent preserves ticket status (OPEN is not auto-transitioned)');
    
    // Verify persistence in DB
    const freshTicket = await Ticket.findById(testTicket1._id);
    assert(freshTicket.assignedTo.toString() === testAgent1._id.toString(), 'Agent assignment persisted in MongoDB');
    assert(freshTicket.status === 'OPEN', 'Status in MongoDB remains OPEN');
  }

  // Test 15: assignTicketAgent allows unassigning
  {
    const res = await assignTicketAgent(testTicket1._id.toString(), null, testAdmin._id.toString());
    assert(res.ticket.assignedTo === null, 'assignTicketAgent unassigns agent when null passed');
  }

  // Test 16: updateTicketStatus updates status and persists
  {
    const res = await updateTicketStatus(testTicket1._id.toString(), 'IN_PROGRESS', testAdmin._id.toString());
    assert(res.ticket.status === 'IN_PROGRESS', 'updateTicketStatus transitions status to IN_PROGRESS');
    const freshTicket = await Ticket.findById(testTicket1._id);
    assert(freshTicket.status === 'IN_PROGRESS', 'Status update persisted in MongoDB');
  }

  // Test 17: updateTicketPriority updates priority and persists
  {
    const res = await updateTicketPriority(testTicket1._id.toString(), 'URGENT');
    assert(res.ticket.priority === 'URGENT', 'updateTicketPriority changes priority to URGENT');
    const freshTicket = await Ticket.findById(testTicket1._id);
    assert(freshTicket.priority === 'URGENT', 'Priority update persisted in MongoDB');
  }

  // Test 18: sendAdminReply creates message with senderRole admin
  {
    const replyMsg = await sendAdminReply(
      testTicket1._id.toString(),
      testAdmin._id.toString(),
      'Our team is actively investigating this VPN gateway issue.'
    );
    assert(replyMsg.senderRole === 'admin', 'sendAdminReply sets senderRole to "admin"');
    assert(replyMsg.sender.id === testAdmin._id.toString(), 'sendAdminReply sets correct senderId');

    const freshMsg = await TicketMessage.findById(replyMsg.id);
    assert(freshMsg && freshMsg.senderRole === 'admin', 'Admin message persisted in MongoDB');
  }

  // Test 19: getTicketMessages retrieves chronological messages
  {
    const messages = await getTicketMessages(testTicket1._id.toString());
    assert(messages.length === 1 && messages[0].senderRole === 'admin', 'getTicketMessages returns posted admin reply');
  }

  console.log('\n--- 3. Testing HTTP Endpoints & RBAC ---');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const adminToken = generateToken({
    userId: testAdmin._id.toString(),
    role: 'admin',
    email: testAdmin.email,
  });

  const customerToken = generateToken({
    userId: testCustomer._id.toString(),
    role: 'customer',
    email: testCustomer.email,
  });

  const agentToken = generateToken({
    userId: testAgent1._id.toString(),
    role: 'agent',
    email: testAgent1.email,
  });

  async function makeRequest(path, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (body) headers['Content-Type'] = 'application/json';

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  // Test 20: Unauthenticated request -> 401
  {
    const res = await makeRequest('/api/v1/admin/tickets', 'GET', null, null);
    assert(res.status === 401, 'Unauthenticated GET /api/v1/admin/tickets returns 401');
  }

  // Test 21: Customer request -> 403
  {
    const res = await makeRequest('/api/v1/admin/tickets', 'GET', null, customerToken);
    assert(res.status === 403, 'Customer GET /api/v1/admin/tickets returns 403');
  }

  // Test 22: Agent request -> 403
  {
    const res = await makeRequest('/api/v1/admin/tickets', 'GET', null, agentToken);
    assert(res.status === 403, 'Agent GET /api/v1/admin/tickets returns 403');
  }

  // Test 23: Admin GET /api/v1/admin/tickets -> 200
  {
    const res = await makeRequest('/api/v1/admin/tickets?limit=5', 'GET', null, adminToken);
    assert(res.status === 200 && res.body.success === true, 'Admin GET /api/v1/admin/tickets returns 200');
  }

  // Test 24: Admin GET /api/v1/admin/tickets/:ticketId -> 200
  {
    const res = await makeRequest(`/api/v1/admin/tickets/${testTicket1.ticketNumber}`, 'GET', null, adminToken);
    assert(res.status === 200 && res.body.data.ticket.ticketNumber === testTicket1.ticketNumber, 'Admin GET /api/v1/admin/tickets/:ticketId returns 200');
  }

  // Test 25: Admin PATCH /api/v1/admin/tickets/:ticketId/assign -> 200
  {
    const res = await makeRequest(
      `/api/v1/admin/tickets/${testTicket1._id}/assign`,
      'PATCH',
      { agentId: testAgent2._id.toString() },
      adminToken
    );
    assert(res.status === 200 && res.body.data.ticket.assignedTo.name === testAgent2.name, 'Admin PATCH /api/v1/admin/tickets/:ticketId/assign returns 200');
  }

  // Test 26: Admin PATCH /api/v1/admin/tickets/:ticketId/status -> 200
  {
    const res = await makeRequest(
      `/api/v1/admin/tickets/${testTicket1._id}/status`,
      'PATCH',
      { status: 'RESOLVED' },
      adminToken
    );
    assert(res.status === 200 && res.body.data.ticket.status === 'RESOLVED', 'Admin PATCH /api/v1/admin/tickets/:ticketId/status returns 200');
  }

  // Test 27: Admin PATCH /api/v1/admin/tickets/:ticketId/priority -> 200
  {
    const res = await makeRequest(
      `/api/v1/admin/tickets/${testTicket1._id}/priority`,
      'PATCH',
      { priority: 'MEDIUM' },
      adminToken
    );
    assert(res.status === 200 && res.body.data.ticket.priority === 'MEDIUM', 'Admin PATCH /api/v1/admin/tickets/:ticketId/priority returns 200');
  }

  // Test 28: Admin POST /api/v1/admin/tickets/:ticketId/messages -> 201
  {
    const res = await makeRequest(
      `/api/v1/admin/tickets/${testTicket1._id}/messages`,
      'POST',
      { body: 'Everything is resolved and tested now.' },
      adminToken
    );
    assert(res.status === 201 && res.body.data.message.senderRole === 'admin', 'Admin POST /api/v1/admin/tickets/:ticketId/messages returns 201');
  }

  // Test 29: Admin GET /api/v1/admin/tickets/:ticketId/messages -> 200
  {
    const res = await makeRequest(
      `/api/v1/admin/tickets/${testTicket1._id}/messages`,
      'GET',
      null,
      adminToken
    );
    assert(res.status === 200 && res.body.data.messages.length === 2, 'Admin GET /api/v1/admin/tickets/:ticketId/messages returns 200 with 2 messages');
  }

  // Clean up
  await TicketMessage.deleteMany({ ticketId: testTicket1._id });
  await Ticket.deleteMany({ _id: { $in: [testTicket1._id, testTicket2._id] } });
  await Category.deleteOne({ _id: testCategory._id });
  await User.deleteMany({ _id: { $in: [testCustomer._id, testAgent1._id, testAgent2._id, testAdmin._id] } });
  console.log('  Cleaned up test records from MongoDB.');

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
