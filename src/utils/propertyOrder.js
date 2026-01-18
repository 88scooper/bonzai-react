/**
 * Property Order Utility
 * 
 * Manages property ordering based on saved order in localStorage.
 * Used to maintain consistent property display order across the app.
 */

/**
 * Get the localStorage key for property order
 * @param {string} accountId - Current account ID
 * @returns {string} Storage key
 */
export function getPropertyOrderStorageKey(accountId) {
  return accountId ? `property-order-${accountId}` : 'property-order-default';
}

/**
 * Get the saved property order from localStorage
 * @param {string} accountId - Current account ID
 * @returns {string[]} Array of property IDs in order
 */
export function getPropertyOrder(accountId) {
  if (typeof window === 'undefined') return [];
  
  try {
    const storageKey = getPropertyOrderStorageKey(accountId);
    const savedOrder = localStorage.getItem(storageKey);
    
    if (savedOrder) {
      return JSON.parse(savedOrder);
    }
  } catch (error) {
    console.warn('Failed to parse saved property order:', error);
  }
  
  return [];
}

/**
 * Order properties based on saved order from localStorage
 * @param {Array} properties - Array of property objects
 * @param {string} accountId - Current account ID
 * @returns {Array} Ordered array of properties
 */
export function orderProperties(properties, accountId) {
  if (!properties || properties.length === 0) return [];
  
  const propertyOrder = getPropertyOrder(accountId);
  
  // If no saved order, return properties as-is
  if (!propertyOrder || propertyOrder.length === 0) {
    return properties;
  }
  
  // Create a map for quick lookup
  const propertyMap = new Map(properties.map(p => [p.id, p]));
  
  // First, add properties in saved order
  const ordered = propertyOrder
    .map(id => propertyMap.get(id))
    .filter(Boolean);
  
  // Then add any new properties that aren't in the order
  const orderedIds = new Set(ordered.map(p => p.id));
  properties.forEach(p => {
    if (!orderedIds.has(p.id)) {
      ordered.push(p);
    }
  });
  
  return ordered;
}
