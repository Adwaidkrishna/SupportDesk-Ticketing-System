import Category from '../../../models/Category.js';
import Ticket from '../../../models/Ticket.js';

/**
 * Service to activate or deactivate a category.
 *
 * @param {string} categoryId - Target category's MongoDB ObjectId
 * @param {boolean} isActive - New status
 * @returns {Promise<Object>} Updated category
 */
export const updateCategoryStatus = async (categoryId, isActive) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    const error = new Error('Category not found.');
    error.statusCode = 404;
    throw error;
  }

  category.isActive = Boolean(isActive);
  await category.save();

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

export default updateCategoryStatus;
