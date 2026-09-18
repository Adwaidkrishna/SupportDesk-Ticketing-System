import Category from '../models/Category.js';

const DEFAULT_CATEGORIES = [
  { name: 'Technical', description: 'Software & hardware technical issues' },
  { name: 'Account', description: 'Access, security & profile management' },
  { name: 'Billing', description: 'Invoices, payments & subscription issues' },
  { name: 'Feature Request', description: 'New feature suggestions & improvements' },
  { name: 'Other', description: 'General support inquiries' },
];

/**
 * Seed default categories if collection is empty.
 */
export const seedDefaultCategoriesIfEmpty = async () => {
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany(DEFAULT_CATEGORIES);
  }
};

/**
 * Retrieve all active support categories.
 */
export const getActiveCategories = async () => {
  await seedDefaultCategoriesIfEmpty();
  return Category.find({ isActive: true }).sort({ name: 1 }).lean();
};

/**
 * Find category by ID.
 */
export const getCategoryById = async (categoryId) => {
  return Category.findById(categoryId).lean();
};

export default {
  getActiveCategories,
  getCategoryById,
  seedDefaultCategoriesIfEmpty,
};
