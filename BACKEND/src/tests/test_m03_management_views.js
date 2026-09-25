import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Category from '../models/Category.js';
import Setting from '../models/Setting.js';
import { generateToken } from '../utils/jwt.util.js';
import { hashPassword } from '../utils/hash.util.js';

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
  console.log('\n======================================================');
  console.log('--- M-03: MANAGEMENT VIEWS BACKEND INTEGRATION TEST ---');
  console.log('======================================================\n');

  console.log('--- 1. Connecting Database & Initializing HTTP Server ---');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/supportdesk';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB at', mongoUri);

  const testSuffix = Date.now().toString().slice(-6);
  const hashedPassword = await hashPassword('Password123!');

  // Create Users
  const adminUser = await User.create({
    name: `Admin M03 ${testSuffix}`,
    email: `admin_m03_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'admin',
    isEmailVerified: true,
    isActive: true,
  });

  const agentUser = await User.create({
    name: `Agent M03 ${testSuffix}`,
    email: `agent_m03_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'agent',
    department: 'Support',
    isEmailVerified: true,
    isActive: true,
  });

  const customerUser = await User.create({
    name: `Customer M03 ${testSuffix}`,
    email: `cust_m03_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'customer',
    isEmailVerified: true,
    isActive: true,
  });

  const testCategory = await Category.create({
    name: `Cat_M03_${testSuffix}`,
    description: 'Category for M03 testing',
    isActive: true,
  });

  const tokenAdmin = generateToken({ userId: adminUser._id.toString(), role: 'admin' });
  const tokenAgent = generateToken({ userId: agentUser._id.toString(), role: 'agent' });
  const tokenCustomer = generateToken({ userId: customerUser._id.toString(), role: 'customer' });

  // Spin up test HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`  Test HTTP server running on port ${port}`);

  function makeRequest(path, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

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
          res.on('data', (chunk) => {
            data += chunk;
          });
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

  // Create real test tickets
  const standardTicket = await Ticket.create({
    ticketNumber: `TKT-M03-STD-${testSuffix}`,
    customerId: customerUser._id,
    assignedTo: agentUser._id,
    categoryId: testCategory._id,
    subject: 'Standard test inquiry',
    description: 'General question about account billing.',
    priority: 'MEDIUM',
    status: 'OPEN',
    sla: {
      isBreached: false,
      responseDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
      resolutionDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000),
    },
  });

  const urgentTicket = await Ticket.create({
    ticketNumber: `TKT-M03-URG-${testSuffix}`,
    customerId: customerUser._id,
    assignedTo: null,
    categoryId: testCategory._id,
    subject: 'Critical production outage',
    description: 'System completely unresponsive for multiple users.',
    priority: 'URGENT',
    status: 'OPEN',
    sla: {
      isBreached: false,
      responseDeadline: new Date(Date.now() + 30 * 60 * 1000),
      resolutionDeadline: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const breachedTicket = await Ticket.create({
    ticketNumber: `TKT-M03-BRC-${testSuffix}`,
    customerId: customerUser._id,
    assignedTo: agentUser._id,
    categoryId: testCategory._id,
    subject: 'Overdue hardware failure',
    description: 'Server motherboard replacement exceeded SLA.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    sla: {
      isBreached: true,
      resolutionBreached: true,
      resolutionDeadline: new Date(Date.now() - 60 * 60 * 1000),
    },
  });

  const resolvedTicket = await Ticket.create({
    ticketNumber: `TKT-M03-RES-${testSuffix}`,
    customerId: customerUser._id,
    assignedTo: agentUser._id,
    categoryId: testCategory._id,
    subject: 'Resolved password issue',
    description: 'Password reset link sent and confirmed working.',
    priority: 'LOW',
    status: 'RESOLVED',
    sla: {
      isBreached: false,
      firstResponseAt: new Date(Date.now() - 30 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 5 * 60 * 1000),
    },
  });

  // =========================================================================
  // Section 2: AllTickets Backend Integration (/api/v1/agent/tickets)
  // =========================================================================
  console.log('\n--- 2. Testing All Tickets Endpoint (/api/v1/agent/tickets) ---');

  // Test 2.1: Agent calls GET /api/v1/agent/tickets
  {
    const res = await makeRequest('/api/v1/agent/tickets', 'GET', null, tokenAgent);
    assert(res.status === 200, 'GET /api/v1/agent/tickets returns 200 for agent');
    assert(res.body.success === true, 'Response has success: true');
    assert(Array.isArray(res.body.data.tickets), 'Response includes tickets array');
    assert(res.body.data.pagination && res.body.data.stats, 'Response includes pagination and stats');

    const foundUrgent = res.body.data.tickets.find((t) => t.ticketNumber === urgentTicket.ticketNumber);
    assert(foundUrgent !== undefined, 'Returns newly created real ticket from database');
    assert(foundUrgent && foundUrgent.sla !== undefined, 'Ticket output includes SLA information');
  }

  // Test 2.2: Admin calls GET /api/v1/agent/tickets
  {
    const res = await makeRequest('/api/v1/agent/tickets', 'GET', null, tokenAdmin);
    assert(res.status === 200, 'Admin can also query GET /api/v1/agent/tickets');
  }

  // Test 2.3: Customer blocked with 403 Forbidden
  {
    const res = await makeRequest('/api/v1/agent/tickets', 'GET', null, tokenCustomer);
    assert(res.status === 403, 'Customer role blocked with 403 Forbidden on agent tickets');
  }

  // Test 2.4: Unauthenticated request blocked with 401 Unauthorized
  {
    const res = await makeRequest('/api/v1/agent/tickets', 'GET', null, null);
    assert(res.status === 401, 'Unauthenticated request blocked with 401 Unauthorized');
  }

  // Test 2.5: Search and status filters
  {
    const res = await makeRequest(
      `/api/v1/agent/tickets?search=${encodeURIComponent(urgentTicket.ticketNumber)}`,
      'GET',
      null,
      tokenAgent
    );
    assert(res.status === 200, 'Search by ticketNumber succeeds');
    assert(res.body.data.tickets.length === 1, 'Search returns exact matching ticket');
    assert(
      res.body.data.tickets[0].ticketNumber === urgentTicket.ticketNumber,
      'Search result matches urgent ticket number'
    );
  }

  // =========================================================================
  // Section 3: Escalated Tickets Integration (isEscalated=true)
  // =========================================================================
  console.log('\n--- 3. Testing Escalated Tickets Query (isEscalated=true) ---');

  // Test 3.1: Query escalated tickets
  {
    const res = await makeRequest('/api/v1/agent/tickets?isEscalated=true', 'GET', null, tokenAgent);
    assert(res.status === 200, 'GET /api/v1/agent/tickets?isEscalated=true returns 200');
    assert(Array.isArray(res.body.data.tickets), 'Returns array of escalated tickets');

    // Urgent and breached tickets should be included
    const hasUrgent = res.body.data.tickets.some((t) => t.ticketNumber === urgentTicket.ticketNumber);
    const hasBreached = res.body.data.tickets.some((t) => t.ticketNumber === breachedTicket.ticketNumber);
    const hasStandard = res.body.data.tickets.some((t) => t.ticketNumber === standardTicket.ticketNumber);

    assert(hasUrgent, 'Escalated tickets includes active URGENT priority ticket');
    assert(hasBreached, 'Escalated tickets includes active SLA-breached ticket');
    assert(!hasStandard, 'Escalated tickets excludes non-breached MEDIUM priority ticket');
  }

  // Test 3.2: Empty match handling
  {
    const res = await makeRequest(
      '/api/v1/agent/tickets?isEscalated=true&search=NONEXISTENT_KEYWORD_XYZ',
      'GET',
      null,
      tokenAgent
    );
    assert(res.status === 200, 'Empty search returns 200');
    assert(res.body.data.tickets.length === 0, 'Empty tickets array returned without error');
    assert(res.body.data.pagination.total === 0, 'Pagination total reflects 0');
  }

  // =========================================================================
  // Section 4: Reports Backend Integration (/api/v1/admin/reports)
  // =========================================================================
  console.log('\n--- 4. Testing Admin Reports Endpoint (/api/v1/admin/reports) ---');

  // Test 4.1: Admin retrieves reports
  {
    const res = await makeRequest('/api/v1/admin/reports?timeframe=30d', 'GET', null, tokenAdmin);
    assert(res.status === 200, 'GET /api/v1/admin/reports returns 200 for admin');
    assert(res.body.success === true, 'Response contains success: true');
    assert(res.body.data && res.body.data.summary, 'Reports payload includes summary metrics');
    assert(res.body.data.volumeTrends, 'Reports payload includes volume trends');
    assert(Array.isArray(res.body.data.agentPerformance), 'Reports payload includes agentPerformance');

    const summary = res.body.data.summary;
    assert(typeof summary.avgResolutionTime === 'string', 'avgResolutionTime is formatted string');
    assert(typeof summary.avgFirstResponse === 'string', 'avgFirstResponse is formatted string');
    assert(typeof summary.resolutionRate === 'string', 'resolutionRate is calculated percentage');
    assert(Array.isArray(summary.categoryBreakdown), 'categoryBreakdown is array');
    assert(summary.slaPerformance && typeof summary.slaPerformance.overallCompliance === 'string', 'slaPerformance has compliance string');
  }

  // Test 4.2: Reports supports 7d, 30d, 90d
  {
    const res7d = await makeRequest('/api/v1/admin/reports?timeframe=7d', 'GET', null, tokenAdmin);
    const res90d = await makeRequest('/api/v1/admin/reports?timeframe=90d', 'GET', null, tokenAdmin);
    assert(res7d.status === 200 && res7d.body.data.timeframe === '7d', 'timeframe=7d handled properly');
    assert(res90d.status === 200 && res90d.body.data.timeframe === '90d', 'timeframe=90d handled properly');
  }

  // Test 4.3: Agent cannot access admin reports
  {
    const res = await makeRequest('/api/v1/admin/reports', 'GET', null, tokenAgent);
    assert(res.status === 403, 'Agent is blocked with 403 Forbidden from admin reports');
  }

  // =========================================================================
  // Section 5: Settings Backend Integration (/api/v1/admin/settings)
  // =========================================================================
  console.log('\n--- 5. Testing Admin Settings Endpoints (/api/v1/admin/settings) ---');

  // Test 5.1: Retrieve default settings
  {
    const res = await makeRequest('/api/v1/admin/settings', 'GET', null, tokenAdmin);
    assert(res.status === 200, 'GET /api/v1/admin/settings returns 200 for admin');
    assert(res.body.success === true, 'Response contains success: true');
    assert(res.body.data && res.body.data.general, 'Settings payload contains general configuration');
    assert(res.body.data.ticketSettings, 'Settings payload contains ticketSettings configuration');
    assert(res.body.data.notifications, 'Settings payload contains notifications configuration');
    assert(res.body.data.security, 'Settings payload contains security configuration');
    assert(res.body.data.appearance, 'Settings payload contains appearance configuration');
  }

  // Test 5.2: Update and persist general & ticket settings via PATCH
  {
    const updatedCompanyName = `SupportDesk Enterprise ${testSuffix}`;
    const patchPayload = {
      general: {
        companyName: updatedCompanyName,
        supportEmail: `support_${testSuffix}@enterprise.io`,
      },
      ticketSettings: {
        autoCloseResolvedDays: 5,
        defaultPriority: 'High',
      },
      notifications: {
        newTicketAlert: false,
        dailyReportEmail: true,
      },
    };

    const res = await makeRequest('/api/v1/admin/settings', 'PATCH', patchPayload, tokenAdmin);
    assert(res.status === 200, 'PATCH /api/v1/admin/settings returns 200');
    assert(res.body.data.general.companyName === updatedCompanyName, 'Updated company name returned');
    assert(res.body.data.ticketSettings.autoCloseResolvedDays === 5, 'Updated autoCloseResolvedDays returned');
    assert(res.body.data.notifications.newTicketAlert === false, 'Updated notification toggle returned');

    // Verify persistence in MongoDB database directly
    const persisted = await Setting.findById('system_settings').lean();
    assert(persisted !== null, 'Setting document exists in MongoDB');
    assert(persisted.general.companyName === updatedCompanyName, 'Company name is actually persisted in MongoDB');
    assert(persisted.ticketSettings.autoCloseResolvedDays === 5, 'Ticket settings are actually persisted in MongoDB');
    assert(persisted.notifications.newTicketAlert === false, 'Notification settings are actually persisted in MongoDB');
  }

  // Test 5.3: Invalid PATCH payload validation
  {
    const res = await makeRequest('/api/v1/admin/settings', 'PATCH', { invalidSection: true }, tokenAdmin);
    assert(res.status === 400, 'Invalid settings section rejected with 400 Validation Error');
  }

  // Test 5.4: Unauthorized access to settings
  {
    const resAgent = await makeRequest('/api/v1/admin/settings', 'GET', null, tokenAgent);
    assert(resAgent.status === 403, 'Agent is blocked with 403 from admin settings');

    const resUnauth = await makeRequest('/api/v1/admin/settings', 'GET', null, null);
    assert(resUnauth.status === 401, 'Unauthenticated request blocked with 401 from admin settings');
  }

  // =========================================================================
  // Section 6: Cleanup
  // =========================================================================
  console.log('\n--- 6. Cleaning Up Test Artifacts ---');
  await Ticket.deleteMany({
    ticketNumber: { $in: [standardTicket.ticketNumber, urgentTicket.ticketNumber, breachedTicket.ticketNumber, resolvedTicket.ticketNumber] },
  });
  await User.deleteMany({
    _id: { $in: [adminUser._id, agentUser._id, customerUser._id] },
  });
  await Category.deleteOne({ _id: testCategory._id });
  server.close();
  await mongoose.disconnect();
  console.log('  Cleaned up test data and closed connections.');

  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
