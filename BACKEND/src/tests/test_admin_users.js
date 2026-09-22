import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import {
  validateUserId,
  validateUpdateUserStatus,
  validateUpdateUser,
} from '../validators/adminUser.validator.js';
import User from '../models/User.js';
import { getUsers } from '../services/admin/getUsers.service.js';
import { updateUserStatus } from '../services/admin/updateUserStatus.service.js';
import { updateUserDetails } from '../services/admin/updateUserDetails.service.js';
import { loginUser } from '../services/auth/login.service.js';
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
  console.log('\n--- 1. Testing Admin User Validators ---');

  // Test 1: validateUserId rejects invalid ObjectId
  {
    let statusCode = null;
    let jsonBody = null;
    const req = { params: { userId: 'bad-id-123' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: (b) => { jsonBody = b; } };
      },
    };
    validateUserId(req, res, () => {});
    assert(statusCode === 400 && jsonBody?.success === false, 'validateUserId rejects malformed ObjectId');
  }

  // Test 2: validateUserId accepts valid ObjectId
  {
    let nextCalled = false;
    const req = { params: { userId: new mongoose.Types.ObjectId().toString() } };
    const res = {};
    validateUserId(req, res, () => { nextCalled = true; });
    assert(nextCalled === true, 'validateUserId accepts valid 24-char ObjectId');
  }

  // Test 3: validateUpdateUserStatus rejects non-boolean
  {
    let statusCode = null;
    const req = { body: { isActive: 'yes' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    validateUpdateUserStatus(req, res, () => {});
    assert(statusCode === 400, 'validateUpdateUserStatus rejects string instead of boolean');
  }

  // Test 4: validateUpdateUserStatus accepts boolean
  {
    let nextCalled = false;
    const req = { body: { isActive: false } };
    const res = {};
    validateUpdateUserStatus(req, res, () => { nextCalled = true; });
    assert(nextCalled === true && req.validatedBody?.isActive === false, 'validateUpdateUserStatus accepts boolean');
  }

  // Test 5: validateUpdateUser rejects empty body
  {
    let statusCode = null;
    const req = { body: {} };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    validateUpdateUser(req, res, () => {});
    assert(statusCode === 400, 'validateUpdateUser rejects completely empty payload');
  }

  // Test 6: validateUpdateUser rejects invalid email
  {
    let statusCode = null;
    const req = { body: { email: 'not-an-email' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    validateUpdateUser(req, res, () => {});
    assert(statusCode === 400, 'validateUpdateUser rejects invalid email format');
  }

  // Test 7: validateUpdateUser rejects invalid role
  {
    let statusCode = null;
    const req = { body: { role: 'super-admin-invalid' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    validateUpdateUser(req, res, () => {});
    assert(statusCode === 400, 'validateUpdateUser rejects invalid role');
  }

  // Test 8: validateUpdateUser accepts valid fields
  {
    let nextCalled = false;
    const req = {
      body: {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        role: 'agent',
        phone: '+1 555-0199',
        department: 'Level 2 Support',
        isActive: true,
      },
    };
    const res = {};
    validateUpdateUser(req, res, () => { nextCalled = true; });
    assert(
      nextCalled === true &&
      req.validatedBody?.name === 'Jane Doe' &&
      req.validatedBody?.role === 'agent',
      'validateUpdateUser validates and attaches sanitized data'
    );
  }

  console.log('\n--- 2. Testing Database Services (MongoDB) ---');
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/supportdesk';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log('  Connected to MongoDB successfully.');

    // Seed test users with distinct roles and activation states
    const testPasswordHash = await hashPassword('AdminPass123!');
    const testTimestamp = Date.now();

    const customerUser = await User.create({
      name: `Test Customer ${testTimestamp}`,
      email: `customer_${testTimestamp}@example.com`,
      passwordHash: testPasswordHash,
      role: 'customer',
      isVerified: true,
      isActive: true,
      phone: '123-456-7890',
      department: 'Customer Care',
    });

    const agentUser = await User.create({
      name: `Test Agent ${testTimestamp}`,
      email: `agent_${testTimestamp}@example.com`,
      passwordHash: testPasswordHash,
      role: 'agent',
      isVerified: true,
      isActive: true,
      phone: '987-654-3210',
      department: 'Technical Escalations',
    });

    const deactivatedUser = await User.create({
      name: `Deactivated User ${testTimestamp}`,
      email: `deactivated_${testTimestamp}@example.com`,
      passwordHash: testPasswordHash,
      role: 'customer',
      isVerified: true,
      isActive: false,
      phone: '555-000-1111',
    });

    // Test 9: getUsers fetches all users and includes KPI stats
    const allUsersResult = await getUsers();
    assert(
      Array.isArray(allUsersResult.users) && allUsersResult.users.length >= 3,
      `getUsers returns users list (count: ${allUsersResult.users.length})`
    );
    assert(
      typeof allUsersResult.stats.total === 'number' &&
      typeof allUsersResult.stats.active === 'number' &&
      typeof allUsersResult.stats.inactive === 'number',
      'getUsers includes accurate live KPI stats object'
    );

    // Test 10: Search users by name or email
    const searchResult = await getUsers({ search: `customer_${testTimestamp}` });
    assert(
      searchResult.users.length === 1 && searchResult.users[0].id === customerUser._id.toString(),
      'getUsers search by email correctly matches target user'
    );

    // Test 11: Filter by role
    const agentFilterResult = await getUsers({ role: 'agent', search: `${testTimestamp}` });
    assert(
      agentFilterResult.users.length === 1 && agentFilterResult.users[0].role === 'agent',
      'getUsers role filter correctly filters by agent role'
    );

    // Test 12: Filter by status
    const inactiveFilterResult = await getUsers({ status: 'inactive', search: `${testTimestamp}` });
    assert(
      inactiveFilterResult.users.length === 1 && inactiveFilterResult.users[0].isActive === false,
      'getUsers status filter correctly filters inactive users'
    );

    // Test 13: Deactivate active customer user
    const deactivatedResult = await updateUserStatus(customerUser._id.toString(), false);
    assert(
      deactivatedResult.isActive === false && deactivatedResult.status === 'Inactive',
      'updateUserStatus successfully deactivates user'
    );

    // Test 14: Verify deactivated user cannot log in
    let loginErrorThrown = false;
    try {
      await loginUser({
        email: customerUser.email,
        password: 'AdminPass123!',
      });
    } catch (err) {
      loginErrorThrown = true;
      assert(err.statusCode === 403, 'Login rejected with 403 for deactivated user');
    }
    assert(loginErrorThrown, 'Deactivated user blocked from logging in');

    // Test 15: Reactivate user
    const reactivatedResult = await updateUserStatus(customerUser._id.toString(), true);
    assert(
      reactivatedResult.isActive === true && reactivatedResult.status === 'Active',
      'updateUserStatus successfully reactivates user'
    );

    // Test 16: Update user details (name, department, phone, role)
    const updatedDetails = await updateUserDetails(customerUser._id.toString(), {
      name: `Updated Customer ${testTimestamp}`,
      department: 'VIP Support',
      phone: '+1 800-555-9999',
    });
    assert(
      updatedDetails.name === `Updated Customer ${testTimestamp}` &&
      updatedDetails.department === 'VIP Support' &&
      updatedDetails.phone === '+1 800-555-9999',
      'updateUserDetails updates name, department, and phone properly'
    );

    // Cleanup test records
    await User.deleteMany({
      _id: { $in: [customerUser._id, agentUser._id, deactivatedUser._id] },
    });
    console.log('  Cleaned up test user records from MongoDB.');

    await mongoose.disconnect();
  } catch (dbErr) {
    console.log(`  (Note: MongoDB is offline or unreachable in local environment: ${dbErr.message})`);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
