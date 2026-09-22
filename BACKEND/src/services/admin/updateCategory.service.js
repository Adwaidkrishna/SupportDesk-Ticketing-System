import Category from '../../models/Category.js';
import Ticket from '../../models/Ticket.js';

/**
 * Service to edit a category's details (name, description, isActive).
 *
 * @param {string} categoryId - Target category's MongoDB ObjectId
 * @param {Object} updateData - Validated updates
 * @returns {Promise<Object>} Updated category
 */
export const updateCategory = async (categoryId, updateData) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    const error = new Error('Category not found.');
    error.statusCode = 404;
    throw error;
  }

  // Check name uniqueness if name is changed
  if (updateData.name && updateData.name.trim().toLowerCase() !== category.name.toLowerCase()) {
    const trimmedName = updateData.name.trim();
    const existing = await Category.findOne({
      _id: { $ne: categoryId },
      name: { $regex: `^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, $options: 'i' },
    });

    if (existing) {
      const error = new Error(`Category with name "${trimmedName}" already exists.`);
      error.statusCode = 409;
      throw error;
    }
    category.name = trimmedName;
  }

  if (updateData.description !== undefined) {
    category.description = updateData.description.trim();
  }

  if (updateData.isActive !== undefined) {
    category.isActive = Boolean(updateData.isActive);
  }

  await category.save();

  // Get current ticket count
  const ticketsCount = await Ticket.countDocuments({ categoryId: category._id });

  return {
    id: category._id.toString(),
    _id: category._id.toString(),
    name: category.name,
    description: category.description,
    isActive: category.isActive,
    status: category.isActive ? 'Active' : 'Inactive',
    ticketsCount,
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

export default updateCategory;
