import knowledgeService from '../../../services/knowledge/index.js';

export const deleteArticle = async (req, res, next) => {
  try {
    const { articleId } = req.params;

    const result = await knowledgeService.deleteArticle(articleId);

    res.status(200).json({
      success: true,
      message: 'Knowledge article deleted successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default { deleteArticle };
