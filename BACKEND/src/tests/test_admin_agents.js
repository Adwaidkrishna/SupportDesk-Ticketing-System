import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Category from '../models/Category.js';
import { generateToken } from '../utils/jwt.util.js';
import { hashPassword } from '../utils/hash.util.js';
import {
  validateAgentId,
  validateUpdateAgentStatus,
  validateUpdateAgent,
} from '../validators/adminAgent.validator.js';
import { getAgents } from '../services/admin/getAgents.service.js';
import { updateAgentStatus } from '../services/admin/updateAgentStatus.service.js';
import { updateAgentDetails } from '../services/admin/updateAgentDetails.service.js';

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
  console.log('\n--- 1. Testing Admin Agent Validators ---');

  // Test 1: validateAgentId rejects invalid ID
  {
    let statusCode = null;
    let jsonBody = null;
    const req = { params: { agentId: 'invalid-id' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: (b) => { jsonBody = b; } };
      },
    };
    validateAgentId(req, res, () => {});
    assert(statusCode === 400 && jsonBody?.success === false, 'validateAgentId rejects invalid ObjectId');
  }

  // Test 2: validateAgentId accepts valid 24-char ObjectId
  {
    let nextCalled = false;
    const req = { params: { agentId: new mongoose.Types.ObjectId().toString() } };
    const res = {};
    validateAgentId(req, res, () => { nextCalled = true; });
    assert(nextCalled === true, 'validateAgentId accepts valid ObjectId');
  }

  // Test 3: validateUpdateAgentStatus rejects invalid status
  {
    let statusCode = null;
    const req = { body: { status: 'Sleeping' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    validateUpdateAgentStatus(req, res, () => {});
    assert(statusCode === 400, 'validateUpdateAgentStatus rejects unsupported status value');
  }

  // Test 4: validateUpdateAgentStatus accepts valid status
  {
    let nextCalled = false;
    const req = { body: { status: 'Busy' } };
    const res = {};
    validateUpdateAgentStatus(req, res, () => { nextCalled = true; });
    assert(nextCalled === true && req.validatedBody?.status === 'Busy', 'validateUpdateAgentStatus accepts "Busy"');
  }

  // Test 5: validateUpdateAgent rejects empty payload
  {
    let statusCode = null;
    const req = { body: {} };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    validateUpdateAgent(req, res, () => {});
    assert(statusCode === 400, 'validateUpdateAgent rejects empty payload');
  }

  // Test 6: validateUpdateAgent accepts valid updates
  {
    let nextCalled = false;
    const req = {
      body: {
        name: 'Agent Smith',
        department: 'Cyber Security',
        status: 'Offline',
      },
    };
    const res = {};
    validateUpdateAgent(req, res, () => { nextCalled = true; });
    assert(
      nextCalled === true &&
      req.validatedBody?.name === 'Agent Smith' &&
      req.validatedBody?.department === 'Cyber Security' &&
      req.validatedBody?.status === 'Offline',
      'validateUpdateAgent validates and extracts allowed agent fields'
    );
  }

  console.log('\n--- 2. Testing Database Services & Workload Calculations (MongoDB) ---');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
  console.log('  Connected to MongoDB successfully.');

  const ts = Date.now();
  const pwd = await hashPassword('AgentPass123!');

  // Create test category for ticket workload test
  let testCat = await Category.findOne({ name: 'Technical' });
  if (!testCat) {
    testCat = await Category.create({ name: `TestCat ${ts}`, description: 'Category for testing' });
  }

  // Create test customer
  const customerUser = await User.create({
    name: `Cust ${ts}`,
    email: `cust_${ts}@example.com`,
    passwordHash: pwd,
    role: 'customer',
    isVerified: true,
    isActive: true,
  });

  // Create test agent A
  const agentA = await User.create({
    name: `Agent Alpha ${ts}`,
    email: `agent_alpha_${ts}@example.com`,
    passwordHash: pwd,
    role: 'agent',
    isVerified: true,
    isActive: true,
    department: 'Tier 1 Support',
    availability: 'Available',
  });

  // Create test agent B (Offline)
  const agentB = await User.create({
    name: `Agent Beta ${ts}`,
    email: `agent_beta_${ts}@example.com`,
    passwordHash: pwd,
    role: 'agent',
    isVerified: true,
    isActive: true,
    department: 'Hardware Support',
    availability: 'Offline',
  });

  // Create test admin
  const adminUser = await User.create({
    name: `Admin Boss ${ts}`,
    email: `admin_boss_${ts}@example.com`,
    passwordHash: pwd,
    role: 'admin',
    isVerified: true,
    isActive: true,
  });

  // Create tickets assigned to Agent A:
  // 1 OPEN, 1 IN_PROGRESS, 1 RESOLVED, 1 CLOSED -> Total 4, Active 2
  const ticket1 = await Ticket.create({
    ticketNumber: `T-${ts}-1`,
    customerId: customerUser._id,
    assignedTo: agentA._id,
    categoryId: testCat._id,
    subject: 'Open ticket',
    description: 'Test description',
    status: 'OPEN',
    priority: 'MEDIUM',
  });

  const ticket2 = await Ticket.create({
    ticketNumber: `T-${ts}-2`,
    customerId: customerUser._id,
    assignedTo: agentA._id,
    categoryId: testCat._id,
    subject: 'In Progress ticket',
    description: 'Test description',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
  });

  const ticket3 = await Ticket.create({
    ticketNumber: `T-${ts}-3`,
    customerId: customerUser._id,
    assignedTo: agentA._id,
    categoryId: testCat._id,
    subject: 'Resolved ticket',
    description: 'Test description',
    status: 'RESOLVED',
    priority: 'LOW',
  });

  const ticket4 = await Ticket.create({
    ticketNumber: `T-${ts}-4`,
    customerId: customerUser._id,
    assignedTo: agentA._id,
    categoryId: testCat._id,
    subject: 'Closed ticket',
    description: 'Test description',
    status: 'CLOSED',
    priority: 'LOW',
  });

  // Test 7: getAgents returns real agents and live workload
  const agentsRes = await getAgents({ search: `${ts}` });
  assert(agentsRes.agents.length === 2, `getAgents returned ${agentsRes.agents.length} matching agents`);

  const foundAgentA = agentsRes.agents.find((a) => a.id === agentA._id.toString());
  assert(foundAgentA !== undefined, 'Agent Alpha found in agents list');
  assert(
    foundAgentA.totalAssigned === 4 &&
    foundAgentA.assigned === 2 &&
    foundAgentA.inProgress === 1 &&
    foundAgentA.resolved === 1 &&
    foundAgentA.closed === 1,
    `Workload accurately calculated from Ticket collection (total: ${foundAgentA.totalAssigned}, active: ${foundAgentA.assigned}, inProgress: ${foundAgentA.inProgress}, resolved: ${foundAgentA.resolved}, closed: ${foundAgentA.closed})`
  );

  // Test 8: KPI statistics
  assert(
    typeof agentsRes.stats.total === 'number' &&
    typeof agentsRes.stats.available === 'number' &&
    typeof agentsRes.stats.busy === 'number' &&
    typeof agentsRes.stats.awayOffline === 'number',
    'KPI metrics (total, available, busy, awayOffline) returned from backend'
  );

  // Test 9: Search by department
  const searchDeptRes = await getAgents({ search: 'Hardware Support' });
  assert(
    searchDeptRes.agents.some((a) => a.id === agentB._id.toString()),
    'Search by department successfully finds Agent Beta'
  );

  // Test 10: Filter by status
  const filterOfflineRes = await getAgents({ status: 'Offline', search: `${ts}` });
  assert(
    filterOfflineRes.agents.length === 1 && filterOfflineRes.agents[0].id === agentB._id.toString(),
    'Filter by status "Offline" returns only Agent Beta'
  );

  // Test 11: Update agent status (availability)
  const updatedStatus = await updateAgentStatus(agentA._id.toString(), 'Busy');
  assert(
    updatedStatus.availability === 'Busy' && updatedStatus.status === 'Busy',
    'updateAgentStatus successfully set availability to Busy'
  );
  const verifyDbAgentA = await User.findById(agentA._id);
  assert(verifyDbAgentA.availability === 'Busy', 'Agent availability change persisted in MongoDB');

  // Test 12: Update agent details
  const updatedDetails = await updateAgentDetails(agentA._id.toString(), {
    name: `Agent Alpha Prime ${ts}`,
    department: 'Special Operations',
  });
  assert(
    updatedDetails.name === `Agent Alpha Prime ${ts}` &&
    updatedDetails.department === 'Special Operations',
    'updateAgentDetails successfully updated name and department'
  );

  console.log('\n--- 3. Testing HTTP API & Authorization (RBAC) ---');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/admin/agents`;

  const customerToken = generateToken({ userId: customerUser._id, role: 'customer' });
  const agentToken = generateToken({ userId: agentA._id, role: 'agent' });
  const adminToken = generateToken({ userId: adminUser._id, role: 'admin' });

  // Test 13: Unauthenticated request -> 401
  const unauthRes = await fetch(baseUrl);
  assert(unauthRes.status === 401, 'Unauthenticated GET /api/v1/admin/agents returns 401');

  // Test 14: Customer role -> 403
  const custRes = await fetch(baseUrl, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custRes.status === 403, 'Customer GET /api/v1/admin/agents returns 403');

  // Test 15: Non-admin agent role -> 403
  const agentReqRes = await fetch(baseUrl, {
    headers: { Authorization: `Bearer ${agentToken}` },
  });
  assert(agentReqRes.status === 403, 'Non-admin agent GET /api/v1/admin/agents returns 403');

  // Test 16: Admin role -> 200 with data
  const adminRes = await fetch(baseUrl, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminJson = await adminRes.json();
  assert(adminRes.status === 200 && Array.isArray(adminJson.data.agents), 'Admin GET /api/v1/admin/agents returns 200 with agents array');

  // Test 17: Admin PATCH /status -> 200
  const patchStatusRes = await fetch(`${baseUrl}/${agentA._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'Away' }),
  });
  const patchStatusJson = await patchStatusRes.json();
  assert(
    patchStatusRes.status === 200 && patchStatusJson.data.agent.availability === 'Away',
    'Admin PATCH /api/v1/admin/agents/:agentId/status returns 200 with updated status'
  );

  // Test 18: Admin PATCH /:agentId details -> 200
  const patchDetailsRes = await fetch(`${baseUrl}/${agentA._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ department: 'Lead Architecture' }),
  });
  const patchDetailsJson = await patchDetailsRes.json();
  assert(
    patchDetailsRes.status === 200 && patchDetailsJson.data.agent.department === 'Lead Architecture',
    'Admin PATCH /api/v1/admin/agents/:agentId returns 200 with updated details'
  );

  // Cleanup test records
  await Ticket.deleteMany({ _id: { $in: [ticket1._id, ticket2._id, ticket3._id, ticket4._id] } });
  await User.deleteMany({ _id: { $in: [customerUser._id, agentA._id, agentB._id, adminUser._id] } });
  if (testCat.name === `TestCat ${ts}`) {
    await Category.deleteOne({ _id: testCat._id });
  }
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  console.log('  Cleaned up test records from MongoDB.');

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
