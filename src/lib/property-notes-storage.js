/**
 * Property Notes Storage Utility
 * 
 * Manages saving and loading user notes for properties
 * using browser localStorage
 */

const STORAGE_KEY = 'bonzai_property_notes';

/**
 * Get notes for a specific property
 * @param {string} propertyId - Property ID
 * @returns {string} Notes text or empty string
 */
export function getPropertyNotes(propertyId) {
  if (typeof window === 'undefined') return '';
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const notes = saved ? JSON.parse(saved) : {};
    return notes[propertyId] || '';
  } catch (error) {
    console.error('Error loading property notes:', error);
    return '';
  }
}

/**
 * Save notes for a specific property
 * @param {string} propertyId - Property ID
 * @param {string} notes - Notes text to save
 * @returns {boolean} Success status
 */
export function savePropertyNotes(propertyId, notes) {
  if (typeof window === 'undefined') return false;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const allNotes = saved ? JSON.parse(saved) : {};
    allNotes[propertyId] = notes || '';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allNotes));
    return true;
  } catch (error) {
    console.error('Error saving property notes:', error);
    return false;
  }
}

/**
 * Delete notes for a specific property
 * @param {string} propertyId - Property ID
 * @returns {boolean} Success status
 */
export function deletePropertyNotes(propertyId) {
  if (typeof window === 'undefined') return false;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const allNotes = saved ? JSON.parse(saved) : {};
    delete allNotes[propertyId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allNotes));
    return true;
  } catch (error) {
    console.error('Error deleting property notes:', error);
    return false;
  }
}

