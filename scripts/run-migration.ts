/**
 * Script to run database migrations
 * Usage: npx tsx scripts/run-migration.ts <migration-file>
 * Example: npx tsx scripts/run-migration.ts migrations/004_add_events_table.sql
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ POSTGRES_URL environment variable is not set');
  console.error('Please set it in .env.local or export it before running this script');
  process.exit(1);
}

async function runMigration(migrationFile: string) {
  const client = new Client({ connectionString });
  
  try {
    console.log(`🚀 Running migration: ${migrationFile}...\n`);

    // Connect to database
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read the migration file
    const migrationPath = join(process.cwd(), migrationFile);
    const sqlContent = readFileSync(migrationPath, 'utf-8');

    // Execute the migration (execute entire file as one query)
    await client.query(sqlContent);

    console.log('✅ Migration completed successfully!\n');
  } catch (error: any) {
    console.error('❌ Migration failed:');
    if (error.message) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get migration file from command line arguments
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Please provide a migration file path');
  console.error('Usage: npx tsx scripts/run-migration.ts <migration-file>');
  console.error('Example: npx tsx scripts/run-migration.ts migrations/004_add_events_table.sql');
  process.exit(1);
}

runMigration(migrationFile);

