import mongoose from 'mongoose';

export const VALID_AVAILABILITY_STATUSES = ['Available', 'Busy', 'Away', 'Offline'];

/**
 * Validate that agentId in req.params is a valid MongoDB ObjectId.
 */
export const validateAgentId = (req, res, next) => {
  const { agentId } = req.params;
  if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Invalid agent ID format.',
    });
  }
  next();
};

/**
 * Validate status update payload for PATCH /api/v1/admin/agents/:agentId/status.
 * Expects { status: 'Available' | 'Busy' | 'Away' | 'Offline' }.
 */
export const validateUpdateAgentStatus = (req, res, next) => {
  const { status } = req.body;
  if (!status || typeof status !== 'string' || !VALID_AVAILABILITY_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Validation error: "status" must be one of: ${VALID_AVAILABILITY_STATUSES.join(', ')}.`,
    });
  }
  req.validatedBody = { status };
  next();
};

/**
 * Validate update payload for PATCH /api/v1/admin/agents/:agentId.
 * Fields: name, email, department, role, status.
 */
export const validateUpdateAgent = (req, res, next) => {
  const { name, email, department, role, status } = req.body;
  const validated = {};

  if (
    name === undefined &&
    email === undefined &&
    department === undefined &&
    role === undefined &&
    status === undefined
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

  // Role validation
  if (role !== undefined) {
    const validRoles = ['agent', 'admin', 'customer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: "role" must be one of: ${validRoles.join(', ')}.`,
      });
    }
    validated.role = role;
  }

  // Status (availability) validation
  if (status !== undefined) {
    if (typeof status !== 'string' || !VALID_AVAILABILITY_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: "status" must be one of: ${VALID_AVAILABILITY_STATUSES.join(', ')}.`,
      });
    }
    validated.status = status;
  }

  req.validatedBody = validated;
  next();
};

export default {
  VALID_AVAILABILITY_STATUSES,
  validateAgentId,
  validateUpdateAgentStatus,
  validateUpdateAgent,
};
