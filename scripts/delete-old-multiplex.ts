/**
 * Script to delete the old "Multiplex - Demo" property
 * This removes the old property now that we have "Gerrard Street Multiplex"
 * 
 * Run with: npx tsx scripts/delete-old-multiplex.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ POSTGRES_URL environment variable is not set');
  console.error('Please set it in .env.local or export it before running this script');
  process.exit(1);
}

async function deleteOldMultiplex() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🗑️  Deleting old Multiplex - Demo property...\n');

    // Step 1: Find demo@bonzai.io user
    console.log('📝 Finding demo@bonzai.io user...');
    const userResult = await client.query(
      'SELECT id, email FROM users WHERE LOWER(email) = $1 LIMIT 1',
      ['demo@bonzai.io']
    );

    if (userResult.rows.length === 0) {
      throw new Error('demo@bonzai.io user not found.');
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.id}\n`);

    // Step 2: Find demo account
    console.log('📝 Finding demo account...');
    const accountResult = await client.query(
      'SELECT id, name FROM accounts WHERE user_id = $1 AND is_demo = true LIMIT 1',
      [user.id]
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Demo account not found.');
    }

    const demoAccount = accountResult.rows[0];
    console.log(`✅ Found demo account: ${demoAccount.id}\n`);

    // Step 3: Find the old "Multiplex - Demo" property
    // Look for properties with nickname "Multiplex - Demo" or "Third Avenue" (the old one)
    console.log('📝 Searching for old Multiplex - Demo property...');
    const propertyResult = await client.query(
      `SELECT id, nickname, address, property_data->>'originalId' as original_id
       FROM properties 
       WHERE account_id = $1 
       AND (
         nickname = 'Multiplex - Demo' 
         OR nickname = 'Third Avenue'
       )
       AND address = '123 Third Avenue, Toronto, ON M3A 3A3'`,
      [demoAccount.id]
    );

    if (propertyResult.rows.length === 0) {
      console.log('✅ No old Multiplex property found. It may have already been deleted.\n');
      return;
    }

    console.log(`📋 Found ${propertyResult.rows.length} old multiplex property/properties:\n`);
    propertyResult.rows.forEach((prop: any) => {
      console.log(`   - ${prop.nickname} (${prop.address}) - ID: ${prop.id}`);
    });
    console.log('');

    // Step 4: Delete each old multiplex property
    for (const property of propertyResult.rows) {
      const propertyId = property.id;
      const propertyName = property.nickname;

      console.log(`🗑️  Deleting property: ${propertyName}...`);

      // Delete expenses first (foreign key constraint)
      const expensesResult = await client.query(
        'DELETE FROM expenses WHERE property_id = $1 RETURNING id',
        [propertyId]
      );
      console.log(`   ✅ Deleted ${expensesResult.rowCount} expenses`);

      // Delete mortgages
      const mortgagesResult = await client.query(
        'DELETE FROM mortgages WHERE property_id = $1 RETURNING id',
        [propertyId]
      );
      console.log(`   ✅ Deleted ${mortgagesResult.rowCount} mortgages`);

      // Delete property
      const propertyDeleteResult = await client.query(
        'DELETE FROM properties WHERE id = $1 RETURNING id',
        [propertyId]
      );
      console.log(`   ✅ Deleted property: ${propertyName}`);
      console.log('');
    }

    console.log('✅ Old multiplex property/properties deleted successfully!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error instanceof Error && error.stack) {
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
deleteOldMultiplex()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
