/**
 * Settings storage utility
 * Manages user preferences stored in localStorage
 */

const SETTINGS_KEY = 'proplytics_settings';

const DEFAULT_SETTINGS = {
  currencyDecimals: false, // false = no decimals, true = 2 decimals (0.00)
  percentageDecimals: false, // false = no decimals, true = 2 decimals (0.00%)
  darkMode: null, // null = system preference, true = dark, false = light
};

/**
 * Get all settings
 */
export function getSettings() {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Error reading settings from localStorage:', error);
  }

  return DEFAULT_SETTINGS;
}

/**
 * Get a specific setting
 */
export function getSetting(key) {
  const settings = getSettings();
  return settings[key] ?? DEFAULT_SETTINGS[key];
}

/**
 * Set a specific setting
 */
export function setSetting(key, value) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const settings = getSettings();
    settings[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving setting to localStorage:', error);
  }
}

/**
 * Set multiple settings at once
 */
export function setSettings(newSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const currentSettings = getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
}


