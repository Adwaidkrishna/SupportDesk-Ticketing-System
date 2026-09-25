import Setting from '../../../models/Setting.js';

const SETTINGS_ID = 'system_settings';

/**
 * Retrieve system settings, creating defaults if not yet initialized.
 * @returns {Promise<Object>} System settings document
 */
export const getSettings = async () => {
  let settings = await Setting.findById(SETTINGS_ID).lean();
  if (!settings) {
    const created = await Setting.create({ _id: SETTINGS_ID });
    settings = created.toObject();
  }
  return settings;
};

/**
 * Update system settings by merging sections.
 * @param {Object} updates - Partial or full settings sections
 * @returns {Promise<Object>} Updated system settings
 */
export const updateSettings = async (updates) => {
  let settings = await Setting.findById(SETTINGS_ID);
  if (!settings) {
    settings = new Setting({ _id: SETTINGS_ID });
  }

  if (updates.general && typeof updates.general === 'object') {
    settings.general = { ...settings.general.toObject(), ...updates.general };
  }

  if (updates.ticketSettings && typeof updates.ticketSettings === 'object') {
    settings.ticketSettings = { ...settings.ticketSettings.toObject(), ...updates.ticketSettings };
  }

  if (updates.notifications && typeof updates.notifications === 'object') {
    settings.notifications = { ...settings.notifications.toObject(), ...updates.notifications };
  }

  if (updates.security && typeof updates.security === 'object') {
    settings.security = { ...settings.security.toObject(), ...updates.security };
  }

  if (updates.appearance && typeof updates.appearance === 'object') {
    settings.appearance = { ...settings.appearance.toObject(), ...updates.appearance };
  }

  await settings.save();
  return settings.toObject();
};

export default {
  getSettings,
  updateSettings,
};
