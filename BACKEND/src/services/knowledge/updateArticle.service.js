import KnowledgeArticle from '../../models/KnowledgeArticle.js';

export const updateArticle = async (articleId, updateData) => {
  const article = await KnowledgeArticle.findByIdAndUpdate(
    articleId,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .populate('authorId', 'name email role')
    .lean();

  if (!article) {
    const error = new Error('Knowledge article not found.');
    error.statusCode = 404;
    throw error;
  }

  return article;
};
