import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import TicketMessage from '../models/TicketMessage.js';
import Category from '../models/Category.js';
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

/**
 * Helper to recursively search an explain plan for a stage matching stageName
 * and return the stage object.
 */
function findStage(plan, stageName) {
  if (!plan) return null;
  if (plan.stage === stageName) return plan;
  if (plan.inputStage) {
    const found = findStage(plan.inputStage, stageName);
    if (found) return found;
  }
  if (plan.inputStages) {
    for (const sub of plan.inputStages) {
      const found = findStage(sub, stageName);
      if (found) return found;
    }
  }
  return null;
}

async function runTests() {
  console.log('\n================================================================');
  console.log('--- M-02: DATABASE QUERY PERFORMANCE INDEXES TEST SUITE ---');
  console.log('================================================================\n');

  console.log('--- 1. Database Connection & Model Initialization ---');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/supportdesk';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB at', mongoUri);

  // Synchronize/ensure all indexes exist in MongoDB
  await User.init();
  await TicketMessage.init();
  await Ticket.init();

  const testSuffix = Date.now().toString().slice(-6);
  const hashedPassword = await hashPassword('TestPass123!');

  const testUser = await User.create({
    name: `User M02 ${testSuffix}`,
    email: `user_m02_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'admin',
    isActive: true,
  });

  const testCategory = await Category.create({
    name: `Cat M02 ${testSuffix}`,
    description: 'Category for M02 test',
    isActive: true,
  });

  const testTicket = await Ticket.create({
    ticketNumber: `TKT-M02-${testSuffix}`,
    customerId: testUser._id,
    categoryId: testCategory._id,
    subject: `M02 Index Test Ticket ${testSuffix}`,
    description: 'Testing queries against new indexes',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    sla: {
      policyName: 'High Policy',
      priority: 'HIGH',
      responseDeadline: new Date(Date.now() + 60 * 60 * 1000),
      resolutionDeadline: new Date(Date.now() + 240 * 60 * 1000),
    },
  });

  const testMessages = await Promise.all([
    TicketMessage.create({
      ticketId: testTicket._id,
      senderId: testUser._id,
      senderRole: 'admin',
      body: 'Message 1 for ticket',
    }),
    TicketMessage.create({
      ticketId: testTicket._id,
      senderId: testUser._id,
      senderRole: 'admin',
      body: 'Message 2 for ticket',
    }),
  ]);

  try {
    // =============================================================
    // Test 1: User.role Index Verification
    // =============================================================
    console.log('\n--- 2. Test 1: User.role Index Verification ---');
    const userIndexes = await User.collection.indexes();
    const roleIndexes = userIndexes.filter((idx) => idx.key && idx.key.role !== undefined);

    assert(roleIndexes.length === 1, `User collection has exactly 1 index containing role (found: ${roleIndexes.length})`);
    const roleIndex = roleIndexes[0];
    assert(roleIndex !== undefined, 'role index exists on User collection');
    assert(roleIndex?.key?.role === 1, 'role index key pattern is { role: 1 }');
    assert(roleIndex?.name === 'role_1', 'role index is named role_1');

    // Query execution & explain plan
    const userQuery = User.find({ role: 'admin' });
    const userResults = await userQuery.exec();
    assert(userResults.length >= 1, `User.find({ role: 'admin' }) executed successfully (returned ${userResults.length} users)`);

    const userExplain = await User.find({ role: 'admin' }).explain('queryPlanner');
    const userIxScan = findStage(userExplain.queryPlanner.winningPlan, 'IXSCAN');
    assert(userIxScan !== null, 'User role query uses an Index Scan (IXSCAN)');
    assert(userIxScan?.indexName === 'role_1', `User query uses index: ${userIxScan?.indexName}`);

    // =============================================================
    // Test 2: TicketMessage { ticketId: 1, createdAt: 1 } Verification
    // =============================================================
    console.log('\n--- 3. Test 2: TicketMessage { ticketId: 1, createdAt: 1 } Index Verification ---');
    const tmIndexes = await TicketMessage.collection.indexes();
    const tmCompoundIndexes = tmIndexes.filter(
      (idx) => idx.key && idx.key.ticketId === 1 && idx.key.createdAt === 1
    );

    assert(tmCompoundIndexes.length === 1, `TicketMessage has exactly 1 compound index on { ticketId: 1, createdAt: 1 } (found: ${tmCompoundIndexes.length})`);
    const tmIndex = tmCompoundIndexes[0];
    assert(tmIndex !== undefined, 'Compound index on { ticketId: 1, createdAt: 1 } exists');
    assert(tmIndex?.name === 'ticketId_1_createdAt_1', 'Index name is ticketId_1_createdAt_1');

    // Query execution & explain plan
    const tmQuery = TicketMessage.find({ ticketId: testTicket._id }).sort({ createdAt: 1 });
    const tmResults = await tmQuery.exec();
    assert(tmResults.length === testMessages.length, `TicketMessage query returned all ${testMessages.length} messages in sorted order`);

    const tmExplain = await TicketMessage.find({ ticketId: testTicket._id })
      .sort({ createdAt: 1 })
      .explain('queryPlanner');
    const tmIxScan = findStage(tmExplain.queryPlanner.winningPlan, 'IXSCAN');
    assert(tmIxScan !== null, 'TicketMessage query uses an Index Scan (IXSCAN)');
    assert(tmIxScan?.indexName === 'ticketId_1_createdAt_1', `TicketMessage query uses index: ${tmIxScan?.indexName}`);

    // =============================================================
    // Test 3: Ticket { status: 1, 'sla.responseDeadline': 1 } Verification
    // =============================================================
    console.log('\n--- 4. Test 3: Ticket { status: 1, "sla.responseDeadline": 1 } Index Verification ---');
    const ticketIndexes = await Ticket.collection.indexes();
    const ticketCompoundIndexes = ticketIndexes.filter(
      (idx) => idx.key && idx.key.status === 1 && idx.key['sla.responseDeadline'] === 1
    );

    assert(ticketCompoundIndexes.length === 1, `Ticket has exactly 1 compound index on { status: 1, "sla.responseDeadline": 1 } (found: ${ticketCompoundIndexes.length})`);
    const ticketIndex = ticketCompoundIndexes[0];
    assert(ticketIndex !== undefined, 'Compound index on { status: 1, "sla.responseDeadline": 1 } exists');
    assert(ticketIndex?.name === 'status_1_sla.responseDeadline_1', 'Index name is status_1_sla.responseDeadline_1');

    // SLA Monitor Query execution & explain plan
    const slaQueryCriteria = {
      status: { $in: ['OPEN', 'IN_PROGRESS'] },
      'sla.responseDeadline': { $ne: null },
    };
    const ticketResults = await Ticket.find(slaQueryCriteria).exec();
    assert(ticketResults.length >= 1, `SLA Monitor query executed successfully (returned ${ticketResults.length} active tickets)`);

    const ticketExplain = await Ticket.find(slaQueryCriteria).explain('queryPlanner');
    const ticketIxScan = findStage(ticketExplain.queryPlanner.winningPlan, 'IXSCAN');
    assert(ticketIxScan !== null, 'Ticket SLA monitor query uses an Index Scan (IXSCAN)');
    console.log(`  SLA Query winning index: ${ticketIxScan?.indexName}`);
    assert(
      ticketIxScan?.indexName === 'status_1_sla.responseDeadline_1' ||
      ticketIxScan?.indexName === 'sla.responseDeadline_1',
      `SLA Query successfully uses indexed access (Index: ${ticketIxScan?.indexName})`
    );

  } finally {
    console.log('\n--- Cleanup Test Fixtures ---');
    await TicketMessage.deleteMany({ ticketId: testTicket._id });
    await Ticket.deleteOne({ _id: testTicket._id });
    await Category.deleteOne({ _id: testCategory._id });
    await User.deleteOne({ _id: testUser._id });
    console.log('  Cleaned up test records.');
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
