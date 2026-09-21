import 'dotenv/config';
import mongoose from 'mongoose';
import http from 'http';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Ticket from '../src/models/Ticket.js';
import Notification from '../src/models/Notification.js';
import { generateToken } from '../src/utils/jwt.util.js';
import { hashPassword } from '../src/utils/hash.util.js';

const PORT = 5095;
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

async function runDashboardTests() {
  console.log('====================================================');
  console.log('       SUPPORTDESK BACKEND DASHBOARD TEST SUITE     ');
  console.log('====================================================\n');

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
  let agent1 = null;
  let agent2 = null;
  let admin = null;
  let catBilling = null;
  let catTech = null;

  try {
    await connectDB();
    server = app.listen(PORT);
    console.log(`📡 In-process test server running on port ${PORT}`);

    const passwordHash = await hashPassword('DashboardTest123!');

    // ─── 1. Setup Test Users & Categories ──────────────────────────────────────
    // Customer A
    customerA = await User.create({
      name: 'Customer Alice',
      email: `dash_alice_${Date.now()}@example.com`,
      passwordHash,
      role: 'customer',
      isVerified: true,
    });

    // Customer B
    customerB = await User.create({
      name: 'Customer Bob',
      email: `dash_bob_${Date.now()}@example.com`,
      passwordHash,
      role: 'customer',
      isVerified: true,
    });

    // Agent 1 (Active workload)
    agent1 = await User.create({
      name: 'Agent Sarah',
      email: `dash_agent_sarah_${Date.now()}@example.com`,
      passwordHash,
      role: 'agent',
      isVerified: true,
    });

    // Agent 2 (Zero tickets assigned - verifies 0-workload test)
    agent2 = await User.create({
      name: 'Agent Zero',
      email: `dash_agent_zero_${Date.now()}@example.com`,
      passwordHash,
      role: 'agent',
      isVerified: true,
    });

    // Admin
    admin = await User.create({
      name: 'Admin Chief',
      email: `dash_admin_${Date.now()}@example.com`,
      passwordHash,
      role: 'admin',
      isVerified: true,
    });

    // Categories
    catBilling = await Category.create({
      name: `Billing Inquiries ${Date.now()}`,
      description: 'Billing & Invoice issues',
      isActive: true,
    });

    catTech = await Category.create({
      name: `Technical Support ${Date.now()}`,
      description: 'Technical issues & bug reports',
      isActive: true,
    });

    // ─── 2. Seed Tickets with Exact Known Counts ───────────────────────────────
    // Customer A Tickets:
    // 1. OPEN (LOW, Billing) - Unassigned
    // 2. IN_PROGRESS (HIGH, Tech) - Assigned to Agent 1
    // 3. RESOLVED (MEDIUM, Tech) - Assigned to Agent 1
    // 4. CLOSED (URGENT, Billing) - Assigned to Agent 1
    // Customer B Tickets:
    // 5. OPEN (URGENT, Tech) - Unassigned
    // 6. IN_PROGRESS (MEDIUM, Billing) - Assigned to Agent 1
    const tktA1 = await Ticket.create({
      ticketNumber: `TKT-DA-01-${Date.now()}`,
      customerId: customerA._id,
      assignedTo: null,
      categoryId: catBilling._id,
      subject: 'Alice Ticket 1 (Billing Open)',
      description: 'Alice billing ticket description',
      priority: 'LOW',
      status: 'OPEN',
    });

    const tktA2 = await Ticket.create({
      ticketNumber: `TKT-DA-02-${Date.now()}`,
      customerId: customerA._id,
      assignedTo: agent1._id,
      categoryId: catTech._id,
      subject: 'Alice Ticket 2 (Tech In Progress High)',
      description: 'Alice technical high priority ticket',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
    });

    const tktA3 = await Ticket.create({
      ticketNumber: `TKT-DA-03-${Date.now()}`,
      customerId: customerA._id,
      assignedTo: agent1._id,
      categoryId: catTech._id,
      subject: 'Alice Ticket 3 (Tech Resolved Medium)',
      description: 'Alice technical resolved ticket',
      priority: 'MEDIUM',
      status: 'RESOLVED',
    });

    const tktA4 = await Ticket.create({
      ticketNumber: `TKT-DA-04-${Date.now()}`,
      customerId: customerA._id,
      assignedTo: agent1._id,
      categoryId: catBilling._id,
      subject: 'Alice Ticket 4 (Billing Closed Urgent)',
      description: 'Alice billing closed ticket',
      priority: 'URGENT',
      status: 'CLOSED',
    });

    const tktB1 = await Ticket.create({
      ticketNumber: `TKT-DB-01-${Date.now()}`,
      customerId: customerB._id,
      assignedTo: null,
      categoryId: catTech._id,
      subject: 'Bob Ticket 1 (Tech Open Urgent)',
      description: 'Bob technical urgent ticket',
      priority: 'URGENT',
      status: 'OPEN',
    });

    const tktB2 = await Ticket.create({
      ticketNumber: `TKT-DB-02-${Date.now()}`,
      customerId: customerB._id,
      assignedTo: agent1._id,
      categoryId: catBilling._id,
      subject: 'Bob Ticket 2 (Billing In Progress Medium)',
      description: 'Bob billing in progress ticket',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
    });

    // Seed Notifications for Customer A: 1 unread, 1 read
    await Notification.create([
      {
        recipient: customerA._id,
        sender: agent1._id,
        type: 'ticket_reply',
        title: 'New Reply on Alice Ticket',
        message: 'Agent Sarah replied to your ticket.',
        ticketId: tktA2._id,
        ticketNumber: tktA2.ticketNumber,
        read: false,
      },
      {
        recipient: customerA._id,
        sender: agent1._id,
        type: 'status_changed',
        title: 'Status Updated',
        message: 'Your ticket is now in progress.',
        ticketId: tktA2._id,
        ticketNumber: tktA2.ticketNumber,
        read: true,
        readAt: new Date(),
      },
    ]);

    // Tokens
    const tokenCustA = generateToken({ userId: customerA._id.toString(), role: customerA.role });
    const tokenCustB = generateToken({ userId: customerB._id.toString(), role: customerB.role });
    const tokenAgent1 = generateToken({ userId: agent1._id.toString(), role: agent1.role });
    const tokenAgent2 = generateToken({ userId: agent2._id.toString(), role: agent2.role });
    const tokenAdmin = generateToken({ userId: admin._id.toString(), role: admin.role });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 1: AUTHENTICATION & RBAC ENFORCEMENT
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 1: AUTHENTICATION & RBAC ENFORCEMENT ---');

    // 1.1 Unauthenticated requests return 401
    const resNoAuthCust = await makeRequest('GET', '/dashboard/customer');
    assert(resNoAuthCust.status === 401, 'Unauthenticated GET /dashboard/customer returns 401');

    const resNoAuthAgent = await makeRequest('GET', '/dashboard/agent');
    assert(resNoAuthAgent.status === 401, 'Unauthenticated GET /dashboard/agent returns 401');

    const resNoAuthAdmin = await makeRequest('GET', '/dashboard/admin');
    assert(resNoAuthAdmin.status === 401, 'Unauthenticated GET /dashboard/admin returns 401');

    // 1.2 Customer role boundary
    const resCustOnAgent = await makeRequest('GET', '/dashboard/agent', tokenCustA);
    assert(resCustOnAgent.status === 403, 'Customer role accessing /dashboard/agent returns 403 Forbidden');

    const resCustOnAdmin = await makeRequest('GET', '/dashboard/admin', tokenCustA);
    assert(resCustOnAdmin.status === 403, 'Customer role accessing /dashboard/admin returns 403 Forbidden');

    // 1.3 Agent role boundary
    const resAgentOnCust = await makeRequest('GET', '/dashboard/customer', tokenAgent1);
    assert(resAgentOnCust.status === 403, 'Agent role accessing /dashboard/customer returns 403 Forbidden');

    const resAgentOnAdmin = await makeRequest('GET', '/dashboard/admin', tokenAgent1);
    assert(resAgentOnAdmin.status === 403, 'Agent role accessing /dashboard/admin returns 403 Forbidden');

    // 1.4 Admin role boundary (Role isolation: admin accesses admin dashboard)
    const resAdminOnCust = await makeRequest('GET', '/dashboard/customer', tokenAdmin);
    assert(resAdminOnCust.status === 403, 'Admin role accessing /dashboard/customer returns 403 Forbidden');

    const resAdminOnAgent = await makeRequest('GET', '/dashboard/agent', tokenAdmin);
    assert(resAdminOnAgent.status === 403, 'Admin role accessing /dashboard/agent returns 403 Forbidden');

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 2: CUSTOMER DASHBOARD & DATA ISOLATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 2: CUSTOMER DASHBOARD & DATA ISOLATION ---');

    const resCustA = await makeRequest('GET', '/dashboard/customer', tokenCustA);
    assert(resCustA.status === 200, 'Customer A accesses /dashboard/customer with 200 OK');
    assert(resCustA.body.success === true, 'Response envelope has success: true');

    const dataCustA = resCustA.body.data;
    assert(Boolean(dataCustA && dataCustA.stats), 'Customer dashboard returns stats object');

    // Expected Customer A stats: total=4, open=1, inProgress=1, resolved=1, closed=1
    assert(dataCustA.stats.total === 4, `Customer A total tickets: expected 4, got ${dataCustA.stats.total}`);
    assert(dataCustA.stats.open === 1, `Customer A open tickets: expected 1, got ${dataCustA.stats.open}`);
    assert(dataCustA.stats.inProgress === 1, `Customer A inProgress tickets: expected 1, got ${dataCustA.stats.inProgress}`);
    assert(dataCustA.stats.resolved === 1, `Customer A resolved tickets: expected 1, got ${dataCustA.stats.resolved}`);
    assert(dataCustA.stats.closed === 1, `Customer A closed tickets: expected 1, got ${dataCustA.stats.closed}`);

    // Recent tickets isolation
    assert(Array.isArray(dataCustA.recentTickets), 'recentTickets is an array');
    assert(dataCustA.recentTickets.length === 4, `Customer A recentTickets count is 4 (got ${dataCustA.recentTickets.length})`);

    const hasBobInAlice = dataCustA.recentTickets.some((t) => t.subject.includes('Bob'));
    assert(!hasBobInAlice, 'Customer A dashboard contains ZERO tickets belonging to Customer B');

    // Category populated
    const firstTicket = dataCustA.recentTickets[0];
    assert(Boolean(firstTicket.category && firstTicket.category.name), 'Recent tickets have populated category name');

    // Notifications
    assert(dataCustA.notifications.unreadCount === 1, `Customer A unread notifications: expected 1, got ${dataCustA.notifications.unreadCount}`);
    assert(dataCustA.notifications.recent.length === 2, `Customer A recent notifications: expected 2, got ${dataCustA.notifications.recent.length}`);

    // Test Customer B isolation
    const resCustB = await makeRequest('GET', '/dashboard/customer', tokenCustB);
    assert(resCustB.status === 200, 'Customer B accesses /dashboard/customer with 200 OK');
    assert(resCustB.body.data.stats.total === 2, `Customer B total tickets: expected 2, got ${resCustB.body.data.stats.total}`);
    assert(resCustB.body.data.stats.open === 1, `Customer B open tickets: expected 1, got ${resCustB.body.data.stats.open}`);
    assert(resCustB.body.data.stats.inProgress === 1, `Customer B inProgress tickets: expected 1, got ${resCustB.body.data.stats.inProgress}`);
    assert(resCustB.body.data.recentTickets.length === 2, 'Customer B has 2 recent tickets');
    const hasAliceInBob = resCustB.body.data.recentTickets.some((t) => t.subject.includes('Alice'));
    assert(!hasAliceInBob, 'Customer B dashboard contains ZERO tickets belonging to Customer A');

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 3: AGENT DASHBOARD & WORKLOAD ISOLATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 3: AGENT DASHBOARD & WORKLOAD ISOLATION ---');

    const resAgent1 = await makeRequest('GET', '/dashboard/agent', tokenAgent1);
    assert(resAgent1.status === 200, 'Agent 1 accesses /dashboard/agent with 200 OK');
    assert(resAgent1.body.success === true, 'Response envelope has success: true');

    const dataAgent1 = resAgent1.body.data;
    assert(Boolean(dataAgent1 && dataAgent1.stats && dataAgent1.workload), 'Agent response has stats and workload');

    // Available tickets in queue: Alice Ticket 1 (OPEN, unassigned) + Bob Ticket 1 (OPEN, unassigned) = at least 2
    // We check that availableTickets >= 2
    assert(dataAgent1.stats.availableTickets >= 2, `Available queue count: expected >= 2, got ${dataAgent1.stats.availableTickets}`);

    // Agent 1 assigned tickets:
    // Alice Tkt 2 (IN_PROGRESS, HIGH)
    // Alice Tkt 3 (RESOLVED, MEDIUM)
    // Alice Tkt 4 (CLOSED, URGENT)
    // Bob Tkt 2 (IN_PROGRESS, MEDIUM)
    // myActiveTickets = OPEN + IN_PROGRESS = 2 (Alice Tkt 2 + Bob Tkt 2)
    // myResolvedTickets = 1 (Alice Tkt 3)
    // myClosedTickets = 1 (Alice Tkt 4)
    // totalAssigned = 2 + 1 + 1 = 4
    // myHighUrgentTickets = active high/urgent = 1 (Alice Tkt 2 is HIGH and IN_PROGRESS; Alice Tkt 4 is CLOSED so not active)
    assert(dataAgent1.stats.myActiveTickets === 2, `Agent 1 myActiveTickets: expected 2, got ${dataAgent1.stats.myActiveTickets}`);
    assert(dataAgent1.stats.myResolvedTickets === 1, `Agent 1 myResolvedTickets: expected 1, got ${dataAgent1.stats.myResolvedTickets}`);
    assert(dataAgent1.stats.myClosedTickets === 1, `Agent 1 myClosedTickets: expected 1, got ${dataAgent1.stats.myClosedTickets}`);
    assert(dataAgent1.stats.myHighUrgentTickets === 1, `Agent 1 myHighUrgentTickets: expected 1, got ${dataAgent1.stats.myHighUrgentTickets}`);
    assert(dataAgent1.workload.totalAssigned === 4, `Agent 1 workload.totalAssigned: expected 4, got ${dataAgent1.workload.totalAssigned}`);

    // Recent assigned tickets
    assert(Array.isArray(dataAgent1.recentAssignedTickets), 'recentAssignedTickets is an array');
    assert(dataAgent1.recentAssignedTickets.length === 4, `recentAssignedTickets has 4 tickets (got ${dataAgent1.recentAssignedTickets.length})`);
    assert(Boolean(dataAgent1.recentAssignedTickets[0].customer.name), 'Assigned tickets populate customer name');
    assert(Boolean(dataAgent1.recentAssignedTickets[0].category.name), 'Assigned tickets populate category name');

    // Test Agent 2 (Zero workload agent)
    const resAgent2 = await makeRequest('GET', '/dashboard/agent', tokenAgent2);
    assert(resAgent2.status === 200, 'Agent 2 (0 workload) accesses /dashboard/agent with 200 OK');
    assert(resAgent2.body.data.stats.myActiveTickets === 0, `Agent 2 active tickets: expected 0, got ${resAgent2.body.data.stats.myActiveTickets}`);
    assert(resAgent2.body.data.stats.myResolvedTickets === 0, `Agent 2 resolved tickets: expected 0, got ${resAgent2.body.data.stats.myResolvedTickets}`);
    assert(resAgent2.body.data.stats.myClosedTickets === 0, `Agent 2 closed tickets: expected 0, got ${resAgent2.body.data.stats.myClosedTickets}`);
    assert(resAgent2.body.data.workload.totalAssigned === 0, `Agent 2 totalAssigned: expected 0, got ${resAgent2.body.data.workload.totalAssigned}`);
    assert(resAgent2.body.data.recentAssignedTickets.length === 0, 'Agent 2 has 0 recent assigned tickets');
    // Available queue is global and visible to Agent 2
    assert(resAgent2.body.data.stats.availableTickets >= 2, 'Agent 2 sees unassigned available queue');

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 4: ADMIN DASHBOARD SYSTEM-WIDE METRICS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 4: ADMIN DASHBOARD SYSTEM-WIDE METRICS ---');

    const resAdmin = await makeRequest('GET', '/dashboard/admin', tokenAdmin);
    assert(resAdmin.status === 200, 'Admin accesses /dashboard/admin with 200 OK');
    assert(resAdmin.body.success === true, 'Response envelope has success: true');

    const dataAdmin = resAdmin.body.data;
    assert(Boolean(dataAdmin.userStats), 'userStats exists in admin dashboard');
    assert(Boolean(dataAdmin.ticketStats), 'ticketStats exists in admin dashboard');
    assert(Boolean(dataAdmin.ticketsByPriority), 'ticketsByPriority exists in admin dashboard');
    assert(Boolean(dataAdmin.ticketsByCategory), 'ticketsByCategory exists in admin dashboard');
    assert(Boolean(dataAdmin.agentWorkload), 'agentWorkload exists in admin dashboard');
    assert(Boolean(dataAdmin.recentTicketActivity), 'recentTicketActivity exists in admin dashboard');

    // Verify User Stats
    assert(dataAdmin.userStats.customers >= 2, `Admin userStats.customers: expected >= 2, got ${dataAdmin.userStats.customers}`);
    assert(dataAdmin.userStats.agents >= 2, `Admin userStats.agents: expected >= 2, got ${dataAdmin.userStats.agents}`);
    assert(dataAdmin.userStats.admins >= 1, `Admin userStats.admins: expected >= 1, got ${dataAdmin.userStats.admins}`);
    assert(dataAdmin.userStats.total >= 5, `Admin userStats.total: expected >= 5, got ${dataAdmin.userStats.total}`);

    // Verify Ticket Status Stats
    assert(dataAdmin.ticketStats.total >= 6, `Admin ticketStats.total: expected >= 6, got ${dataAdmin.ticketStats.total}`);
    assert(dataAdmin.ticketStats.open >= 2, `Admin ticketStats.open: expected >= 2, got ${dataAdmin.ticketStats.open}`);
    assert(dataAdmin.ticketStats.inProgress >= 2, `Admin ticketStats.inProgress: expected >= 2, got ${dataAdmin.ticketStats.inProgress}`);
    assert(dataAdmin.ticketStats.resolved >= 1, `Admin ticketStats.resolved: expected >= 1, got ${dataAdmin.ticketStats.resolved}`);
    assert(dataAdmin.ticketStats.closed >= 1, `Admin ticketStats.closed: expected >= 1, got ${dataAdmin.ticketStats.closed}`);

    // Verify Priority Breakdown
    assert(dataAdmin.ticketsByPriority.LOW >= 1, `ticketsByPriority.LOW >= 1 (got ${dataAdmin.ticketsByPriority.LOW})`);
    assert(dataAdmin.ticketsByPriority.MEDIUM >= 2, `ticketsByPriority.MEDIUM >= 2 (got ${dataAdmin.ticketsByPriority.MEDIUM})`);
    assert(dataAdmin.ticketsByPriority.HIGH >= 1, `ticketsByPriority.HIGH >= 1 (got ${dataAdmin.ticketsByPriority.HIGH})`);
    assert(dataAdmin.ticketsByPriority.URGENT >= 2, `ticketsByPriority.URGENT >= 2 (got ${dataAdmin.ticketsByPriority.URGENT})`);

    // Verify Category Breakdown
    assert(Array.isArray(dataAdmin.ticketsByCategory), 'ticketsByCategory is an array');
    const billingCatItem = dataAdmin.ticketsByCategory.find((c) => c.categoryId === catBilling._id.toString());
    assert(Boolean(billingCatItem), 'Billing category found in ticketsByCategory');
    assert(billingCatItem && billingCatItem.count === 3, `Billing category ticket count: expected 3, got ${billingCatItem?.count}`);

    const techCatItem = dataAdmin.ticketsByCategory.find((c) => c.categoryId === catTech._id.toString());
    assert(Boolean(techCatItem), 'Tech category found in ticketsByCategory');
    assert(techCatItem && techCatItem.count === 3, `Tech category ticket count: expected 3, got ${techCatItem?.count}`);

    // Verify Agent Workload Breakdown (CRITICAL: Agent 2 with 0 tickets must be present!)
    assert(Array.isArray(dataAdmin.agentWorkload), 'agentWorkload is an array');

    const agent1Entry = dataAdmin.agentWorkload.find((a) => a.agentId === agent1._id.toString());
    assert(Boolean(agent1Entry), 'Agent 1 found in agentWorkload');
    assert(agent1Entry && agent1Entry.totalAssigned === 4, `Agent 1 totalAssigned: expected 4, got ${agent1Entry?.totalAssigned}`);
    assert(agent1Entry && agent1Entry.active === 2, `Agent 1 active: expected 2, got ${agent1Entry?.active}`);
    assert(agent1Entry && agent1Entry.resolved === 1, `Agent 1 resolved: expected 1, got ${agent1Entry?.resolved}`);
    assert(agent1Entry && agent1Entry.closed === 1, `Agent 1 closed: expected 1, got ${agent1Entry?.closed}`);

    const agent2Entry = dataAdmin.agentWorkload.find((a) => a.agentId === agent2._id.toString());
    assert(Boolean(agent2Entry), 'Agent 2 (0 assigned tickets) is successfully included in admin agentWorkload');
    assert(agent2Entry && agent2Entry.totalAssigned === 0, `Agent 2 totalAssigned: expected 0, got ${agent2Entry?.totalAssigned}`);
    assert(agent2Entry && agent2Entry.active === 0, `Agent 2 active: expected 0, got ${agent2Entry?.active}`);
    assert(agent2Entry && agent2Entry.resolved === 0, `Agent 2 resolved: expected 0, got ${agent2Entry?.resolved}`);
    assert(agent2Entry && agent2Entry.closed === 0, `Agent 2 closed: expected 0, got ${agent2Entry?.closed}`);

    // Verify Recent Ticket Activity
    assert(Array.isArray(dataAdmin.recentTicketActivity), 'recentTicketActivity is an array');
    assert(dataAdmin.recentTicketActivity.length >= 6, `recentTicketActivity length >= 6 (got ${dataAdmin.recentTicketActivity.length})`);
    const sampleActivity = dataAdmin.recentTicketActivity[0];
    assert(Boolean(sampleActivity.ticketNumber && sampleActivity.subject), 'recentTicketActivity items have ticketNumber and subject');
    assert(Boolean(sampleActivity.customer && sampleActivity.customer.name), 'recentTicketActivity items have customer name');

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('CRITICAL TEST ERROR:', err);
    failedCount++;
  } finally {
    // ─── Teardown & Fixture Cleanup ──────────────────────────────────────────
    console.log('🧹 Cleaning up test fixtures...');
    try {
      const userIds = [customerA?._id, customerB?._id, agent1?._id, agent2?._id, admin?._id].filter(Boolean);
      const catIds = [catBilling?._id, catTech?._id].filter(Boolean);

      if (userIds.length > 0) {
        await Ticket.deleteMany({ customerId: { $in: userIds } });
        await Notification.deleteMany({ recipient: { $in: userIds } });
        await User.deleteMany({ _id: { $in: userIds } });
      }
      if (catIds.length > 0) {
        await Category.deleteMany({ _id: { $in: catIds } });
      }
      console.log('✨ Cleanup completed successfully.');
    } catch (cleanErr) {
      console.error('Cleanup error:', cleanErr);
    }

    if (server) {
      server.close();
    }
    await mongoose.connection.close();
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runDashboardTests();
