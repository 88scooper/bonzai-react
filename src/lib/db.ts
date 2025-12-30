import { neon } from '@neondatabase/serverless';

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('⚠️  POSTGRES_URL environment variable is not set');
  console.error('Please check your .env.local file and ensure POSTGRES_URL is set correctly.');
  console.error('After updating .env.local, restart your development server with: npm run dev');
}

/**
 * Neon database SQL tagged template function
 * Created once at module load time for better performance in serverless environments
 * 
 * Note: If POSTGRES_URL is not set, queries will fail with a helpful error message.
 * Make sure to restart the dev server after setting environment variables.
 */
export const sql = connectionString 
  ? neon(connectionString)
  : (() => {
      throw new Error(
        'Database not configured: POSTGRES_URL environment variable is not set. ' +
        'Please check your .env.local file and restart the development server.'
      );
    }) as any;

