import { createArticle } from './admin/createArticle.controller.js';
import { updateArticle } from './admin/updateArticle.controller.js';
import { deleteArticle } from './admin/deleteArticle.controller.js';
import { getArticles } from './shared/getArticles.controller.js';
import { getArticleById } from './shared/getArticleById.controller.js';
import { getCategories } from './shared/getCategories.controller.js';

export {
  createArticle,
  updateArticle,
  deleteArticle,
  getArticles,
  getArticleById,
  getCategories,
};

export default {
  createArticle,
  updateArticle,
  deleteArticle,
  getArticles,
  getArticleById,
  getCategories,
};
