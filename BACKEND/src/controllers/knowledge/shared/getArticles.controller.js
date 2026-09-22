import knowledgeService from '../../../services/knowledge/index.js';

export const getArticles = async (req, res, next) => {
  try {
    const { search, category, status, page, limit } = req.query;
    const userRole = req.user ? req.user.role : 'customer';

    const result = await knowledgeService.getArticles({
      search,
      category,
      status,
      page,
      limit,
      userRole,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default { getArticles };
