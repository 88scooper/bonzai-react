/**
 * Scenario Storage Utility
 * 
 * Manages saving, loading, and deleting user-defined scenarios
 * using browser localStorage
 * 
 * Extended to support folders, tags, and descriptions
 */

const STORAGE_KEY = 'bonzai_saved_scenarios';
const FOLDERS_STORAGE_KEY = 'bonzai_scenario_folders';

/**
 * Get all saved scenarios from localStorage
 * @returns {Array} Array of saved scenario objects
 */
export function getSavedScenarios() {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading saved scenarios:', error);
    return [];
  }
}

/**
 * Save a new scenario to localStorage
 * @param {Object} scenario - Scenario object with name, assumptions, propertyId, and metadata
 * @param {string} scenario.folder - Optional folder name (defaults to 'Uncategorized')
 * @param {string[]} scenario.tags - Optional array of tag strings
 * @param {string} scenario.description - Optional description/notes
 * @returns {boolean} Success status
 */
export function saveScenario(scenario) {
  if (typeof window === 'undefined') return false;
  
  try {
    const scenarios = getSavedScenarios();
    
    // Migrate existing scenarios without folder/tags/description/type
    const migratedScenarios = scenarios.map(s => ({
      ...s,
      folder: s.folder || 'Uncategorized',
      tags: s.tags || [],
      description: s.description || '',
      type: s.type || 'cash-flow', // Default to cash-flow for backward compatibility
    }));
    
    // Create scenario with metadata
    const newScenario = {
      id: Date.now().toString(),
      name: scenario.name,
      propertyId: scenario.propertyId,
      propertyName: scenario.propertyName,
      assumptions: scenario.assumptions,
      folder: scenario.folder || 'Uncategorized',
      tags: scenario.tags || [],
      description: scenario.description || '',
      type: scenario.type || 'cash-flow', // Default to cash-flow
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    migratedScenarios.push(newScenario);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedScenarios));
    
    return true;
  } catch (error) {
    console.error('Error saving scenario:', error);
    return false;
  }
}

/**
 * Update an existing scenario
 * @param {string} id - Scenario ID
 * @param {Object} updates - Updated scenario data
 * @returns {boolean} Success status
 */
