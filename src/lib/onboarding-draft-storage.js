/**
 * Onboarding Draft Storage Utility
 * 
 * Manages saving, loading, and deleting draft financial data
 * for properties during onboarding using browser localStorage
 */

const STORAGE_PREFIX = 'onboarding_draft_property_';

/**
 * Get draft data for a specific property
 * @param {string} propertyId - Property ID
 * @returns {Object|null} Draft data object or null if not found
 */
export function getPropertyDraft(propertyId) {
  if (typeof window === 'undefined' || !propertyId) return null;
  
  try {
    const key = `${STORAGE_PREFIX}${propertyId}`;
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    
    const draft = JSON.parse(saved);
    // Validate draft structure
    if (draft && typeof draft === 'object') {
      return draft;
    }
    return null;
  } catch (error) {
    console.error('Error loading property draft:', error);
    return null;
  }
}

/**
 * Save draft data for a specific property
 * @param {string} propertyId - Property ID
 * @param {Object} draftData - Draft data to save
 * @returns {boolean} Success status
 */
export function savePropertyDraft(propertyId, draftData) {
  if (typeof window === 'undefined' || !propertyId) return false;
  
  try {
    const key = `${STORAGE_PREFIX}${propertyId}`;
    const draft = {
      ...draftData,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch (error) {
    console.error('Error saving property draft:', error);
    // Handle quota exceeded error gracefully
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded. Clearing old drafts...');
      clearAllOnboardingDrafts();
      // Try once more
      try {
        localStorage.setItem(key, JSON.stringify(draft));
        return true;
      } catch (retryError) {
        console.error('Error saving draft after clearing:', retryError);
        return false;
      }
    }
    return false;
  }
}

/**
 * Clear draft data for a specific property
 * @param {string} propertyId - Property ID
 * @returns {boolean} Success status
 */
export function clearPropertyDraft(propertyId) {
  if (typeof window === 'undefined' || !propertyId) return false;
  
  try {
    const key = `${STORAGE_PREFIX}${propertyId}`;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error clearing property draft:', error);
    return false;
  }
}

/**
 * Clear all onboarding drafts
 * @returns {boolean} Success status
 */
export function clearAllOnboardingDrafts() {
  if (typeof window === 'undefined') return false;
  
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error('Error clearing all onboarding drafts:', error);
    return false;
  }
}

/**
 * Get all draft property IDs
 * @returns {string[]} Array of property IDs with drafts
 */
export function getAllDraftPropertyIds() {
  if (typeof window === 'undefined') return [];
  
  try {
    const propertyIds = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const propertyId = key.replace(STORAGE_PREFIX, '');
        propertyIds.push(propertyId);
      }
    }
    return propertyIds;
  } catch (error) {
    console.error('Error getting draft property IDs:', error);
    return [];
  }
}

