import categoryService from '../services/category.service.js';

export const getCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getActiveCategories();
    res.status(200).json({
      success: true,
      data: {
        categories: categories.map((cat) => ({
          id: cat._id.toString(),
          _id: cat._id.toString(),
          name: cat.name,
          description: cat.description,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getCategories,
};
