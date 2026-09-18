import 'dotenv/config';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Ticket from '../src/models/Ticket.js';
import TicketMessage from '../src/models/TicketMessage.js';

async function cleanupTestData() {
  await connectDB();

  console.log('--- STARTING TARGETED TEST DATA CLEANUP ---');

  // Verify real customer ticket TKT-000002 exists
  const realTicket = await Ticket.findOne({ ticketNumber: 'TKT-000002' });
  if (!realTicket) {
    console.error('CRITICAL WARNING: TKT-000002 was not found in the database!');
  } else {
    console.log(`Found real development ticket: ${realTicket.ticketNumber} - "${realTicket.subject}" (_id: ${realTicket._id})`);
  }

  // Identify test tickets to remove:
  // Must NOT include TKT-000002!
  const testTicketQuery = {
    ticketNumber: { $ne: 'TKT-000002' },
    $or: [
      // Test subjects from automated tests
      { subject: /Ticket (A|B) / },
      { subject: /Customer (A|B) / },
      { subject: /Regression Creation Test Ticket/ },
      { subject: /Agent Queue Test/ },
      { subject: /Billing Inquiry regarding monthly invoice/ }, // from test_ticket_creation
      // Or test ticket numbers
      { ticketNumber: { $in: [
        'TKT-000001', 'TKT-000003', 'TKT-200003',
        'TKT-100001', 'TKT-100002', 'TKT-100003', 'TKT-200001', 'TKT-200002',
        'TKT-700001', 'TKT-700002', 'TKT-990004',
        'TKT-990001', 'TKT-990002', 'TKT-990003',
        'TKT-AQ-001', 'TKT-AQ-002', 'TKT-AQ-003'
      ] } },
    ]
  };

  const testTickets = await Ticket.find(testTicketQuery).lean();
  console.log(`Identified ${testTickets.length} test tickets to clean:`);
  testTickets.forEach(t => console.log(`  - ${t.ticketNumber}: "${t.subject}"`));

  const testTicketIds = testTickets.map(t => t._id);

  // Clean orphan TicketMessages belonging to these test tickets (NEVER TKT-000002)
  let deletedMessagesCount = 0;
  if (testTicketIds.length > 0) {
    const msgDeleteResult = await TicketMessage.deleteMany({
      ticketId: { $in: testTicketIds }
    });
    deletedMessagesCount = msgDeleteResult.deletedCount;
    console.log(`Deleted ${deletedMessagesCount} orphan messages belonging to test tickets.`);
  }

  // Delete the test tickets
  let deletedTicketsCount = 0;
  if (testTicketIds.length > 0) {
    const ticketDeleteResult = await Ticket.deleteMany({
      _id: { $in: testTicketIds }
    });
    deletedTicketsCount = ticketDeleteResult.deletedCount;
    console.log(`Deleted ${deletedTicketsCount} test tickets from database.`);
  }

  // Also clean test users created specifically by automated test scripts
  const testUserQuery = {
    email: {
      $in: [
        'testcustomer@example.com',
        'testagent@example.com',
        'testadmin@example.com',
        'customera@example.com',
        'customerb@example.com',
        'agent_listing@example.com',
        'admin_listing@example.com',
        'customer_det_a@example.com',
        'customer_det_b@example.com',
        'agent_det@example.com',
        'admin_det@example.com',
        'msg_customer_a@example.com',
        'msg_customer_b@example.com',
        'msg_agent@example.com',
        'msg_admin@example.com',
      ]
    }
  };
  const userDeleteResult = await User.deleteMany(testUserQuery);
  console.log(`Deleted ${userDeleteResult.deletedCount} automated test users.`);

  // Verify remaining tickets in database
  const remainingTickets = await Ticket.find({}).populate('customerId', 'name email').lean();
  console.log(`\nRemaining tickets in database (${remainingTickets.length}):`);
  remainingTickets.forEach(t => {
    console.log(`  - [${t.ticketNumber}] "${t.subject}" | Status: ${t.status} | Priority: ${t.priority} | Customer: ${t.customerId?.name} (${t.customerId?.email})`);
  });

  const verifiedRealTicket = remainingTickets.find(t => t.ticketNumber === 'TKT-000002');
  if (verifiedRealTicket) {
    console.log(`\n✅ CONFIRMED: TKT-000002 is preserved and intact.`);
  } else {
    console.error(`\n❌ ERROR: TKT-000002 is missing!`);
  }

  process.exit(0);
}

cleanupTestData().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
