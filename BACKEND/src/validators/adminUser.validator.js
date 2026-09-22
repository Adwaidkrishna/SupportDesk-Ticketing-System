import mongoose from 'mongoose';

/**
 * Validate that userId in req.params is a valid MongoDB ObjectId.
 */
export const validateUserId = (req, res, next) => {
  const { userId } = req.params;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Invalid user ID format.',
    });
  }
  next();
};

/**
 * Validate status update payload for PATCH /api/v1/admin/users/:userId/status.
 * Expects { isActive: boolean }.
 */
export const validateUpdateUserStatus = (req, res, next) => {
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

/**
 * Validate update payload for PATCH /api/v1/admin/users/:userId.
 * Fields: name, email, role, phone, department, isActive.
 */
export const validateUpdateUser = (req, res, next) => {
  const { name, email, role, phone, department, isActive } = req.body;
  const validated = {};

  if (
    name === undefined &&
    email === undefined &&
    role === undefined &&
    phone === undefined &&
    department === undefined &&
    isActive === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: At least one field must be provided for update.',
    });
  }

  // Name validation
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "name" must be a non-empty string.',
      });
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "name" must be between 2 and 100 characters.',
      });
    }
    validated.name = trimmedName;
  }

  // Email validation
  if (email !== undefined) {
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "email" must be a non-empty string.',
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.toLowerCase().trim();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Invalid email format.',
      });
    }
    validated.email = normalizedEmail;
  }

  // Role validation
  if (role !== undefined) {
    const validRoles = ['customer', 'agent', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: "role" must be one of: ${validRoles.join(', ')}.`,
      });
    }
    validated.role = role;
  }

  // Phone validation
  if (phone !== undefined) {
    if (typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "phone" must be a string.',
      });
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone.length > 25) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "phone" must not exceed 25 characters.',
      });
    }
    validated.phone = trimmedPhone;
  }

  // Department validation
  if (department !== undefined) {
    if (typeof department !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "department" must be a string.',
      });
    }
    const trimmedDept = department.trim();
    if (trimmedDept.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "department" must not exceed 100 characters.',
      });
    }
    validated.department = trimmedDept;
  }

  // isActive validation
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

export default {
  validateUserId,
  validateUpdateUserStatus,
  validateUpdateUser,
};
