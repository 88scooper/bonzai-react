/**
 * Property Tabs Storage Utility
 * 
 * Manages saving and loading custom tabs for properties
 * using browser localStorage
 */

const STORAGE_KEY = 'bonzai_property_tabs';

/**
 * Get tabs for a specific property
 * @param {string} propertyId - Property ID
 * @returns {Array} Array of tab objects with {id, label, content}
 */
export function getPropertyTabs(propertyId) {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const allTabs = saved ? JSON.parse(saved) : {};
    return allTabs[propertyId] || [];
  } catch (error) {
    console.error('Error loading property tabs:', error);
    return [];
  }
}

/**
 * Save tabs for a specific property
 * @param {string} propertyId - Property ID
 * @param {Array} tabs - Array of tab objects
 * @returns {boolean} Success status
 */
export function savePropertyTabs(propertyId, tabs) {
  if (typeof window === 'undefined') return false;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const allTabs = saved ? JSON.parse(saved) : {};
    allTabs[propertyId] = tabs || [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTabs));
    return true;
  } catch (error) {
    console.error('Error saving property tabs:', error);
    return false;
  }
}

/**
 * Add a new tab to a property
 * @param {string} propertyId - Property ID
 * @param {string} label - Tab label
 * @param {string} content - Tab content (optional)
 * @returns {Object} The new tab object
 */
export function addPropertyTab(propertyId, label, content = '') {
  const tabs = getPropertyTabs(propertyId);
  const newTab = {
    id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    label: label || 'New Tab',
    content: content
  };
  tabs.push(newTab);
  savePropertyTabs(propertyId, tabs);
  return newTab;
}

/**
 * Update a tab
 * @param {string} propertyId - Property ID
 * @param {string} tabId - Tab ID
 * @param {Object} updates - Object with label and/or content to update
 * @returns {boolean} Success status
 */
export function updatePropertyTab(propertyId, tabId, updates) {
  const tabs = getPropertyTabs(propertyId);
  const tabIndex = tabs.findIndex(tab => tab.id === tabId);
  
  if (tabIndex === -1) return false;
  
  tabs[tabIndex] = { ...tabs[tabIndex], ...updates };
  savePropertyTabs(propertyId, tabs);
  return true;
}

/**
 * Delete a tab
 * @param {string} propertyId - Property ID
 * @param {string} tabId - Tab ID
 * @returns {boolean} Success status
 */
export function deletePropertyTab(propertyId, tabId) {
  const tabs = getPropertyTabs(propertyId);
  const filteredTabs = tabs.filter(tab => tab.id !== tabId);
  savePropertyTabs(propertyId, filteredTabs);
  return true;
}








