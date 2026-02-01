/**
 * Script to delete the "Multiplex - Demo" property
 * 
 * Run with: npx tsx scripts/delete-multiplex-demo.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ POSTGRES_URL environment variable is not set');
  process.exit(1);
}

async function deleteMultiplexDemo() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🗑️  Deleting "Multiplex - Demo" property...\n');

    // Find demo account
    const accountResult = await client.query(
      `SELECT a.id 
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE u.email = 'demo@bonzai.io' AND a.is_demo = true
       LIMIT 1`
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Demo account not found.');
    }

    const accountId = accountResult.rows[0].id;

    // Find the property
    const propertyResult = await client.query(
      `SELECT id, nickname, address 
       FROM properties 
       WHERE account_id = $1 AND nickname = 'Multiplex - Demo'`,
      [accountId]
    );

    if (propertyResult.rows.length === 0) {
      console.log('✅ Property "Multiplex - Demo" not found. It may have already been deleted.\n');
      return;
    }

    const property = propertyResult.rows[0];
    console.log(`📋 Found property: ${property.nickname} (${property.address})`);
    console.log(`   ID: ${property.id}\n`);

    // Delete expenses
    const expensesResult = await client.query(
      'DELETE FROM expenses WHERE property_id = $1',
      [property.id]
    );
    console.log(`✅ Deleted ${expensesResult.rowCount} expenses`);

    // Delete mortgages
    const mortgagesResult = await client.query(
      'DELETE FROM mortgages WHERE property_id = $1',
      [property.id]
    );
    console.log(`✅ Deleted ${mortgagesResult.rowCount} mortgages`);

    // Delete property
    await client.query('DELETE FROM properties WHERE id = $1', [property.id]);
    console.log(`✅ Deleted property: ${property.nickname}`);

    console.log('\n✅ Successfully deleted "Multiplex - Demo" property!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deleteMultiplexDemo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
