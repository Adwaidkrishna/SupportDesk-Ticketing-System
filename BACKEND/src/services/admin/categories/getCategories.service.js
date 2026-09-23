import Category from '../../../models/Category.js';
import Ticket from '../../../models/Ticket.js';
import { seedDefaultCategoriesIfEmpty } from '../../category/getCategories.service.js';

/**
 * Service to retrieve all categories for the admin portal, including live ticket counts.
 *
 * @returns {Promise<{ categories: Array }>}
 */
export const getCategories = async () => {
  // Ensure default categories are seeded if database is fresh
  await seedDefaultCategoriesIfEmpty();

  const [rawCategories, ticketCountsAgg] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Ticket.aggregate([
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const countMap = new Map();
  for (const item of ticketCountsAgg) {
    if (item._id) {
      countMap.set(item._id.toString(), item.count);
    }
  }

  const categories = rawCategories.map((cat) => ({
    id: cat._id.toString(),
    _id: cat._id.toString(),
    name: cat.name,
    description: cat.description || '',
    isActive: cat.isActive !== false,
    status: cat.isActive !== false ? 'Active' : 'Inactive',
    ticketsCount: countMap.get(cat._id.toString()) || 0,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
    createdDate: cat.createdAt
      ? new Date(cat.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Unknown',
  }));

  return { categories };
};

export default getCategories;
