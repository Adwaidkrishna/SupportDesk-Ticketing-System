import mongoose from 'mongoose';

/**
 * Validate that categoryId in req.params is a valid MongoDB ObjectId.
 */
export const validateCategoryId = (req, res, next) => {
  const { categoryId } = req.params;
  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Invalid category ID format.',
    });
  }
  next();
};

/**
 * Validate create category payload for POST /api/v1/admin/categories.
 * Fields: name (required), description (required), isActive (optional).
 */
export const validateCreateCategory = (req, res, next) => {
  const { name, description, isActive } = req.body;

  // Name validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Category "name" is required.',
    });
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Category "name" must be between 2 and 100 characters.',
    });
  }

  // Description validation
  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Category "description" is required.',
    });
  }
  const trimmedDesc = description.trim();
  if (trimmedDesc.length < 2 || trimmedDesc.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Category "description" must be between 2 and 500 characters.',
    });
  }

  // isActive validation
  let finalIsActive = true;
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "isActive" must be a boolean.',
      });
    }
    finalIsActive = isActive;
  }

  req.validatedBody = {
    name: trimmedName,
    description: trimmedDesc,
    isActive: finalIsActive,
  };
  next();
};

/**
 * Validate update category payload for PUT /api/v1/admin/categories/:categoryId.
 * Fields: name, description, isActive.
 */
export const validateUpdateCategory = (req, res, next) => {
  const { name, description, isActive } = req.body;
  const validated = {};

  if (name === undefined && description === undefined && isActive === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: At least one field (name, description, isActive) must be provided.',
    });
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Category "name" must be a non-empty string.',
      });
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Category "name" must be between 2 and 100 characters.',
      });
    }
    validated.name = trimmedName;
  }

  if (description !== undefined) {
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Category "description" must be a non-empty string.',
      });
    }
    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 2 || trimmedDesc.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Category "description" must be between 2 and 500 characters.',
      });
    }
    validated.description = trimmedDesc;
  }

  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "isActive" must be a boolean.',
      });
    }
    validated.isActive = isActive;
  }

  req.validatedBody = validated;
  next();
};

/**
 * Validate status update payload for PATCH /api/v1/admin/categories/:categoryId/status.
 * Expects { isActive: boolean }.
 */
export const validateUpdateCategoryStatus = (req, res, next) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "isActive" field must be a boolean (true or false).',
    });
  }
  req.validatedBody = { isActive };
  next();
};

export default {
  validateCategoryId,
  validateCreateCategory,
  validateUpdateCategory,
  validateUpdateCategoryStatus,
};
