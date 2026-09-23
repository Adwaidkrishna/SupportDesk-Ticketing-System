import mongoose from 'mongoose';

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * Validate that policyId in req.params is a valid MongoDB ObjectId.
 */
export const validatePolicyId = (req, res, next) => {
  const { policyId } = req.params;
  if (!policyId || !mongoose.Types.ObjectId.isValid(policyId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Invalid SLA policy ID format.',
    });
  }
  next();
};

/**
 * Validate create SLA policy payload for POST /api/v1/admin/sla/policies.
 */
export const validateCreatePolicy = (req, res, next) => {
  const {
    name,
    priority,
    responseTimeMinutes,
    resolutionTimeMinutes,
    warningPercentage,
    businessHours,
    isActive,
  } = req.body;

  // Name validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Policy "name" is required.',
    });
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Policy "name" must be between 2 and 100 characters.',
    });
  }

  // Priority validation
  if (!priority || typeof priority !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "priority" is required.',
    });
  }
  const normalizedPriority = priority.toUpperCase();
  if (!VALID_PRIORITIES.includes(normalizedPriority)) {
    return res.status(400).json({
      success: false,
      message: `Validation error: Invalid priority "${priority}". Allowed: ${VALID_PRIORITIES.join(', ')}.`,
    });
  }

  // Response time validation
  const parsedResponse = Number(responseTimeMinutes);
  if (!Number.isInteger(parsedResponse) || parsedResponse <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "responseTimeMinutes" must be a positive integer greater than 0.',
    });
  }

  // Resolution time validation
  const parsedResolution = Number(resolutionTimeMinutes);
  if (!Number.isInteger(parsedResolution) || parsedResolution <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: "resolutionTimeMinutes" must be a positive integer greater than 0.',
    });
  }

  // Warning percentage validation
  let finalWarning = 80;
  if (warningPercentage !== undefined) {
    const parsedWarn = Number(warningPercentage);
    if (!Number.isInteger(parsedWarn) || parsedWarn < 1 || parsedWarn > 99) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "warningPercentage" must be an integer between 1 and 99.',
      });
    }
    finalWarning = parsedWarn;
  }

  // Business hours validation
  let finalHours = '24/7 Coverage';
  if (businessHours !== undefined) {
    if (typeof businessHours !== 'string' || !businessHours.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "businessHours" must be a non-empty string.',
      });
    }
    finalHours = businessHours.trim();
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
    priority: normalizedPriority,
    responseTimeMinutes: parsedResponse,
    resolutionTimeMinutes: parsedResolution,
    warningPercentage: finalWarning,
    businessHours: finalHours,
    isActive: finalIsActive,
  };

  next();
};

/**
 * Validate update SLA policy payload for PATCH /api/v1/admin/sla/policies/:policyId.
 */
export const validateUpdatePolicy = (req, res, next) => {
  const {
    name,
    priority,
    responseTimeMinutes,
    resolutionTimeMinutes,
    warningPercentage,
    businessHours,
    isActive,
  } = req.body;

  const validated = {};

  if (
    name === undefined &&
    priority === undefined &&
    responseTimeMinutes === undefined &&
    resolutionTimeMinutes === undefined &&
    warningPercentage === undefined &&
    businessHours === undefined &&
    isActive === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: At least one field must be provided to update.',
    });
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "name" must be a non-empty string.',
      });
    }
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "name" must be between 2 and 100 characters.',
      });
    }
    validated.name = trimmed;
  }

  if (priority !== undefined) {
    if (typeof priority !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "priority" must be a string.',
      });
    }
    const norm = priority.toUpperCase();
    if (!VALID_PRIORITIES.includes(norm)) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Invalid priority "${priority}". Allowed: ${VALID_PRIORITIES.join(', ')}.`,
      });
    }
    validated.priority = norm;
  }

  if (responseTimeMinutes !== undefined) {
    const parsed = Number(responseTimeMinutes);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "responseTimeMinutes" must be a positive integer greater than 0.',
      });
    }
    validated.responseTimeMinutes = parsed;
  }

  if (resolutionTimeMinutes !== undefined) {
    const parsed = Number(resolutionTimeMinutes);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "resolutionTimeMinutes" must be a positive integer greater than 0.',
      });
    }
    validated.resolutionTimeMinutes = parsed;
  }

  if (warningPercentage !== undefined) {
    const parsed = Number(warningPercentage);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "warningPercentage" must be an integer between 1 and 99.',
      });
    }
    validated.warningPercentage = parsed;
  }

  if (businessHours !== undefined) {
    if (typeof businessHours !== 'string' || !businessHours.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "businessHours" must be a non-empty string.',
      });
    }
    validated.businessHours = businessHours.trim();
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
 * Validate status update payload for PATCH /api/v1/admin/sla/policies/:policyId/status.
 */
export const validateUpdatePolicyStatus = (req, res, next) => {
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
  validatePolicyId,
  validateCreatePolicy,
  validateUpdatePolicy,
  validateUpdatePolicyStatus,
};
