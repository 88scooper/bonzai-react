/**
 * Settings storage utility
 * Manages user preferences stored in localStorage
 */

const SETTINGS_KEY = 'bonzai_settings';

const DEFAULT_SETTINGS = {
  currencyDecimals: false, // false = no decimals, true = 2 decimals (0.00)
  percentageDecimals: false, // false = no decimals, true = 2 decimals (0.00%)
  darkMode: false, // false = light (default), true = dark, null = system preference
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
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      return merged;
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
    const jsonString = JSON.stringify(settings);
    localStorage.setItem(SETTINGS_KEY, jsonString);
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

/**
 * Apply dark mode to the document
 * This is a utility function that can be called from anywhere
 * IMPORTANT: This logic must match the inline script in layout.js exactly
 */
export function applyDarkMode(darkMode) {
  if (typeof window === 'undefined') {
    return false;
  }

  const root = document.documentElement;
  let shouldBeDark = false;

  // Determine if dark mode should be active
  // This logic MUST match the inline script in layout.js
  if (darkMode === null) {
    // System preference - check matchMedia
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      shouldBeDark = true;
    }
  } else if (darkMode === true) {
    // Explicit dark mode
    shouldBeDark = true;
  } else {
    // Explicit light mode (darkMode === false)
    shouldBeDark = false;
  }

  // Apply or remove dark class
  if (shouldBeDark) {
    root.classList.add("dark");
    root.setAttribute('data-dark-mode-applied', 'true');
  } else {
    root.classList.remove("dark");
    root.setAttribute('data-dark-mode-applied', 'false');
  }

  return shouldBeDark;
}







