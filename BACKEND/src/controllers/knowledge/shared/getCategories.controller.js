import knowledgeService from '../../../services/knowledge/index.js';

export const getCategories = async (req, res, next) => {
  try {
    const userRole = req.user ? req.user.role : 'customer';
    const categories = await knowledgeService.getCategories(userRole);

    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};

export default { getCategories };
