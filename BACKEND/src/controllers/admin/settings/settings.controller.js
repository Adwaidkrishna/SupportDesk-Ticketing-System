import { getSettings as getSettingsService, updateSettings as updateSettingsService } from '../../../services/admin/settings/settings.service.js';

/**
 * Controller to handle GET /api/v1/admin/settings
 */
export const getSettings = async (req, res, next) => {
  try {
    const data = await getSettingsService();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle PATCH /api/v1/admin/settings
 */
export const updateSettings = async (req, res, next) => {
  try {
    const data = await updateSettingsService(req.body);
    res.status(200).json({
      success: true,
      message: 'System settings updated successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getSettings,
  updateSettings,
};
