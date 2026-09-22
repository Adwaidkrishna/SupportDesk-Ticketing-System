import KnowledgeArticle from '../../models/KnowledgeArticle.js';

export const deleteArticle = async (articleId) => {
  const article = await KnowledgeArticle.findByIdAndDelete(articleId).lean();

  if (!article) {
    const error = new Error('Knowledge article not found.');
    error.statusCode = 404;
    throw error;
  }

  return { id: articleId, title: article.title };
};
