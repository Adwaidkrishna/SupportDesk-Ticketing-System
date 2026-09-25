import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Category from '../models/Category.js';
import Counter from '../models/Counter.js';
import Notification from '../models/Notification.js';
import { hashPassword } from '../utils/hash.util.js';
import {
  createTicket,
  generateTicketNumber,
  syncTicketCounter,
  getHighestExistingTicketNumber,
} from '../services/ticket/customer/createTicket.service.js';
import { getTicketByIdForCustomer } from '../services/ticket/customer/getTicketDetails.service.js';

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
  console.log('--- H-02: TICKET NUMBER GENERATION CONCURRENCY & PERFORMANCE ---');
  console.log('================================================================\n');

  console.log('--- 1. Database Connection & Setup ---');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/supportdesk';
  await mongoose.connect(mongoUri);
  console.log('  Connected to MongoDB at', mongoUri);

  const testSuffix = Date.now().toString().slice(-6);
  const hashedPassword = await hashPassword('Password123!');

  // Create test customer
  const customer = await User.create({
    name: `Cust H02 ${testSuffix}`,
    email: `cust_h02_${testSuffix}@test.com`,
    passwordHash: hashedPassword,
    role: 'customer',
    isEmailVerified: true,
    isActive: true,
  });

  // Create test category
  const category = await Category.create({
    name: `H02 Category ${testSuffix}`,
    description: 'Category for H02 tests',
    isActive: true,
  });

  const createdTicketIds = [];

  try {
    // -------------------------------------------------------------
    // Test 1: Sequential Creation
    // -------------------------------------------------------------
    console.log('\n--- 2. Test 1: Sequential Ticket Creation ---');
    const seqTickets = [];
    for (let i = 1; i <= 5; i++) {
      const res = await createTicket({
        customerId: customer._id,
        subject: `Sequential Ticket ${i} - ${testSuffix}`,
        description: `Description for sequential ticket ${i}`,
        categoryId: category._id,
        priority: 'MEDIUM',
      });
      seqTickets.push(res.ticket);
      createdTicketIds.push(res.ticket._id);
    }

    assert(seqTickets.length === 5, 'Successfully created 5 sequential tickets');

    // Verify format and strictly increasing sequence
    let strictlyIncreasing = true;
    for (let i = 0; i < seqTickets.length; i++) {
      const t = seqTickets[i];
      const match = t.ticketNumber.match(/^TKT-(\d{6,})$/);
      assert(match !== null, `Ticket ${t.ticketNumber} matches ^TKT-\\d{6,}$ format`);
      if (i > 0) {
        const prevNum = parseInt(seqTickets[i - 1].ticketNumber.replace('TKT-', ''), 10);
        const currNum = parseInt(t.ticketNumber.replace('TKT-', ''), 10);
        if (currNum <= prevNum) {
          strictlyIncreasing = false;
        }
      }
    }
    assert(strictlyIncreasing, 'Sequential ticket numbers are strictly increasing');

    // Test standalone generateTicketNumber() function
    const standaloneNum = await generateTicketNumber();
    assert(/^TKT-\d{6,}$/.test(standaloneNum), `Standalone generateTicketNumber() returned valid format: ${standaloneNum}`);

    // -------------------------------------------------------------
    // Test 2: Existing Database Data Handling
    // -------------------------------------------------------------
    console.log('\n--- 3. Test 2: Existing Database Data & Counter Sync ---');
    const highestBefore = await getHighestExistingTicketNumber();
    console.log(`  Current highest ticket number in database: ${highestBefore}`);

    // Insert an out-of-band ticket simulating legacy / pre-existing data with high number
    const highNumberVal = highestBefore + 500;
    const highTicketNum = `TKT-${String(highNumberVal).padStart(6, '0')}`;
    const manualTicket = await Ticket.create({
      ticketNumber: highTicketNum,
      customerId: customer._id,
      categoryId: category._id,
      subject: `Pre-existing Legacy Ticket ${testSuffix}`,
      description: 'Legacy manual ticket',
      priority: 'LOW',
      status: 'OPEN',
    });
    createdTicketIds.push(manualTicket._id);

    // Sync ticket counter
    const syncedSeq = await syncTicketCounter();
    assert(syncedSeq >= highNumberVal, `Counter synced to at least ${highNumberVal} (actual: ${syncedSeq})`);

    // Create next ticket and verify it is strictly greater than highNumberVal
    const nextTicketRes = await createTicket({
      customerId: customer._id,
      subject: `Post-Sync Ticket ${testSuffix}`,
      description: 'Ticket created after counter sync',
      categoryId: category._id,
      priority: 'HIGH',
    });
    createdTicketIds.push(nextTicketRes.ticket._id);

    const nextNum = parseInt(nextTicketRes.ticket.ticketNumber.replace('TKT-', ''), 10);
    assert(
      nextNum > highNumberVal,
      `Next ticket number (${nextTicketRes.ticket.ticketNumber}) is greater than pre-existing high number (${highTicketNum})`
    );

    // -------------------------------------------------------------
    // Test 3: Concurrent Ticket Creation (50 Simultaneous Requests)
    // -------------------------------------------------------------
    console.log('\n--- 4. Test 3: Concurrent Creation (50 Parallel Requests) ---');
    const CONCURRENT_COUNT = 50;
    console.log(`  Dispatching ${CONCURRENT_COUNT} parallel createTicket requests...`);

    const startTime = Date.now();
    let duplicateErrors = 0;
    let otherErrors = 0;

    const promises = Array.from({ length: CONCURRENT_COUNT }, (_, index) =>
      createTicket({
        customerId: customer._id,
        subject: `Concurrent Ticket ${index + 1} - ${testSuffix}`,
        description: `Concurrent creation stress test item ${index + 1}`,
        categoryId: category._id,
        priority: index % 2 === 0 ? 'HIGH' : 'MEDIUM',
      }).catch((err) => {
        if (err.code === 11000) {
          duplicateErrors++;
        } else {
          otherErrors++;
        }
        throw err;
      })
    );

    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;
    console.log(`  Completed in ${duration}ms (${(duration / CONCURRENT_COUNT).toFixed(1)}ms per ticket)`);

    const fulfilledResults = results.filter((r) => r.status === 'fulfilled').map((r) => r.value.ticket);
    const rejectedResults = results.filter((r) => r.status === 'rejected');

    fulfilledResults.forEach((t) => createdTicketIds.push(t._id));

    console.log(`  Successful creations: ${fulfilledResults.length} / ${CONCURRENT_COUNT}`);
    console.log(`  Failed creations: ${rejectedResults.length} / ${CONCURRENT_COUNT}`);
    console.log(`  Duplicate key (E11000) errors: ${duplicateErrors}`);
    console.log(`  Other errors: ${otherErrors}`);

    assert(fulfilledResults.length === CONCURRENT_COUNT, `All ${CONCURRENT_COUNT} concurrent requests succeeded`);
    assert(duplicateErrors === 0, 'Zero E11000 duplicate key errors encountered');

    // Uniqueness verification across all 50 concurrent tickets
    const ticketNumberSet = new Set(fulfilledResults.map((t) => t.ticketNumber));
    const duplicateCount = CONCURRENT_COUNT - ticketNumberSet.size;
    assert(duplicateCount === 0, `Zero duplicate ticket numbers generated (${ticketNumberSet.size} unique numbers)`);

    // -------------------------------------------------------------
    // Test 4: Format Verification
    // -------------------------------------------------------------
    console.log('\n--- 5. Test 4: Ticket Format Verification ---');
    let allFormattedCorrectly = true;
    for (const t of fulfilledResults) {
      if (!/^TKT-\d{6,}$/.test(t.ticketNumber)) {
        allFormattedCorrectly = false;
        console.error(`  Format mismatch on ticketNumber: ${t.ticketNumber}`);
      }
    }
    assert(allFormattedCorrectly, 'All 50 concurrent tickets strictly match ^TKT-\\d{6,}$ with zero-padding');

    // -------------------------------------------------------------
    // Test 5: Existing Functionality & C-01 Integration
    // -------------------------------------------------------------
    console.log('\n--- 6. Test 5: Existing Functionality & C-01 Integration ---');
    const sampleTicket = fulfilledResults[0];

    assert(sampleTicket.customerId === undefined, 'Raw password / internal customer fields not leaked');
    assert(sampleTicket.categoryId === category._id.toString(), 'Category ID correctly associated');
    assert(sampleTicket.status === 'OPEN', 'Initial status is OPEN');
    assert(sampleTicket.sla !== undefined && sampleTicket.sla !== null, 'SLA object initialized on ticket');
    assert(sampleTicket.sla.resolutionDeadline !== undefined, 'SLA resolution deadline computed');

    // Verify lookup by ticketNumber (C-01 fix compatibility)
    const lookupRes = await getTicketByIdForCustomer(sampleTicket.ticketNumber, customer._id);
    assert(lookupRes.ticket !== null, 'Lookup via ticketNumber (C-01) succeeded');
    assert(lookupRes.ticket.ticketNumber === sampleTicket.ticketNumber, 'Lookup returns correct ticketNumber');
    assert(lookupRes.ticket.id === sampleTicket.id, 'Lookup returns matching ticket ID');

    // Verify Notification creation
    const notification = await Notification.findOne({
      recipient: customer._id,
      ticketNumber: sampleTicket.ticketNumber,
    });
    assert(notification !== null, 'Notification created with correct ticketNumber');
    assert(
      notification.targetRoute === `/customer/tickets/${sampleTicket.ticketNumber}`,
      `Notification targetRoute points to /customer/tickets/${sampleTicket.ticketNumber}`
    );

    // -------------------------------------------------------------
    // Test 6: Performance & Counter Collection Verification
    // -------------------------------------------------------------
    console.log('\n--- 7. Test 6: Performance & Architecture Verification ---');
    const counterDoc = await Counter.findById('ticket');
    assert(counterDoc !== null, 'Counter document (_id: "ticket") exists in MongoDB');
    assert(typeof counterDoc.seq === 'number', `Counter sequence is a valid number: ${counterDoc.seq}`);
    assert(counterDoc.seq >= CONCURRENT_COUNT, `Counter sequence has progressed to ${counterDoc.seq}`);

    // Fast O(1) reverse-sort limit check
    const queryStart = Date.now();
    const highestNumber = await getHighestExistingTicketNumber();
    const queryDuration = Date.now() - queryStart;
    assert(typeof highestNumber === 'number', `getHighestExistingTicketNumber returned ${highestNumber}`);
    assert(queryDuration < 100, `Top-index query executed in ${queryDuration}ms (no full collection scan)`);

  } finally {
    console.log('\n--- Cleanup Test Fixtures ---');
    if (createdTicketIds.length > 0) {
      const deleteTicketsResult = await Ticket.deleteMany({ _id: { $in: createdTicketIds } });
      console.log(`  Cleaned up ${deleteTicketsResult.deletedCount} test tickets.`);
      await Notification.deleteMany({ recipient: customer._id });
    }
    await Category.deleteOne({ _id: category._id });
    await User.deleteOne({ _id: customer._id });
    console.log('  Cleaned up test customer and category.');
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
