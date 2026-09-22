import knowledgeService from '../../../services/knowledge/index.js';

export const updateArticle = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const updateData = req.validatedData;

    const article = await knowledgeService.updateArticle(articleId, updateData);

    res.status(200).json({
      success: true,
      message: 'Knowledge article updated successfully.',
      data: { article },
    });
  } catch (error) {
    next(error);
  }
};

export default { updateArticle };
