/**
 * Script to list all accounts associated with demo@bonzai.io user
 * Run with: npx tsx scripts/list-demo-accounts.ts
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

async function listDemoAccounts() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🔍 Finding accounts for demo@bonzai.io...\n');

    // Step 1: Find user
    console.log('📝 Finding demo@bonzai.io user...');
    const userResult = await client.query(
      'SELECT id, email, name FROM users WHERE email = $1 LIMIT 1',
      ['demo@bonzai.io']
    );

    if (userResult.rows.length === 0) {
      throw new Error('demo@bonzai.io user not found.');
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}\n`);

    // Step 2: Get all accounts for this user
    console.log('📝 Fetching accounts...');
    const accountsResult = await client.query(
      `SELECT 
        a.id, 
        a.name, 
        a.email, 
        a.is_demo, 
        a.created_at, 
        a.updated_at,
        COUNT(DISTINCT p.id) as property_count
       FROM accounts a
       LEFT JOIN properties p ON p.account_id = a.id
       WHERE a.user_id = $1
       GROUP BY a.id, a.name, a.email, a.is_demo, a.created_at, a.updated_at
       ORDER BY a.created_at ASC`,
      [user.id]
    );

    const accounts = accountsResult.rows;

    console.log(`✅ Found ${accounts.length} account(s):\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    accounts.forEach((account, index) => {
      console.log(`\n${index + 1}. Account: ${account.name}`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Email: ${account.email || '(null)'}`);
      console.log(`   Is Demo: ${account.is_demo}`);
      console.log(`   Properties: ${account.property_count}`);
      console.log(`   Created: ${new Date(account.created_at).toLocaleString()}`);
      console.log(`   Updated: ${new Date(account.updated_at).toLocaleString()}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 3: Get property details for each account
    console.log('📝 Fetching property details...\n');
    
    for (const account of accounts) {
      const propertiesResult = await client.query(
        'SELECT id, nickname, address FROM properties WHERE account_id = $1 ORDER BY address ASC',
        [account.id]
      );

      if (propertiesResult.rows.length > 0) {
        console.log(`Properties for "${account.name}" (${account.id}):`);
        propertiesResult.rows.forEach((prop: any) => {
          console.log(`  - ${prop.nickname || 'No nickname'} (${prop.address || 'No address'})`);
        });
        console.log('');
      }
    }

    console.log('✅ Query completed successfully!');
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
listDemoAccounts()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
