import knowledgeService from '../../../services/knowledge/index.js';

export const createArticle = async (req, res, next) => {
  try {
    const { title, category, content, status } = req.validatedData;
    const authorId = req.user.userId;

    const article = await knowledgeService.createArticle({
      title,
      category,
      content,
      status,
      authorId,
    });

    res.status(201).json({
      success: true,
      message: 'Knowledge article created successfully.',
      data: { article },
    });
  } catch (error) {
    next(error);
  }
};

export default { createArticle };
