/**
 * Validator for PATCH /api/v1/admin/settings
 */
export const validateUpdateSettings = (req, res, next) => {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: Request body must be a valid JSON object.',
    });
  }

  const allowedSections = ['general', 'ticketSettings', 'notifications', 'security', 'appearance'];
  const hasValidSection = Object.keys(body).some((key) => allowedSections.includes(key));

  if (!hasValidSection) {
    return res.status(400).json({
      success: false,
      message: `Validation error: Request body must contain at least one of [${allowedSections.join(', ')}].`,
    });
  }

  next();
};

export default {
  validateUpdateSettings,
};
