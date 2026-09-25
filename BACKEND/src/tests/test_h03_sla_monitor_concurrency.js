import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import { hashPassword } from '../utils/hash.util.js';
import {
  runSlaCheckOnce,
  claimSlaWarning,
  claimSlaBreach,
  processTicketWarning,
  processTicketBreach,
} from '../jobs/slaMonitor.job.js';
import { evaluateTicketSla } from '../services/sla/sla.service.js';

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
  console.log('\n================================================================');
  console.log('--- H-03: SLA MONITOR DISTRIBUTED ATOMIC CLAIM TEST SUITE ---');
  console.log('================================================================\n');

  console.log('--- 1. Database Connection & Setup ---');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/supportdesk';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB at', mongoUri);

  const testSuffix = Date.now().toString().slice(-6);
  const hashedPassword = await hashPassword('Password123!');

  // Create test customer, agent, admin
  const customer = await User.create({
    name: `Cust H03 ${testSuffix}`,
    email: `cust_h03_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'customer',
    isEmailVerified: true,
    isActive: true,
  });

  const agent = await User.create({
    name: `Agent H03 ${testSuffix}`,
    email: `agent_h03_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'agent',
    department: 'Support',
    availability: 'Available',
    isEmailVerified: true,
    isActive: true,
  });

  const admin = await User.create({
    name: `Admin H03 ${testSuffix}`,
    email: `admin_h03_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'admin',
    isEmailVerified: true,
    isActive: true,
  });

  const category = await Category.create({
    name: `H03 Category ${testSuffix}`,
    description: 'Category for H03 tests',
    isActive: true,
  });

  const createdTicketIds = [];

  try {
    // =============================================================
    // Test 1: Concurrency Test — SLA Warning Event (10 Concurrent Workers)
    // =============================================================
    console.log('\n--- 2. Test 1: SLA Warning Concurrent Claims (10 Parallel Workers) ---');
    const warningTicket = await Ticket.create({
      ticketNumber: `TKT-WCONC-${testSuffix}`,
      customerId: customer._id,
      assignedTo: agent._id,
      categoryId: category._id,
      subject: `Concurrent Warning Test Ticket ${testSuffix}`,
      description: 'Testing distributed atomic claim on warning event',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      createdAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // 3.5h ago
      sla: {
        policyName: 'Urgent Policy',
        priority: 'URGENT',
        responseTimeMinutes: 30,
        resolutionTimeMinutes: 240, // 4 hours
        warningPercentage: 80, // warning threshold at 3.2h
        responseDeadline: new Date(Date.now() - 3 * 60 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() + 0.5 * 60 * 60 * 1000), // in 30 mins
        firstResponseAt: new Date(Date.now() - 3.4 * 60 * 60 * 1000),
        responseBreached: false,
        resolvedAt: null,
        resolutionBreached: false,
        isBreached: false,
        warningNotified: false,
        breachNotified: false,
      },
    });
    createdTicketIds.push(warningTicket._id);

    const warnEvaluation = evaluateTicketSla(warningTicket, new Date());
    assert(warnEvaluation.isWarning === true, 'Ticket is evaluated in warning state');
    assert(warnEvaluation.isBreached === false, 'Ticket is not in breach state');

    // Simulate 10 concurrent backend worker instances attempting to process warning for the exact same ticket
    const WORKER_COUNT = 10;
    console.log(`  Dispatching ${WORKER_COUNT} concurrent workers to claim warning event...`);

    const warningResults = await Promise.all(
      Array.from({ length: WORKER_COUNT }, () => processTicketWarning(warningTicket, warnEvaluation))
    );

    const successfulWarningClaims = warningResults.filter((r) => r !== null);
    const rejectedWarningClaims = warningResults.filter((r) => r === null);

    console.log(`  Worker results: ${successfulWarningClaims.length} claimed, ${rejectedWarningClaims.length} rejected`);
    assert(successfulWarningClaims.length === 1, `Exactly 1 worker successfully claimed the warning event (Expected: 1, Actual: ${successfulWarningClaims.length})`);
    assert(rejectedWarningClaims.length === WORKER_COUNT - 1, `All other ${WORKER_COUNT - 1} workers were safely rejected`);

    // Verify Notifications in database
    const agentWarningNotifs = await Notification.find({
      ticketId: warningTicket._id,
      recipient: agent._id,
      type: 'sla_warning',
    });
    const adminWarningNotifs = await Notification.find({
      ticketId: warningTicket._id,
      recipient: admin._id,
      type: 'sla_warning',
    });

    console.log(`  Agent warning notifications sent: ${agentWarningNotifs.length}`);
    console.log(`  Admin warning notifications sent: ${adminWarningNotifs.length}`);
    assert(agentWarningNotifs.length === 1, 'Assigned agent received exactly 1 warning notification (0 duplicates)');
    assert(adminWarningNotifs.length === 1, 'Admin received exactly 1 warning notification (0 duplicates)');

    // Verify persisted DB state
    const refreshedWarningDoc = await Ticket.findById(warningTicket._id);
    assert(refreshedWarningDoc.sla.warningNotified === true, 'Persisted DB state has sla.warningNotified = true');
    assert(refreshedWarningDoc.sla.breachNotified === false, 'Persisted DB state retains sla.breachNotified = false');

    // Subsequent worker attempt must also fail to claim
    const lateWarningClaim = await claimSlaWarning(warningTicket._id);
    assert(lateWarningClaim === null, 'Subsequent claim attempt by late worker returns null');

    // =============================================================
    // Test 2: Concurrency Test — SLA Breach Event (10 Concurrent Workers)
    // =============================================================
    console.log('\n--- 3. Test 2: SLA Breach Concurrent Claims (10 Parallel Workers) ---');
    const breachTicket = await Ticket.create({
      ticketNumber: `TKT-BCONC-${testSuffix}`,
      customerId: customer._id,
      assignedTo: agent._id,
      categoryId: category._id,
      subject: `Concurrent Breach Test Ticket ${testSuffix}`,
      description: 'Testing distributed atomic claim on breach event',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      sla: {
        policyName: 'High Policy',
        priority: 'HIGH',
        responseTimeMinutes: 60,
        resolutionTimeMinutes: 480, // 8 hours
        warningPercentage: 80,
        responseDeadline: new Date(Date.now() - 9 * 60 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000), // breached 2h ago
        firstResponseAt: new Date(Date.now() - 9.5 * 60 * 60 * 1000),
        responseBreached: false,
        resolvedAt: null,
        resolutionBreached: false,
        isBreached: false,
        warningNotified: true, // warning was already sent earlier
        breachNotified: false,
      },
    });
    createdTicketIds.push(breachTicket._id);

    const breachEvaluation = evaluateTicketSla(breachTicket, new Date());
    assert(breachEvaluation.isBreached === true, 'Ticket is evaluated in breach state');

    console.log(`  Dispatching ${WORKER_COUNT} concurrent workers to claim breach event...`);
    const breachResults = await Promise.all(
      Array.from({ length: WORKER_COUNT }, () => processTicketBreach(breachTicket, breachEvaluation))
    );

    const successfulBreachClaims = breachResults.filter((r) => r !== null);
    const rejectedBreachClaims = breachResults.filter((r) => r === null);

    console.log(`  Worker results: ${successfulBreachClaims.length} claimed, ${rejectedBreachClaims.length} rejected`);
    assert(successfulBreachClaims.length === 1, `Exactly 1 worker successfully claimed the breach event (Expected: 1, Actual: ${successfulBreachClaims.length})`);
    assert(rejectedBreachClaims.length === WORKER_COUNT - 1, `All other ${WORKER_COUNT - 1} workers were safely rejected`);

    // Verify Notifications in database
    const agentBreachNotifs = await Notification.find({
      ticketId: breachTicket._id,
      recipient: agent._id,
      type: 'sla_breach',
    });
    const adminBreachNotifs = await Notification.find({
      ticketId: breachTicket._id,
      recipient: admin._id,
      type: 'sla_breach',
    });

    console.log(`  Agent breach notifications sent: ${agentBreachNotifs.length}`);
    console.log(`  Admin breach notifications sent: ${adminBreachNotifs.length}`);
    assert(agentBreachNotifs.length === 1, 'Assigned agent received exactly 1 breach notification (0 duplicates)');
    assert(adminBreachNotifs.length === 1, 'Admin received exactly 1 breach notification (0 duplicates)');

    // Verify persisted DB state
    const refreshedBreachDoc = await Ticket.findById(breachTicket._id);
    assert(refreshedBreachDoc.sla.breachNotified === true, 'Persisted DB state has sla.breachNotified = true');
    assert(refreshedBreachDoc.sla.isBreached === true, 'Persisted DB state has sla.isBreached = true');

    // Subsequent worker attempt must also fail to claim
    const lateBreachClaim = await claimSlaBreach(breachTicket._id, breachEvaluation);
    assert(lateBreachClaim === null, 'Subsequent claim attempt by late worker returns null');

    // =============================================================
    // Test 3: Independence of Warning and Breach Events (Lifecycle)
    // =============================================================
    console.log('\n--- 4. Test 3: Warning Event ≠ Breach Event Independence ---');
    const lifecycleTicket = await Ticket.create({
      ticketNumber: `TKT-LIFE-${testSuffix}`,
      customerId: customer._id,
      assignedTo: agent._id,
      categoryId: category._id,
      subject: `Lifecycle Test Ticket ${testSuffix}`,
      description: 'Testing independent warning followed by breach',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      createdAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
      sla: {
        policyName: 'Urgent Policy',
        priority: 'URGENT',
        responseTimeMinutes: 30,
        resolutionTimeMinutes: 240,
        warningPercentage: 80,
        responseDeadline: new Date(Date.now() - 3 * 60 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() + 0.5 * 60 * 60 * 1000),
        firstResponseAt: new Date(Date.now() - 3.4 * 60 * 60 * 1000),
        responseBreached: false,
        resolvedAt: null,
        resolutionBreached: false,
        isBreached: false,
        warningNotified: false,
        breachNotified: false,
      },
    });
    createdTicketIds.push(lifecycleTicket._id);

    // 1. Process Warning
    const warnClaimResult = await claimSlaWarning(lifecycleTicket._id);
    assert(warnClaimResult !== null, 'Warning event claimed successfully');

    const midDoc = await Ticket.findById(lifecycleTicket._id);
    assert(midDoc.sla.warningNotified === true, 'warningNotified is true after warning claim');
    assert(midDoc.sla.breachNotified === false, 'breachNotified remains false after warning claim');

    // 2. Now simulate time passing and ticket reaching breach deadline
    midDoc.sla.resolutionDeadline = new Date(Date.now() - 1000);
    await midDoc.save();

    // 3. Process Breach on the same ticket
    const breachClaimResult = await claimSlaBreach(lifecycleTicket._id, { isResolutionBreached: true });
    assert(breachClaimResult !== null, 'Breach event successfully claimed even though warning was already claimed');

    const finalDoc = await Ticket.findById(lifecycleTicket._id);
    assert(finalDoc.sla.warningNotified === true, 'warningNotified remains true');
    assert(finalDoc.sla.breachNotified === true, 'breachNotified is now true');
    assert(finalDoc.sla.isBreached === true, 'isBreached is now true');

    // =============================================================
    // Test 4: Full Multi-Instance runSlaCheckOnce Simulation
    // =============================================================
    console.log('\n--- 5. Test 4: Concurrent Full runSlaCheckOnce Simulation ---');
    // Create 3 active tickets needing warnings or breaches
    const batchTickets = await Promise.all([
      Ticket.create({
        ticketNumber: `TKT-RUN1-${testSuffix}`,
        customerId: customer._id,
        assignedTo: agent._id,
        categoryId: category._id,
        subject: `Batch Run 1 ${testSuffix}`,
        description: 'Batch ticket in warning',
        priority: 'MEDIUM',
        status: 'OPEN',
        createdAt: new Date(Date.now() - 7.5 * 60 * 60 * 1000),
        sla: {
          policyName: 'Medium Policy',
          priority: 'MEDIUM',
          responseTimeMinutes: 120,
          resolutionTimeMinutes: 480,
          warningPercentage: 80,
          responseDeadline: new Date(Date.now() + 60 * 60 * 1000),
          resolutionDeadline: new Date(Date.now() + 30 * 60 * 1000),
          firstResponseAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
          responseBreached: false,
          resolvedAt: null,
          resolutionBreached: false,
          isBreached: false,
          warningNotified: false,
          breachNotified: false,
        },
      }),
      Ticket.create({
        ticketNumber: `TKT-RUN2-${testSuffix}`,
        customerId: customer._id,
        assignedTo: agent._id,
        categoryId: category._id,
        subject: `Batch Run 2 ${testSuffix}`,
        description: 'Batch ticket in breach',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        sla: {
          policyName: 'High Policy',
          priority: 'HIGH',
          responseTimeMinutes: 60,
          resolutionTimeMinutes: 480,
          warningPercentage: 80,
          responseDeadline: new Date(Date.now() - 11 * 60 * 60 * 1000),
          resolutionDeadline: new Date(Date.now() - 4 * 60 * 60 * 1000),
          firstResponseAt: new Date(Date.now() - 11.5 * 60 * 60 * 1000),
          responseBreached: false,
          resolvedAt: null,
          resolutionBreached: false,
          isBreached: false,
          warningNotified: true,
          breachNotified: false,
        },
      }),
    ]);

    batchTickets.forEach((t) => createdTicketIds.push(t._id));

    // Run 5 instances simultaneously calling runSlaCheckOnce()
    const INSTANCES_COUNT = 5;
    console.log(`  Dispatching ${INSTANCES_COUNT} instances of runSlaCheckOnce() simultaneously...`);
    await Promise.all(Array.from({ length: INSTANCES_COUNT }, () => runSlaCheckOnce()));

    // Verify notifications for batch tickets: exactly 1 alert per recipient
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const expectedPerTicket = totalAdmins + 1; // 1 for each admin in DB + 1 for assigned agent

    const batch1Notifs = await Notification.find({ ticketId: batchTickets[0]._id });
    const batch2Notifs = await Notification.find({ ticketId: batchTickets[1]._id });

    assert(
      batch1Notifs.length === expectedPerTicket,
      `Ticket 1 generated exactly ${expectedPerTicket} notifications (1 per admin + 1 for agent) despite ${INSTANCES_COUNT} concurrent instances`
    );
    assert(
      batch2Notifs.length === expectedPerTicket,
      `Ticket 2 generated exactly ${expectedPerTicket} notifications (1 per admin + 1 for agent) despite ${INSTANCES_COUNT} concurrent instances`
    );

    const b1Recipients = batch1Notifs.map((n) => n.recipient.toString());
    const b1Unique = new Set(b1Recipients);
    assert(b1Recipients.length === b1Unique.size, 'Zero duplicate notifications across recipients for Ticket 1');

    const b2Recipients = batch2Notifs.map((n) => n.recipient.toString());
    const b2Unique = new Set(b2Recipients);
    assert(b2Recipients.length === b2Unique.size, 'Zero duplicate notifications across recipients for Ticket 2');

    const b1Agent = batch1Notifs.filter((n) => n.recipient.toString() === agent._id.toString());
    const b2Agent = batch2Notifs.filter((n) => n.recipient.toString() === agent._id.toString());
    assert(b1Agent.length === 1, 'Agent received exactly 1 warning alert for Ticket 1');
    assert(b2Agent.length === 1, 'Agent received exactly 1 breach alert for Ticket 2');

  } finally {
    console.log('\n--- Cleanup Test Fixtures ---');
    if (createdTicketIds.length > 0) {
      await Ticket.deleteMany({ _id: { $in: createdTicketIds } });
      await Notification.deleteMany({ ticketId: { $in: createdTicketIds } });
      console.log(`  Cleaned up ${createdTicketIds.length} test tickets and related notifications.`);
    }
    await Category.deleteOne({ _id: category._id });
    await User.deleteMany({ _id: { $in: [customer._id, agent._id, admin._id] } });
    console.log('  Cleaned up test users and category.');
    await mongoose.disconnect();
    console.log('  Disconnected from MongoDB.');
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed with unhandled error:', err);
  process.exit(1);
});
