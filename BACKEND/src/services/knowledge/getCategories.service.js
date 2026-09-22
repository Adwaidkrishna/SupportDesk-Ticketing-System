import KnowledgeArticle, { KB_CATEGORIES } from '../../models/KnowledgeArticle.js';
import { seedKnowledgeBaseIfEmpty } from './getArticles.service.js';

const CATEGORY_METADATA = {
  'Getting Started': {
    icon: 'rocket',
    color: '#6366F1',
    description: 'Essential guides, platform navigation, and initial workspace onboarding.',
  },
  'Account & Security': {
    icon: 'shield',
    color: '#10B981',
    description: 'Password policies, 2FA configuration, user permissions, and access keys.',
  },
  'Billing & Plans': {
    icon: 'credit-card',
    color: '#F59E0B',
    description: 'Subscription management, invoice history, payment methods, and licensing.',
  },
  'Troubleshooting': {
    icon: 'tool',
    color: '#EF4444',
    description: 'Common error codes, connection timeouts, debugging, and recovery procedures.',
  },
  'API & Integrations': {
    icon: 'cpu',
    color: '#8B5CF6',
    description: 'REST API endpoints, webhook setup, third-party connectors, and SDKs.',
  },
  'General': {
    icon: 'folder',
    color: '#0EA5E9',
    description: 'General support information, service level agreements, and policies.',
  },
};

export const getCategories = async (userRole = 'customer') => {
  await seedKnowledgeBaseIfEmpty();

  const matchCondition = userRole === 'admin' ? {} : { status: 'PUBLISHED' };

  // Aggregate counts per category
  const counts = await KnowledgeArticle.aggregate([
    { $match: matchCondition },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const countMap = counts.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  const categories = KB_CATEGORIES.map((catName) => {
    const meta = CATEGORY_METADATA[catName] || {
      icon: 'folder',
      color: '#64748B',
      description: 'Support articles and guides.',
    };

    return {
      id: catName,
      title: catName,
      name: catName,
      articleCount: countMap[catName] || 0,
      icon: meta.icon,
      color: meta.color,
      description: meta.description,
    };
  });

  return categories;
};
