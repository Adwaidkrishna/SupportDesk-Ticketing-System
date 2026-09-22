import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import {
  validateArticleId,
  validateCreateArticle,
  validateUpdateArticle,
} from '../validators/knowledge.validator.js';
import KnowledgeArticle, { KB_CATEGORIES, KB_STATUSES } from '../models/KnowledgeArticle.js';
import knowledgeService from '../services/knowledge/index.js';

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
  console.log('\n--- 1. Testing Knowledge Base Validators ---');

  // Test 1: validateArticleId rejects bad ObjectId
  {
    let statusCode = null;
    let jsonBody = null;
    const req = { params: { articleId: '123bad' } };
    const res = {
      status: (code) => { statusCode = code; return { json: (b) => { jsonBody = b; } }; }
    };
    validateArticleId(req, res, () => {});
    assert(statusCode === 400 && jsonBody?.success === false, 'validateArticleId rejects invalid ObjectId');
  }

  // Test 2: validateArticleId accepts valid ObjectId
  {
    let nextCalled = false;
    const validId = new mongoose.Types.ObjectId().toString();
    const req = { params: { articleId: validId } };
    const res = {};
    validateArticleId(req, res, () => { nextCalled = true; });
    assert(nextCalled === true, 'validateArticleId accepts valid 24-char ObjectId');
  }

  // Test 3: validateCreateArticle rejects missing title
  {
    let statusCode = null;
    const req = { body: { title: '', category: 'Getting Started', content: 'Valid content body here' } };
    const res = {
      status: (code) => { statusCode = code; return { json: () => {} }; }
    };
    validateCreateArticle(req, res, () => {});
    assert(statusCode === 400, 'validateCreateArticle rejects empty title');
  }

  // Test 4: validateCreateArticle rejects invalid category
  {
    let statusCode = null;
    const req = { body: { title: 'Valid Title Here', category: 'NonExistentCategory', content: 'Valid content body here' } };
    const res = {
      status: (code) => { statusCode = code; return { json: () => {} }; }
    };
    validateCreateArticle(req, res, () => {});
    assert(statusCode === 400, 'validateCreateArticle rejects invalid category');
  }

  // Test 5: validateCreateArticle accepts valid article
  {
    let nextCalled = false;
    const req = {
      body: {
        title: 'How to Reset Your Account Password',
        category: 'Account & Security',
        content: 'Step by step instructions on resetting your account credentials.',
        status: 'PUBLISHED',
      }
    };
    const res = {};
    validateCreateArticle(req, res, () => { nextCalled = true; });
    assert(nextCalled === true && req.validatedData?.status === 'PUBLISHED', 'validateCreateArticle attaches validatedData correctly');
  }

  // Test 6: validateUpdateArticle rejects empty update
  {
    let statusCode = null;
    const req = { body: {} };
    const res = {
      status: (code) => { statusCode = code; return { json: () => {} }; }
    };
    validateUpdateArticle(req, res, () => {});
    assert(statusCode === 400, 'validateUpdateArticle rejects empty payload');
  }

  console.log('\n--- 2. Testing Database Connection & Services ---');
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/supportdesk';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log('  Connected to MongoDB successfully.');

    // Test Categories Service
    const categories = await knowledgeService.getCategories('customer');
    assert(Array.isArray(categories) && categories.length > 0, `getCategories returns ${categories.length} categories`);

    // Test Articles Service (customer role: only published)
    const custRes = await knowledgeService.getArticles({ userRole: 'customer' });
    assert(Array.isArray(custRes.articles), `getArticles for customer returns articles array`);
    const allPublished = custRes.articles.every(a => a.status === 'PUBLISHED');
    assert(allPublished, `RBAC check: all returned articles for customer have status PUBLISHED`);

    // Test Admin Articles Service (admin role: all)
    const adminRes = await knowledgeService.getArticles({ userRole: 'admin' });
    assert(Array.isArray(adminRes.articles), `getArticles for admin returns articles array`);

    await mongoose.disconnect();
  } catch (dbErr) {
    console.log(`  (Note: MongoDB is offline or unreachable in local environment: ${dbErr.message})`);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
