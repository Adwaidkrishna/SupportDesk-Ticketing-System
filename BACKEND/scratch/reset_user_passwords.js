import 'dotenv/config';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import { hashPassword } from '../src/utils/hash.util.js';

async function updateCredentials() {
  await connectDB();

  const creds = [
    { email: 'supportdesk.admin@test.local', pass: 'TestAdmin@12345', name: 'Admin User', role: 'admin' },
    { email: 'supportdesk.agent@test.local', pass: 'TestAgent@12345', name: 'Support Agent', role: 'agent' },
    { email: 'supportdesk.customer@test.local', pass: 'TestCustomer@12345', name: 'Customer User', role: 'customer' },
  ];

  for (const c of creds) {
    const hash = await hashPassword(c.pass);
    const updated = await User.findOneAndUpdate(
      { email: c.email },
      {
        $set: {
          name: c.name,
          passwordHash: hash,
          isVerified: true,
          role: c.role,
        },
      },
      { upsert: true, new: true }
    );
    console.log(`✅ Updated credentials for ${c.email} (role: ${updated.role})`);
  }

  process.exit(0);
}

updateCredentials().catch((err) => {
  console.error('Failed to update credentials:', err);
  process.exit(1);
});
