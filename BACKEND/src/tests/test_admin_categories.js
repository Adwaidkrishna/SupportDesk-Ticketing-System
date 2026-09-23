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
  validateCategoryId,
  validateCreateCategory,
  validateUpdateCategory,
  validateUpdateCategoryStatus,
} from '../validators/adminCategory.validator.js';
import { getCategories } from '../services/admin/categories/getCategories.service.js';
import { createCategory } from '../services/admin/categories/createCategory.service.js';
import { updateCategory } from '../services/admin/categories/updateCategory.service.js';
import { updateCategoryStatus } from '../services/admin/categories/updateCategoryStatus.service.js';
import { createTicket } from '../services/ticket/customer/createTicket.service.js';

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
  console.log('\n--- 1. Testing Admin Category Validators ---');

  // Test 1: validateCategoryId rejects invalid ID
  {
    let statusCode = null;
    let jsonBody = null;
    const req = { params: { categoryId: 'not-an-id' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: (b) => { jsonBody = b; } };
      },
    };
    validateCategoryId(req, res, () => {});
    assert(statusCode === 400 && jsonBody?.success === false, 'validateCategoryId rejects malformed ObjectId');
  }

  // Test 2: validateCategoryId accepts valid 24-char ObjectId
  {
    let nextCalled = false;
    const req = { params: { categoryId: new mongoose.Types.ObjectId().toString() } };
    const res = {};
    validateCategoryId(req, res, () => { nextCalled = true; });
    assert(nextCalled === true, 'validateCategoryId accepts valid ObjectId');
  }

  // Test 3: validateCreateCategory rejects missing name
  {
    let statusCode = null;
    const req = { body: { description: 'Description without name' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    validateCreateCategory(req, res, () => {});
    assert(statusCode === 400, 'validateCreateCategory rejects missing category name');
  }

  // Test 4: validateCreateCategory rejects missing description
  {
    let statusCode = null;
    const req = { body: { name: 'Network' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    validateCreateCategory(req, res, () => {});
    assert(statusCode === 400, 'validateCreateCategory rejects missing category description');
  }

  // Test 5: validateCreateCategory accepts valid payload
  {
    let nextCalled = false;
    const req = {
      body: {
        name: 'Database Operations',
        description: 'Issues with SQL and NoSQL storage',
        isActive: true,
      },
    };
    const res = {};
    validateCreateCategory(req, res, () => { nextCalled = true; });
    assert(
      nextCalled === true &&
      req.validatedBody?.name === 'Database Operations' &&
      req.validatedBody?.isActive === true,
      'validateCreateCategory validates and prepares sanitized body'
    );
  }

  // Test 6: validateUpdateCategory rejects empty body
  {
    let statusCode = null;
    const req = { body: {} };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    validateUpdateCategory(req, res, () => {});
    assert(statusCode === 400, 'validateUpdateCategory rejects empty payload');
  }

  // Test 7: validateUpdateCategoryStatus rejects non-boolean
  {
    let statusCode = null;
    const req = { body: { isActive: 'active' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    validateUpdateCategoryStatus(req, res, () => {});
    assert(statusCode === 400, 'validateUpdateCategoryStatus rejects non-boolean isActive');
  }

  console.log('\n--- 2. Testing Database Services & Ticket References (MongoDB) ---');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
  console.log('  Connected to MongoDB successfully.');

  const ts = Date.now();
  const pwd = await hashPassword('CatPass123!');

  // Test 8: Create category in MongoDB
  const createdCat = await createCategory({
    name: `DevOps & CI/CD ${ts}`,
    description: 'Pipelines and build infrastructure',
    isActive: true,
  });
  assert(
    createdCat.name === `DevOps & CI/CD ${ts}` && createdCat.isActive === true,
    'createCategory successfully persists category in MongoDB'
  );

  // Test 9: Duplicate category name is rejected with 409
  let dupRejected = false;
  try {
    await createCategory({
      name: `devops & ci/cd ${ts}`, // Case-insensitive collision
      description: 'Another pipeline category',
    });
  } catch (err) {
    dupRejected = true;
    assert(err.statusCode === 409, 'Duplicate category name throws 409 Conflict');
  }
  assert(dupRejected, 'Duplicate category name creation prevented');

  // Create test customer & ticket under this category to verify ticket count & preservation
  const testCustomer = await User.create({
    name: `Cat Customer ${ts}`,
    email: `cat_cust_${ts}@example.com`,
    passwordHash: pwd,
    role: 'customer',
    isVerified: true,
    isActive: true,
  });

  const testTicket = await Ticket.create({
    ticketNumber: `T-CAT-${ts}`,
    customerId: testCustomer._id,
    categoryId: createdCat.id,
    subject: 'Deployment pipeline failed',
    description: 'Docker image build timed out on runner',
    status: 'OPEN',
    priority: 'HIGH',
  });

  // Test 10: getCategories includes newly created category with live ticket count
  const allCategoriesRes = await getCategories();
  const targetInList = allCategoriesRes.categories.find((c) => c.id === createdCat.id);
  assert(targetInList !== undefined, 'getCategories returns newly created category');
  assert(targetInList.ticketsCount === 1, `Live ticket count correctly calculated (${targetInList.ticketsCount})`);

  // Test 11: Edit category details
  const updatedCat = await updateCategory(createdCat.id, {
    name: `DevOps Cloud Pipelines ${ts}`,
    description: 'Cloud infrastructure & deployments',
  });
  assert(
    updatedCat.name === `DevOps Cloud Pipelines ${ts}` &&
    updatedCat.description === 'Cloud infrastructure & deployments',
    'updateCategory successfully updates name and description'
  );

  // Test 12: Deactivate category (Preserves existing ticket references!)
  const deactivatedCat = await updateCategoryStatus(createdCat.id, false);
  assert(
    deactivatedCat.isActive === false && deactivatedCat.status === 'Inactive',
    'updateCategoryStatus successfully deactivates category'
  );

  // Verify historical ticket still references and populates the deactivated category
  const historicalTicket = await Ticket.findById(testTicket._id).populate('categoryId');
  assert(
    historicalTicket.categoryId !== null &&
    historicalTicket.categoryId._id.toString() === createdCat.id &&
    historicalTicket.categoryId.isActive === false,
    'Historical ticket reference preserved and readable after category deactivation'
  );

  // Test 13: Inactive category is rejected when customer attempts new ticket creation
  let newTicketRejected = false;
  try {
    await createTicket({
      customerId: testCustomer._id,
      subject: 'New ticket on deactivated category',
      description: 'Should fail',
      categoryId: createdCat.id,
      priority: 'MEDIUM',
    });
  } catch (err) {
    newTicketRejected = true;
    assert(err.statusCode === 404, 'createTicket rejects deactivated category with 404');
  }
  assert(newTicketRejected, 'Deactivated category cannot be used for new tickets');

  // Test 14: Reactivate category
  const reactivatedCat = await updateCategoryStatus(createdCat.id, true);
  assert(reactivatedCat.isActive === true && reactivatedCat.status === 'Active', 'updateCategoryStatus reactivates category');

  console.log('\n--- 3. Testing HTTP Endpoints & RBAC ---');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/admin/categories`;

  const customerToken = generateToken({ userId: testCustomer._id, role: 'customer' });
  const agentUser = await User.create({
    name: `Agent Cat ${ts}`,
    email: `agent_cat_${ts}@example.com`,
    passwordHash: pwd,
    role: 'agent',
    isVerified: true,
    isActive: true,
  });
  const agentToken = generateToken({ userId: agentUser._id, role: 'agent' });
  const adminUser = await User.create({
    name: `Admin Cat ${ts}`,
    email: `admin_cat_${ts}@example.com`,
    passwordHash: pwd,
    role: 'admin',
    isVerified: true,
    isActive: true,
  });
  const adminToken = generateToken({ userId: adminUser._id, role: 'admin' });

  // Test 15: Unauthenticated GET -> 401
  const unauthRes = await fetch(baseUrl);
  assert(unauthRes.status === 401, 'Unauthenticated GET /api/v1/admin/categories returns 401');

  // Test 16: Customer role -> 403
  const custRes = await fetch(baseUrl, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custRes.status === 403, 'Customer GET /api/v1/admin/categories returns 403');

  // Test 17: Agent role -> 403
  const agentRes = await fetch(baseUrl, {
    headers: { Authorization: `Bearer ${agentToken}` },
  });
  assert(agentRes.status === 403, 'Agent GET /api/v1/admin/categories returns 403');

  // Test 18: Admin role -> 200 with categories list
  const adminRes = await fetch(baseUrl, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminJson = await adminRes.json();
  assert(
    adminRes.status === 200 && Array.isArray(adminJson.data.categories),
    'Admin GET /api/v1/admin/categories returns 200 with categories array'
  );

  // Test 19: Admin POST /categories -> 201 Created
  const postRes = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: `API Category ${ts}`,
      description: 'Created via HTTP admin API',
      isActive: true,
    }),
  });
  const postJson = await postRes.json();
  assert(
    postRes.status === 201 && postJson.data.category.name === `API Category ${ts}`,
    'Admin POST /api/v1/admin/categories creates category with 201'
  );
  const apiCatId = postJson.data.category.id;

  // Test 20: Admin PUT /categories/:categoryId -> 200 OK
  const putRes = await fetch(`${baseUrl}/${apiCatId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: `API Category Updated ${ts}`,
      description: 'Updated via HTTP admin API',
    }),
  });
  const putJson = await putRes.json();
  assert(
    putRes.status === 200 && putJson.data.category.name === `API Category Updated ${ts}`,
    'Admin PUT /api/v1/admin/categories/:id updates category with 200'
  );

  // Test 21: Admin PATCH /categories/:categoryId/status -> 200 OK
  const patchStatusRes = await fetch(`${baseUrl}/${apiCatId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ isActive: false }),
  });
  const patchStatusJson = await patchStatusRes.json();
  assert(
    patchStatusRes.status === 200 && patchStatusJson.data.category.isActive === false,
    'Admin PATCH /api/v1/admin/categories/:id/status deactivates category with 200'
  );

  // Cleanup test records
  await Ticket.deleteMany({ _id: testTicket._id });
  await Category.deleteMany({ _id: { $in: [createdCat.id, apiCatId] } });
  await User.deleteMany({ _id: { $in: [testCustomer._id, agentUser._id, adminUser._id] } });
  server.close();
  await mongoose.disconnect();
  console.log('  Cleaned up test category and user records.');

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
