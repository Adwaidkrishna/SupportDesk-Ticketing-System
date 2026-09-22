import { createArticle } from './createArticle.service.js';
import { updateArticle } from './updateArticle.service.js';
import { deleteArticle } from './deleteArticle.service.js';
import { getArticles, seedKnowledgeBaseIfEmpty } from './getArticles.service.js';
import { getArticleById } from './getArticleById.service.js';
import { getCategories } from './getCategories.service.js';

export {
  createArticle,
  updateArticle,
  deleteArticle,
  getArticles,
  getArticleById,
  getCategories,
  seedKnowledgeBaseIfEmpty,
};

export default {
  createArticle,
  updateArticle,
  deleteArticle,
  getArticles,
  getArticleById,
  getCategories,
  seedKnowledgeBaseIfEmpty,
};
