/**
 * Utility functions for generating URL-friendly slugs from property names
 */

/**
 * Generate a URL-friendly slug from a string
 * @param {string} name - The string to convert to a slug
 * @returns {string} - URL-friendly slug
 */
export function generateSlug(name) {
  if (!name) return '';
  
  return name
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate slug from a property object
 * Falls back to property ID if no name is available
 * @param {Object} property - Property object with nickname or name
 * @returns {string} - URL-friendly slug or empty string
 */
export function getPropertySlug(property) {
  if (!property) return '';
  
  const name = property?.nickname || property?.name || '';
  if (!name) return '';
  
  return generateSlug(name);
}

/**
 * Check if a string looks like a UUID
 * @param {string} str - String to check
 * @returns {boolean} - True if string matches UUID pattern
 */
export function isUUID(str) {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
