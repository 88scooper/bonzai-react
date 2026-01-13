import { neon } from '@neondatabase/serverless';

const connectionString = process.env.POSTGRES_URL;

// Create a dummy connection string for build time if POSTGRES_URL is not set
// This allows the build to complete without throwing an error
// The actual error will occur at runtime when queries are executed
const buildTimeConnectionString = connectionString || 'postgresql://build-time-placeholder';

/**
 * Neon database SQL tagged template function
 * 
 * Note: If POSTGRES_URL is not set, queries will fail at runtime with a connection error.
 * This allows the build to complete successfully even without the environment variable.
 * Make sure to set POSTGRES_URL in Vercel environment variables for production.
 */
export const sql = neon(buildTimeConnectionString);

