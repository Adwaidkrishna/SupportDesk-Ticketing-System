import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import SlaPolicy from '../models/SlaPolicy.js';
import { generateToken } from '../utils/jwt.util.js';
import { hashPassword } from '../utils/hash.util.js';
import {
  validatePolicyId,
  validateCreatePolicy,
  validateUpdatePolicy,
  validateUpdatePolicyStatus,
} from '../validators/adminSla.validator.js';
import {
  seedDefaultPolicies,
  getActivePolicyForPriority,
  calculateSlaForTicket,
  evaluateTicketSla,
  recordFirstResponse,
} from '../services/sla/sla.service.js';
import {
  getSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  toggleSlaPolicyStatus,
} from '../services/admin/sla/index.js';
import { createTicket } from '../services/ticket/customer/createTicket.service.js';
import { sendAgentMessage } from '../services/ticket/agent/sendAgentMessage.service.js';
import { sendCustomerMessage } from '../services/ticket/customer/sendCustomerMessage.service.js';
import { updateAgentTicketStatus } from '../services/ticket/agent/updateAgentTicketStatus.service.js';
import { runSlaCheckOnce } from '../jobs/slaMonitor.job.js';

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
  console.log('\n--- 1. Testing Admin SLA Validators ---');

  // Test 1: validatePolicyId accepts valid ObjectId
  {
    let nextCalled = false;
    const req = { params: { policyId: new mongoose.Types.ObjectId().toString() } };
    const res = {};
    validatePolicyId(req, res, () => { nextCalled = true; });
    assert(nextCalled, 'validatePolicyId accepts valid ObjectId');
  }

  // Test 2: validatePolicyId rejects invalid format
  {
    let statusCode = null;
    const req = { params: { policyId: 'invalid-id' } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validatePolicyId(req, res, () => {});
    assert(statusCode === 400, 'validatePolicyId rejects invalid ObjectId format');
  }

  // Test 3: validateCreatePolicy rejects missing name
  {
    let statusCode = null;
    const req = { body: { priority: 'HIGH', responseTimeMinutes: 60, resolutionTimeMinutes: 240 } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateCreatePolicy(req, res, () => {});
    assert(statusCode === 400, 'validateCreatePolicy rejects missing policy name');
  }

  // Test 4: validateCreatePolicy rejects invalid priority
  {
    let statusCode = null;
    const req = { body: { name: 'Test', priority: 'SUPER_URGENT', responseTimeMinutes: 60, resolutionTimeMinutes: 240 } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateCreatePolicy(req, res, () => {});
    assert(statusCode === 400, 'validateCreatePolicy rejects invalid priority');
  }

  // Test 5: validateCreatePolicy rejects negative or 0 response time
  {
    let statusCode = null;
    const req = { body: { name: 'Test', priority: 'LOW', responseTimeMinutes: -10, resolutionTimeMinutes: 240 } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateCreatePolicy(req, res, () => {});
    assert(statusCode === 400, 'validateCreatePolicy rejects negative response time');
  }

  // Test 6: validateCreatePolicy rejects invalid warning percentage
  {
    let statusCode = null;
    const req = { body: { name: 'Test', priority: 'LOW', responseTimeMinutes: 60, resolutionTimeMinutes: 240, warningPercentage: 150 } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateCreatePolicy(req, res, () => {});
    assert(statusCode === 400, 'validateCreatePolicy rejects warning percentage > 99');
  }

  // Test 7: validateCreatePolicy accepts valid payload
  {
    let nextCalled = false;
    const req = {
      body: {
        name: 'Urgent Ops SLA',
        priority: 'urgent',
        responseTimeMinutes: 15,
        resolutionTimeMinutes: 120,
        warningPercentage: 75,
      },
    };
    const res = {};
    validateCreatePolicy(req, res, () => { nextCalled = true; });
    assert(
      nextCalled &&
        req.validatedBody.priority === 'URGENT' &&
        req.validatedBody.responseTimeMinutes === 15 &&
        req.validatedBody.warningPercentage === 75,
      'validateCreatePolicy normalizes and populates validatedBody'
    );
  }

  // Test 8: validateUpdatePolicy rejects empty payload
  {
    let statusCode = null;
    const req = { body: {} };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateUpdatePolicy(req, res, () => {});
    assert(statusCode === 400, 'validateUpdatePolicy rejects empty update payload');
  }

  // Test 9: validateUpdatePolicyStatus rejects non-boolean
  {
    let statusCode = null;
    const req = { body: { isActive: 'yes' } };
    const res = { status: (c) => ({ json: () => { statusCode = c; } }) };
    validateUpdatePolicyStatus(req, res, () => {});
    assert(statusCode === 400, 'validateUpdatePolicyStatus rejects non-boolean isActive');
  }

  console.log('\n--- 2. Testing Database Services (MongoDB) ---');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/supportdesk';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB successfully.');

  const hashedPassword = await hashPassword('Password123!');
  const testSuffix = Date.now().toString().slice(-6);

  // Setup Users & Category
  const testCustomer = await User.create({
    name: `SLA Customer ${testSuffix}`,
    email: `sla_cust_${testSuffix}@example.com`,
    passwordHash: hashedPassword,
    role: 'customer',
    isVerified: true,
  });

  const testAgent = await User.create({
    name: `SLA Agent ${testSuffix}`,
    email: `sla_agent_${testSuffix}@example.com`,
    passwordHash: hashedPassword,
    role: 'agent',
    isVerified: true,
    department: 'Tier 1 Support',
    availability: 'Available',
  });

  const testAdmin = await User.create({
    name: `SLA Admin ${testSuffix}`,
    email: `sla_admin_${testSuffix}@example.com`,
    passwordHash: hashedPassword,
    role: 'admin',
    isVerified: true,
  });

  const testCategory = await Category.create({
    name: `SLA Category ${testSuffix}`,
    description: 'Category for testing SLA policies',
    isActive: true,
  });

  // Test 10: seedDefaultPolicies seeds 4 priority policies
  {
    await seedDefaultPolicies();
    const policies = await SlaPolicy.find({ isActive: true });
    assert(policies.length >= 4, 'seedDefaultPolicies creates default policies for all priorities');
  }

  // Test 11: getActivePolicyForPriority returns active policy
  {
    const urgentPolicy = await getActivePolicyForPriority('URGENT');
    assert(
      urgentPolicy && urgentPolicy.priority === 'URGENT' && urgentPolicy.responseTimeMinutes === 30,
      'getActivePolicyForPriority returns active URGENT policy (30 min response)'
    );
  }

  // Test 12: calculateSlaForTicket calculates correct deadlines
  {
    const baseTime = new Date('2026-01-01T10:00:00Z');
    const slaData = await calculateSlaForTicket('URGENT', baseTime);
    const expectedResponse = new Date('2026-01-01T10:30:00Z').getTime();
    const expectedResolution = new Date('2026-01-01T14:00:00Z').getTime();

    assert(
      slaData.responseDeadline.getTime() === expectedResponse &&
        slaData.resolutionDeadline.getTime() === expectedResolution,
      'calculateSlaForTicket accurately sets response (+30m) and resolution (+4h) deadlines'
    );
  }

  // Test 13: Admin createSlaPolicy & duplicate active prevention
  let customPolicy = null;
  {
    // Try creating duplicate active policy for URGENT (should reject)
    let duplicateRejected = false;
    try {
      await createSlaPolicy({
        name: 'Another Active Urgent SLA',
        priority: 'URGENT',
        responseTimeMinutes: 20,
        resolutionTimeMinutes: 180,
        isActive: true,
      });
    } catch (err) {
      if (err.statusCode === 409) duplicateRejected = true;
    }
    assert(duplicateRejected, 'createSlaPolicy rejects duplicate active policy for the same priority');

    // Create inactive policy for URGENT (should succeed)
    customPolicy = await createSlaPolicy({
      name: 'Custom Inactive Urgent SLA',
      priority: 'URGENT',
      responseTimeMinutes: 20,
      resolutionTimeMinutes: 180,
      isActive: false,
    });
    assert(customPolicy && customPolicy.isActive === false, 'createSlaPolicy allows inactive policy');
  }

  // Test 14: Admin updateSlaPolicy
  {
    const updated = await updateSlaPolicy(customPolicy.id, {
      name: 'Updated Custom SLA',
      responseTimeMinutes: 25,
    });
    assert(
      updated.name === 'Updated Custom SLA' && updated.responseTimeMinutes === 25,
      'updateSlaPolicy modifies policy fields'
    );
  }

  // Test 15: Admin toggleSlaPolicyStatus
  {
    // Toggling to active when an active one exists should throw 409
    let duplicateActiveRejected = false;
    try {
      await toggleSlaPolicyStatus(customPolicy.id, true);
    } catch (err) {
      if (err.statusCode === 409) duplicateActiveRejected = true;
    }
    assert(duplicateActiveRejected, 'toggleSlaPolicyStatus prevents multiple active policies for same priority');
  }

  // Test 16: Admin getSlaPolicies returns policies and live overview
  {
    const res = await getSlaPolicies();
    assert(
      Array.isArray(res.policies) && res.overview && typeof res.overview.activePolicies === 'number',
      'getSlaPolicies returns configured policies and overview compliance stats'
    );
  }

  console.log('\n--- 3. Testing Ticket SLA Lifecycle & First Response ---');

  // Test 17: Customer creates ticket -> receives SLA policy & deadlines
  let ticket1 = null;
  {
    const created = await createTicket({
      customerId: testCustomer._id.toString(),
      subject: `Urgent Bug Test ${testSuffix}`,
      description: 'System is experiencing downtime issue',
      categoryId: testCategory._id.toString(),
      priority: 'URGENT',
    });
    ticket1 = await Ticket.findById(created.ticket.id);
    assert(
      ticket1.sla &&
        ticket1.sla.priority === 'URGENT' &&
        ticket1.sla.responseDeadline !== null &&
        ticket1.sla.resolutionDeadline !== null,
      'Ticket creation calculates and stores SLA policy and deadlines'
    );
  }

  // Test 18: Customer message does NOT satisfy Response SLA
  {
    await sendCustomerMessage(
      ticket1._id.toString(),
      testCustomer._id.toString(),
      'Any updates on this ticket yet?'
    );
    const refreshed = await Ticket.findById(ticket1._id);
    assert(refreshed.sla.firstResponseAt === null, 'Customer reply does NOT satisfy Response SLA');
  }

  // Assign agent to ticket1 for reply
  ticket1.assignedTo = testAgent._id;
  ticket1.status = 'IN_PROGRESS';
  await ticket1.save();

  // Test 19: Agent reply satisfies Response SLA
  {
    await sendAgentMessage(
      ticket1._id.toString(),
      testAgent._id.toString(),
      'Investigating the server logs right now.'
    );
    const refreshed = await Ticket.findById(ticket1._id);
    assert(
      refreshed.sla.firstResponseAt !== null && refreshed.sla.responseBreached === false,
      'First agent reply records firstResponseAt and marks Response SLA as met'
    );
  }

  console.log('\n--- 4. Testing Resolution SLA & Reopening ---');

  // Test 20: Resolving ticket within SLA records resolution and evaluates SLA
  {
    await updateAgentTicketStatus(ticket1._id.toString(), testAgent._id.toString(), 'RESOLVED');
    const refreshed = await Ticket.findById(ticket1._id);
    assert(
      refreshed.status === 'RESOLVED' &&
        refreshed.sla.resolvedAt !== null &&
        refreshed.sla.resolutionBreached === false &&
        refreshed.sla.isBreached === false,
      'Resolving ticket within target records resolvedAt and sets resolutionBreached to false'
    );
  }

  console.log('\n--- 5. Testing Warning & Breach Evaluations ---');

  // Test 21: Evaluate within SLA
  {
    const evalResult = evaluateTicketSla(ticket1);
    assert(
      evalResult.hasSla === true &&
        evalResult.overallStatus === 'WITHIN_SLA' &&
        evalResult.isBreached === false,
      'evaluateTicketSla reports WITHIN_SLA for met ticket'
    );
  }

  // Test 22: Evaluate SLA Warning State
  {
    // Create a ticket with past created date at 85% of resolution target
    const pastCreated = new Date(Date.now() - 3.4 * 60 * 60 * 1000); // 3h 24m ago for 4h resolution (85%)
    const warningTicket = {
      createdAt: pastCreated,
      status: 'IN_PROGRESS',
      sla: {
        policyName: 'Urgent Priority SLA',
        priority: 'URGENT',
        responseTimeMinutes: 30,
        resolutionTimeMinutes: 240,
        warningPercentage: 80,
        responseDeadline: new Date(pastCreated.getTime() + 30 * 60 * 1000),
        resolutionDeadline: new Date(pastCreated.getTime() + 240 * 60 * 1000),
        firstResponseAt: new Date(pastCreated.getTime() + 10 * 60 * 1000), // satisfied
        responseBreached: false,
        resolvedAt: null,
        resolutionBreached: false,
        isBreached: false,
      },
    };

    const evalResult = evaluateTicketSla(warningTicket);
    assert(
      evalResult.resolutionStatus === 'WARNING' && evalResult.overallStatus === 'WARNING',
      'evaluateTicketSla correctly identifies WARNING state when threshold exceeded'
    );
  }

  // Test 23: Evaluate SLA Breach State
  {
    // Create a ticket past its deadline
    const expiredCreated = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5h ago for 4h resolution
    const breachedTicket = {
      createdAt: expiredCreated,
      status: 'IN_PROGRESS',
      sla: {
        policyName: 'Urgent Priority SLA',
        priority: 'URGENT',
        responseTimeMinutes: 30,
        resolutionTimeMinutes: 240,
        warningPercentage: 80,
        responseDeadline: new Date(expiredCreated.getTime() + 30 * 60 * 1000),
        resolutionDeadline: new Date(expiredCreated.getTime() + 240 * 60 * 1000),
        firstResponseAt: new Date(expiredCreated.getTime() + 10 * 60 * 1000),
        responseBreached: false,
        resolvedAt: null,
        resolutionBreached: false,
        isBreached: false,
      },
    };

    const evalResult = evaluateTicketSla(breachedTicket);
    assert(
      evalResult.resolutionStatus === 'BREACHED' &&
        evalResult.isBreached === true &&
        evalResult.overallStatus === 'BREACHED',
      'evaluateTicketSla correctly identifies BREACHED state when deadline passes'
    );
  }

  // Test 24: Response breach when first response is submitted AFTER deadline
  {
    const lateTicket = await Ticket.create({
      ticketNumber: `TKT-LATE-${testSuffix}`,
      customerId: testCustomer._id,
      assignedTo: testAgent._id,
      categoryId: testCategory._id,
      subject: 'Late response test ticket',
      description: 'Testing late agent response',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      createdAt: new Date(Date.now() - 60 * 60 * 1000), // 60 mins ago
      sla: {
        policyName: 'Urgent SLA',
        priority: 'URGENT',
        responseTimeMinutes: 30,
        resolutionTimeMinutes: 240,
        responseDeadline: new Date(Date.now() - 30 * 60 * 1000), // deadline was 30 mins ago
        resolutionDeadline: new Date(Date.now() + 180 * 60 * 1000),
        firstResponseAt: null,
        responseBreached: false,
        resolvedAt: null,
        resolutionBreached: false,
        isBreached: false,
      },
    });

    await recordFirstResponse(lateTicket._id.toString(), 'agent', testAgent._id.toString());
    const refreshedLate = await Ticket.findById(lateTicket._id);
    assert(
      refreshedLate.sla.responseBreached === true && refreshedLate.sla.isBreached === true,
      'recordFirstResponse marks responseBreached = true if response is past deadline'
    );

    await Ticket.deleteOne({ _id: lateTicket._id });
  }

  console.log('\n--- 6. Testing SLA Monitor Notifications ---');

  // Test 25: SLA Monitor detects warning and dispatches notifications
  {
    const warningTicketDoc = await Ticket.create({
      ticketNumber: `TKT-WARN-${testSuffix}`,
      customerId: testCustomer._id,
      assignedTo: testAgent._id,
      categoryId: testCategory._id,
      subject: 'Warning monitor test ticket',
      description: 'Testing SLA warning detection and notification',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      createdAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // 3.5h ago (87% of 4h)
      sla: {
        policyName: 'Urgent Priority SLA',
        priority: 'URGENT',
        responseTimeMinutes: 30,
        resolutionTimeMinutes: 240,
        warningPercentage: 80,
        responseDeadline: new Date(Date.now() - 3 * 60 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() + 0.5 * 60 * 60 * 1000),
        firstResponseAt: new Date(Date.now() - 3.4 * 60 * 60 * 1000), // satisfied
        responseBreached: false,
        resolvedAt: null,
        resolutionBreached: false,
        isBreached: false,
        warningNotified: false,
        breachNotified: false,
      },
    });

    await runSlaCheckOnce();

    const notifs = await Notification.find({
      ticketId: warningTicketDoc._id,
      type: 'sla_warning',
    });
    assert(notifs.length >= 1, 'runSlaCheckOnce creates sla_warning notification for ticket in warning state');

    const updatedWarningDoc = await Ticket.findById(warningTicketDoc._id);
    assert(updatedWarningDoc.sla.warningNotified === true, 'SLA Monitor sets warningNotified = true');

    await Ticket.deleteOne({ _id: warningTicketDoc._id });
    await Notification.deleteMany({ ticketId: warningTicketDoc._id });
  }

  // Test 26: SLA Monitor detects breach and dispatches notifications
  {
    const breachTicketDoc = await Ticket.create({
      ticketNumber: `TKT-BRCH-${testSuffix}`,
      customerId: testCustomer._id,
      assignedTo: testAgent._id,
      categoryId: testCategory._id,
      subject: 'Breach monitor test ticket',
      description: 'Testing SLA breach detection and notification',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10h ago for 8h resolution
      sla: {
        policyName: 'High Priority SLA',
        priority: 'HIGH',
        responseTimeMinutes: 60,
        resolutionTimeMinutes: 480,
        warningPercentage: 80,
        responseDeadline: new Date(Date.now() - 9 * 60 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000), // expired 2h ago
        firstResponseAt: new Date(Date.now() - 9.5 * 60 * 60 * 1000), // satisfied
        responseBreached: false,
        resolvedAt: null,
        resolutionBreached: false,
        isBreached: false,
        warningNotified: true,
        breachNotified: false,
      },
    });

    await runSlaCheckOnce();

    const notifs = await Notification.find({
      ticketId: breachTicketDoc._id,
      type: 'sla_breach',
    });
    assert(notifs.length >= 1, 'runSlaCheckOnce creates sla_breach notification when resolution deadline expired');

    const updatedBreachDoc = await Ticket.findById(breachTicketDoc._id);
    assert(
      updatedBreachDoc.sla.isBreached === true && updatedBreachDoc.sla.breachNotified === true,
      'SLA Monitor records isBreached = true and breachNotified = true'
    );

    await Ticket.deleteOne({ _id: breachTicketDoc._id });
    await Notification.deleteMany({ ticketId: breachTicketDoc._id });
  }

  console.log('\n--- 7. Testing HTTP Endpoints & RBAC ---');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const customerToken = generateToken({
    userId: testCustomer._id.toString(),
    email: testCustomer.email,
    role: 'customer',
  });

  const agentToken = generateToken({
    userId: testAgent._id.toString(),
    email: testAgent.email,
    role: 'agent',
  });

  const adminToken = generateToken({
    userId: testAdmin._id.toString(),
    email: testAdmin.email,
    role: 'admin',
  });

  async function makeRequest(path, method = 'GET', body = null, token = null) {
    const url = `http://localhost:${port}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const fetchOptions = { method, headers };
    if (body) fetchOptions.body = JSON.stringify(body);
    const res = await fetch(url, fetchOptions);
    const resBody = await res.json().catch(() => ({}));
    return { status: res.status, body: resBody };
  }

  // Test 27: Unauthenticated GET /api/v1/admin/sla/policies -> 401
  {
    const res = await makeRequest('/api/v1/admin/sla/policies', 'GET');
    assert(res.status === 401, 'Unauthenticated GET /api/v1/admin/sla/policies returns 401');
  }

  // Test 28: Customer GET /api/v1/admin/sla/policies -> 403
  {
    const res = await makeRequest('/api/v1/admin/sla/policies', 'GET', null, customerToken);
    assert(res.status === 403, 'Customer GET /api/v1/admin/sla/policies returns 403');
  }

  // Test 29: Agent GET /api/v1/admin/sla/policies -> 403
  {
    const res = await makeRequest('/api/v1/admin/sla/policies', 'GET', null, agentToken);
    assert(res.status === 403, 'Agent GET /api/v1/admin/sla/policies returns 403');
  }

  // Test 30: Admin GET /api/v1/admin/sla/policies -> 200
  {
    const res = await makeRequest('/api/v1/admin/sla/policies', 'GET', null, adminToken);
    assert(
      res.status === 200 && Array.isArray(res.body.data.policies),
      'Admin GET /api/v1/admin/sla/policies returns 200 with policies list'
    );
  }

  // Test 31: Admin POST /api/v1/admin/sla/policies -> 201
  let httpCreatedPolicyId = null;
  {
    const res = await makeRequest(
      '/api/v1/admin/sla/policies',
      'POST',
      {
        name: `VIP Support SLA ${testSuffix}`,
        priority: 'HIGH',
        responseTimeMinutes: 45,
        resolutionTimeMinutes: 300,
        warningPercentage: 85,
        isActive: false, // inactive to avoid duplicate active conflict
      },
      adminToken
    );
    assert(res.status === 201 && res.body.data.policy.name.includes('VIP Support SLA'), 'Admin POST /api/v1/admin/sla/policies returns 201');
    httpCreatedPolicyId = res.body.data.policy.id || res.body.data.policy._id;
  }

  // Test 32: Admin PATCH /api/v1/admin/sla/policies/:policyId -> 200
  {
    const res = await makeRequest(
      `/api/v1/admin/sla/policies/${httpCreatedPolicyId}`,
      'PATCH',
      { responseTimeMinutes: 50 },
      adminToken
    );
    assert(res.status === 200 && res.body.data.policy.responseTimeMinutes === 50, 'Admin PATCH /api/v1/admin/sla/policies/:policyId returns 200');
  }

  // Test 33: Admin PATCH /api/v1/admin/sla/policies/:policyId/status -> 200
  {
    const res = await makeRequest(
      `/api/v1/admin/sla/policies/${httpCreatedPolicyId}/status`,
      'PATCH',
      { isActive: false },
      adminToken
    );
    assert(res.status === 200 && res.body.data.policy.status === 'Inactive', 'Admin PATCH /api/v1/admin/sla/policies/:policyId/status returns 200');
  }

  // Clean up
  await Ticket.deleteMany({ _id: ticket1._id });
  await Category.deleteOne({ _id: testCategory._id });
  await User.deleteMany({ _id: { $in: [testCustomer._id, testAgent._id, testAdmin._id] } });
  await SlaPolicy.deleteMany({ _id: { $in: [customPolicy.id, httpCreatedPolicyId] } });
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
