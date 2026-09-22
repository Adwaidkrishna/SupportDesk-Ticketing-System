import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { generateToken } from '../src/utils/jwt.util.js';
import { hashPassword } from '../src/utils/hash.util.js';

async function testHttpEndpoints() {
  console.log('--- Testing Admin Users HTTP Endpoints ---');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/admin/users`;

  const ts = Date.now();
  const pwd = await hashPassword('Pass123!@#');

  const customer = await User.create({
    name: `Cust ${ts}`,
    email: `cust_${ts}@example.com`,
    passwordHash: pwd,
    role: 'customer',
    isVerified: true,
    isActive: true,
  });

  const admin = await User.create({
    name: `Admin ${ts}`,
    email: `admin_${ts}@example.com`,
    passwordHash: pwd,
    role: 'admin',
    isVerified: true,
    isActive: true,
  });

  const customerToken = generateToken({ userId: customer._id, role: 'customer' });
  const adminToken = generateToken({ userId: admin._id, role: 'admin' });

  // 1. Unauthenticated request
  const unauthRes = await fetch(baseUrl);
  console.log('1. Unauthenticated GET -> status:', unauthRes.status);
  if (unauthRes.status !== 401) throw new Error('Expected 401 for unauthenticated request');

  // 2. Customer trying to access Admin Users
  const custRes = await fetch(baseUrl, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  console.log('2. Customer role GET -> status:', custRes.status);
  if (custRes.status !== 403) throw new Error('Expected 403 for customer accessing admin route');

  // 3. Admin accessing Admin Users
  const adminRes = await fetch(baseUrl, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminData = await adminRes.json();
  console.log('3. Admin role GET -> status:', adminRes.status, 'users count:', adminData.data.users.length, 'total stats:', adminData.data.stats.total);
  if (adminRes.status !== 200 || !Array.isArray(adminData.data.users)) throw new Error('Expected 200 and users array');

  // 4. Admin search and filter
  const searchRes = await fetch(`${baseUrl}?search=cust_${ts}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const searchData = await searchRes.json();
  console.log('4. Admin search GET -> found:', searchData.data.users.length);
  if (searchData.data.users.length !== 1) throw new Error('Search failed to find target user');

  // 5. Admin PATCH status
  const statusRes = await fetch(`${baseUrl}/${customer._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ isActive: false }),
  });
  const statusData = await statusRes.json();
  console.log('5. Admin PATCH status -> status:', statusRes.status, 'isActive:', statusData.data.user.isActive);
  if (statusRes.status !== 200 || statusData.data.user.isActive !== false) throw new Error('Failed to deactivate user');

  // 6. Admin PATCH user details
  const updateRes = await fetch(`${baseUrl}/${customer._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: `Updated Cust ${ts}`,
      phone: '+1 234-567-8900',
      department: 'Billing & Accounts',
    }),
  });
  const updateData = await updateRes.json();
  console.log('6. Admin PATCH details -> status:', updateRes.status, 'name:', updateData.data.user.name, 'phone:', updateData.data.user.phone);
  if (updateRes.status !== 200 || updateData.data.user.phone !== '+1 234-567-8900') throw new Error('Failed to update details');

  // Clean up
  await User.deleteMany({ _id: { $in: [customer._id, admin._id] } });
  server.close();
  await mongoose.disconnect();
  console.log('\nAll Admin Users HTTP endpoint tests PASSED successfully!\n');
}

testHttpEndpoints().catch((err) => {
  console.error('HTTP Test failed:', err);
  process.exit(1);
});
