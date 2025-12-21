import { neon } from '@neondatabase/serverless';

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

/**
 * Neon database SQL tagged template function
 * Created once at module load time for better performance in serverless environments
 */
export const sql = neon(connectionString);

