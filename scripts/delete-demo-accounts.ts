/**
 * Script to delete specific accounts from demo@bonzai.io user
 * Run with: npx tsx scripts/delete-demo-accounts.ts
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

async function deleteDemoAccounts() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🚀 Starting account deletion...\n');

    // Accounts to delete (by name and email for safety)
    const accountsToDelete = [
      { name: 'SC Properties', email: 'cooper.stuartc@gmail.com' },
      { name: 'testpass2', email: 'testpass2@proplytics.ca' }, // Will delete all 3 testpass2 accounts
    ];

    // First, find all accounts to delete
    console.log('📝 Finding accounts to delete...\n');
    
    const accountsToDeleteIds: string[] = [];

    for (const account of accountsToDelete) {
      const result = await client.query(
        'SELECT id, name, email, user_id, (SELECT COUNT(*) FROM properties WHERE account_id = accounts.id) as property_count FROM accounts WHERE name = $1 AND email = $2',
        [account.name, account.email]
      );

      for (const row of result.rows) {
        accountsToDeleteIds.push(row.id);
        console.log(`Found: ${row.name} (${row.email})`);
        console.log(`  ID: ${row.id}`);
        console.log(`  Properties: ${row.property_count}`);
        console.log(`  Will be deleted\n`);
      }
    }

    if (accountsToDeleteIds.length === 0) {
      console.log('⚠️  No accounts found to delete.\n');
      return;
    }

    // Delete accounts (CASCADE will delete associated properties, mortgages, expenses)
    console.log(`🗑️  Deleting ${accountsToDeleteIds.length} account(s)...\n`);
    
    for (const accountId of accountsToDeleteIds) {
      // Get account info before deletion for reporting
      const accountInfo = await client.query(
        'SELECT name, email, (SELECT COUNT(*) FROM properties WHERE account_id = $1) as property_count FROM accounts WHERE id = $1',
        [accountId]
      );

      const account = accountInfo.rows[0];
      const propertyCount = parseInt(account.property_count) || 0;

      // Delete the account (CASCADE will handle related records)
      await client.query('DELETE FROM accounts WHERE id = $1', [accountId]);

      console.log(`✅ Deleted: ${account.name} (${account.email})`);
      if (propertyCount > 0) {
        console.log(`   Also deleted ${propertyCount} associated property/properties`);
      }
      console.log('');
    }

    // Verify deletion
    console.log('📝 Verifying deletion...\n');
    
    const remainingResult = await client.query(
      'SELECT COUNT(*) as count FROM accounts WHERE id = ANY($1)',
      [accountsToDeleteIds]
    );

    const remainingCount = parseInt(remainingResult.rows[0].count);

    if (remainingCount === 0) {
      console.log('✅ All accounts successfully deleted!\n');
    } else {
      console.log(`⚠️  Warning: ${remainingCount} account(s) still exist.\n`);
    }

    // Show remaining accounts for demo@bonzai.io
    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      ['demo@bonzai.io']
    );

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      const remainingAccountsResult = await client.query(
        'SELECT id, name, email, (SELECT COUNT(*) FROM properties WHERE account_id = accounts.id) as property_count FROM accounts WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
      );

      console.log(`Remaining accounts for demo@bonzai.io: ${remainingAccountsResult.rows.length}\n`);
      remainingAccountsResult.rows.forEach((acc: any) => {
        console.log(`  - ${acc.name} (${acc.email}) - ${acc.property_count} properties`);
      });
    }

    console.log('\n✅ Deletion completed successfully!');
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
deleteDemoAccounts()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
