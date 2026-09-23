import Category from '../../../models/Category.js';

/**
 * Service to create a new category in MongoDB.
 *
 * @param {Object} categoryData - { name, description, isActive }
 * @returns {Promise<Object>} Created category
 */
export const createCategory = async ({ name, description, isActive = true }) => {
  const trimmedName = name.trim();

  // Check for duplicate category name (case-insensitive)
  const existingCategory = await Category.findOne({
    name: { $regex: `^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, $options: 'i' },
  });

  if (existingCategory) {
    const error = new Error(`Category with name "${trimmedName}" already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const category = await Category.create({
    name: trimmedName,
    description: description.trim(),
    isActive: Boolean(isActive),
  });

  return {
    id: category._id.toString(),
    _id: category._id.toString(),
    name: category.name,
    description: category.description,
    isActive: category.isActive,
    status: category.isActive ? 'Active' : 'Inactive',
    ticketsCount: 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    createdDate: category.createdAt
      ? new Date(category.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Unknown',
  };
};

export default createCategory;
