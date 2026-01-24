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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:getSettings:entry',message:'getSettings called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  if (typeof window === 'undefined') {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:getSettings:return-default',message:'window undefined, returning default',data:{defaultSettings:DEFAULT_SETTINGS},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:getSettings:after-read',message:'localStorage read',data:{stored,hasValue:!!stored},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    if (stored) {
      const parsed = JSON.parse(stored);
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:getSettings:parsed',message:'settings parsed successfully',data:{parsed,merged,darkMode:merged.darkMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      return merged;
    }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:getSettings:error',message:'Error reading settings',data:{error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    console.error('Error reading settings from localStorage:', error);
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:getSettings:return-default-end',message:'returning default settings',data:{defaultSettings:DEFAULT_SETTINGS},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:setSetting:entry',message:'setSetting called',data:{key,value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  if (typeof window === 'undefined') {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:setSetting:early-return',message:'window undefined',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    return;
  }

  try {
    const settings = getSettings();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:setSetting:before-update',message:'settings before update',data:{currentSettings:settings,key,value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    settings[key] = value;
    const jsonString = JSON.stringify(settings);
    localStorage.setItem(SETTINGS_KEY, jsonString);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:setSetting:after-save',message:'localStorage saved',data:{savedValue:jsonString,verified:localStorage.getItem(SETTINGS_KEY)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:setSetting:error',message:'Error saving setting',data:{error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
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
 */
export function applyDarkMode(darkMode) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:applyDarkMode:entry',message:'applyDarkMode called',data:{darkMode,windowDefined:typeof window !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  if (typeof window === 'undefined') {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:applyDarkMode:early-return',message:'window undefined',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return;
  }

  const root = document.documentElement;
  const beforeClass = root.classList.contains('dark');
  let shouldBeDark = false;

  if (darkMode === null) {
    // System preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      shouldBeDark = true;
    }
  } else {
    // Explicit user preference
    shouldBeDark = darkMode === true;
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:applyDarkMode:before-apply',message:'before applying class',data:{darkMode,shouldBeDark,beforeClass,rootExists:!!root},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

  // Apply or remove dark class
  if (shouldBeDark) {
    root.classList.add("dark");
    root.setAttribute('data-dark-mode-applied', 'true');
    // Force a reflow to ensure the class is applied
    void root.offsetHeight;
    const afterClass = root.classList.contains('dark');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:applyDarkMode:after-add',message:'after adding dark class',data:{beforeClass,afterClass,success:afterClass,className:root.className},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
  } else {
    root.classList.remove("dark");
    root.setAttribute('data-dark-mode-applied', 'false');
    // Force a reflow to ensure the class is removed
    void root.offsetHeight;
    const afterClass = root.classList.contains('dark');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/145e2d2e-07b8-4a3d-a84a-d884a82426a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-storage.js:applyDarkMode:after-remove',message:'after removing dark class',data:{beforeClass,afterClass,success:!afterClass,className:root.className},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
  }

  return shouldBeDark;
}







