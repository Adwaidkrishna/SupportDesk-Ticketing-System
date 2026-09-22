import knowledgeService from '../../../services/knowledge/index.js';

export const getArticleById = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const userRole = req.user ? req.user.role : 'customer';

    const article = await knowledgeService.getArticleById(articleId, userRole);

    res.status(200).json({
      success: true,
      data: { article },
    });
  } catch (error) {
    next(error);
  }
};

export default { getArticleById };
