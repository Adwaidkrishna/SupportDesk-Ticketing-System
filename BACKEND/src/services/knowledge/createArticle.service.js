import KnowledgeArticle from '../../models/KnowledgeArticle.js';

export const createArticle = async ({ title, category, content, status, authorId }) => {
  const article = await KnowledgeArticle.create({
    title,
    category,
    content,
    status: status || 'DRAFT',
    authorId,
  });

  const populated = await KnowledgeArticle.findById(article._id)
    .populate('authorId', 'name email role')
    .lean();

  return populated;
};