export function updateScenario(id, updates) {
  if (typeof window === 'undefined') return false;
  
  try {
    const scenarios = getSavedScenarios();
    const index = scenarios.findIndex(s => s.id === id);
    
    if (index === -1) return false;
    
    scenarios[index] = {
      ...scenarios[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    return true;
  } catch (error) {
    console.error('Error updating scenario:', error);
    return false;
  }
}

/**
 * Delete a scenario from localStorage
 * @param {string} id - Scenario ID to delete
 * @returns {boolean} Success status
 */
export function deleteScenario(id) {
  if (typeof window === 'undefined') return false;
  
  try {
    const scenarios = getSavedScenarios();
    const filtered = scenarios.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return false;
  }
}

/**
 * Get scenarios for a specific property
 * @param {string} propertyId - Property ID
 * @returns {Array} Array of scenarios for the property
 */
export function getScenariosByProperty(propertyId) {
  const scenarios = getSavedScenarios();
  // Migrate scenarios without folder/tags/description/type
  return scenarios
    .filter(s => s.propertyId === propertyId)
    .map(s => ({
      ...s,
      folder: s.folder || 'Uncategorized',
      tags: s.tags || [],
      description: s.description || '',
      type: s.type || 'cash-flow', // Default to cash-flow for backward compatibility
    }));
}

/**
 * Get scenarios by analysis type
 * @param {string} type - 'cash-flow' | 'equity'
 * @returns {Array} Array of scenarios for the type
 */
export function getScenariosByType(type) {
  const scenarios = getSavedScenarios();
  return scenarios.filter(s => (s.type || 'cash-flow') === type);
}

/**
 * Get scenarios by folder
 * @param {string} folderName - Folder name
 * @returns {Array} Array of scenarios in the folder
 */
export function getScenariosByFolder(folderName) {
  const scenarios = getSavedScenarios();
  return scenarios
    .filter(s => (s.folder || 'Uncategorized') === folderName)
    .map(s => ({
      ...s,
      folder: s.folder || 'Uncategorized',
      tags: s.tags || [],
      description: s.description || '',
    }));
}

/**
 * Get scenarios by tag
 * @param {string} tag - Tag name
 * @returns {Array} Array of scenarios with the tag
 */
export function getScenariosByTag(tag) {
  const scenarios = getSavedScenarios();
  return scenarios
    .filter(s => (s.tags || []).includes(tag))
    .map(s => ({
      ...s,
      folder: s.folder || 'Uncategorized',
      tags: s.tags || [],
      description: s.description || '',
    }));
}

/**
 * Update scenario folder
 * @param {string} id - Scenario ID
 * @param {string} folderName - New folder name
 * @returns {boolean} Success status
 */
export function updateScenarioFolder(id, folderName) {
  return updateScenario(id, { folder: folderName || 'Uncategorized' });
}

/**
 * Update scenario tags
 * @param {string} id - Scenario ID
 * @param {string[]} tags - Array of tag strings
 * @returns {boolean} Success status
 */
export function updateScenarioTags(id, tags) {
  return updateScenario(id, { tags: tags || [] });
}

/**
 * Get all folders
 * @returns {Array} Array of folder names
 */
export function getFolders() {
  if (typeof window === 'undefined') return ['Uncategorized'];
  
  try {
    const saved = localStorage.getItem(FOLDERS_STORAGE_KEY);
    const folders = saved ? JSON.parse(saved) : [];
    // Always include default folders
    const defaultFolders = ['All Scenarios', 'Uncategorized', 'Favorites'];
    const allFolders = [...new Set([...defaultFolders, ...folders])];
    return allFolders;
  } catch (error) {
    console.error('Error loading folders:', error);
    return ['Uncategorized'];
  }
}

/**
 * Create a new folder
 * @param {string} folderName - Folder name
 * @returns {boolean} Success status
 */
export function createFolder(folderName) {
  if (typeof window === 'undefined') return false;
  if (!folderName || folderName.trim() === '') return false;
  
  try {
    const folders = getFolders();
    const trimmedName = folderName.trim();
    
    // Prevent duplicate folder names
    if (folders.includes(trimmedName)) {
      return false;
    }
    
    // Don't allow default folder names to be created
    const defaultFolders = ['All Scenarios', 'Uncategorized', 'Favorites'];
    if (defaultFolders.includes(trimmedName)) {
      return false;
    }
    
    const customFolders = folders.filter(f => !defaultFolders.includes(f));
    customFolders.push(trimmedName);
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(customFolders));
    return true;
  } catch (error) {
    console.error('Error creating folder:', error);
    return false;
  }
}

/**
 * Delete a folder (moves scenarios to Uncategorized)
 * @param {string} folderName - Folder name to delete
 * @returns {boolean} Success status
 */
export function deleteFolder(folderName) {
  if (typeof window === 'undefined') return false;
  
  // Don't allow deleting default folders
  const defaultFolders = ['All Scenarios', 'Uncategorized', 'Favorites'];
  if (defaultFolders.includes(folderName)) {
    return false;
  }
  
  try {
    // Move all scenarios in this folder to Uncategorized
    const scenarios = getSavedScenarios();
    const updatedScenarios = scenarios.map(s => {
      if ((s.folder || 'Uncategorized') === folderName) {
        return { ...s, folder: 'Uncategorized' };
      }
      return s;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScenarios));
    
    // Remove folder from folders list
    const folders = getFolders();
    const customFolders = folders.filter(f => f !== folderName && !defaultFolders.includes(f));
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(customFolders));
    
    return true;
  } catch (error) {
    console.error('Error deleting folder:', error);
    return false;
  }
}

/**
 * Get all unique tags from all scenarios
 * @returns {Array} Array of unique tag strings
 */
export function getAllTags() {
  const scenarios = getSavedScenarios();
  const allTags = scenarios.reduce((tags, scenario) => {
    const scenarioTags = scenario.tags || [];
    return [...tags, ...scenarioTags];
  }, []);
  return [...new Set(allTags)].sort();
}

/**
 * Get a specific scenario by ID
 * @param {string} id - Scenario ID
 * @returns {Object|null} Scenario object or null if not found
 */
export function getScenarioById(id) {
  const scenarios = getSavedScenarios();
  return scenarios.find(s => s.id === id) || null;
}

/**
 * Check if a scenario name already exists for a property
 * @param {string} name - Scenario name
 * @param {string} propertyId - Property ID
 * @returns {boolean} True if name exists
 */
export function scenarioNameExists(name, propertyId) {
  const scenarios = getScenariosByProperty(propertyId);
  return scenarios.some(s => s.name.toLowerCase() === name.toLowerCase());
}

/**
 * Export all scenarios as JSON (for backup)
 * @returns {string} JSON string of all scenarios
 */
export function exportScenarios() {
  const scenarios = getSavedScenarios();
  return JSON.stringify(scenarios, null, 2);
}

/**
 * Import scenarios from JSON (for restore)
 * @param {string} jsonString - JSON string of scenarios
 * @returns {boolean} Success status
 */
export function importScenarios(jsonString) {
  if (typeof window === 'undefined') return false;
  
  try {
    const imported = JSON.parse(jsonString);
    if (!Array.isArray(imported)) {
      throw new Error('Invalid scenarios data');
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
    return true;
  } catch (error) {
    console.error('Error importing scenarios:', error);
    return false;
  }
}

