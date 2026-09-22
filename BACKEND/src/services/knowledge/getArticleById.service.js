import KnowledgeArticle from '../../models/KnowledgeArticle.js';

export const getArticleById = async (articleId, userRole) => {
  const query = { _id: articleId };

  // If user is not admin, only published articles are accessible
  if (userRole !== 'admin') {
    query.status = 'PUBLISHED';
  }

  const article = await KnowledgeArticle.findOne(query)
    .populate('authorId', 'name email role')
    .lean();

  if (!article) {
    const error = new Error('Knowledge article not found.');
    error.statusCode = 404;
    throw error;
  }

  return article;
};
