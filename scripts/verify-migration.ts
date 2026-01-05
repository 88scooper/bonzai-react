/**
 * Script to verify migrations were run successfully
 * Usage: npx tsx scripts/verify-migration.ts
 */

import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ POSTGRES_URL environment variable is not set');
  process.exit(1);
}

async function verifyMigration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events'"
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Events table exists');
      
      // Check columns
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'events'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Table columns:');
      columns.rows.forEach((row: any) => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
      
      // Check indexes
      const indexes = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'events'
      `);
      
      if (indexes.rows.length > 0) {
        console.log('\n📊 Indexes:');
        indexes.rows.forEach((row: any) => {
          console.log(`   - ${row.indexname}`);
        });
      }
      
    } else {
      console.log('❌ Events table not found');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Verification failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyMigration();

