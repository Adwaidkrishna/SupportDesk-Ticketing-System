import mongoose from 'mongoose';
import { KB_CATEGORIES, KB_STATUSES } from '../models/KnowledgeArticle.js';

export const validateArticleId = (req, res, next) => {
  const { articleId } = req.params;
  if (!articleId || !mongoose.Types.ObjectId.isValid(articleId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Invalid article ID format.',
    });
  }
  next();
};

export const validateCreateArticle = (req, res, next) => {
  const { title, category, content, status } = req.body;

  // Title validation
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Article title is required.',
    });
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length < 5 || trimmedTitle.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Article title must be between 5 and 200 characters.',
    });
  }

  // Category validation
  if (!category || !KB_CATEGORIES.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Validation error: Category must be one of: ${KB_CATEGORIES.join(', ')}.`,
    });
  }

  // Content validation
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Article content is required.',
    });
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > 25000) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Article content must not exceed 25,000 characters.',
    });
  }

  // Status validation
  let finalStatus = 'DRAFT';
  if (status) {
    if (!KB_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Status must be either 'DRAFT' or 'PUBLISHED'.`,
      });
    }
    finalStatus = status;
  }

  req.validatedData = {
    title: trimmedTitle,
    category,
    content: trimmedContent,
    status: finalStatus,
  };

  next();
};

export const validateUpdateArticle = (req, res, next) => {
  const { title, category, content, status } = req.body;
  const updates = {};

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Title cannot be empty.',
      });
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 5 || trimmedTitle.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Title must be between 5 and 200 characters.',
      });
    }
    updates.title = trimmedTitle;
  }

  if (category !== undefined) {
    if (!KB_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Category must be one of: ${KB_CATEGORIES.join(', ')}.`,
      });
    }
    updates.category = category;
  }

  if (content !== undefined) {
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Content cannot be empty.',
      });
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length > 25000) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Content must not exceed 25,000 characters.',
      });
    }
    updates.content = trimmedContent;
  }

  if (status !== undefined) {
    if (!KB_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Status must be either 'DRAFT' or 'PUBLISHED'.`,
      });
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: At least one field (title, category, content, status) must be provided to update.',
    });
  }

  req.validatedData = updates;
  next();
};
