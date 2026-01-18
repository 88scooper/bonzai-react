/**
 * Script to update demo@bonzia.io user name to "Demo Account"
 * Run with: npx tsx scripts/update-demo-user-name.ts
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

async function updateDemoUserName() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🚀 Updating demo user name...\n');

    // Step 1: Find demo@bonzia.io user
    console.log('📝 Finding demo@bonzia.io user...');
    const userResult = await client.query(
      'SELECT id, email, name FROM users WHERE email = $1 LIMIT 1',
      ['demo@bonzia.io']
    );

    if (userResult.rows.length === 0) {
      throw new Error('demo@bonzia.io user not found.');
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.id}`);
    console.log(`   Current name: ${user.name || '(null)'}`);
    console.log(`   Email: ${user.email}\n`);

    if (user.name === 'Demo Account') {
      console.log('✅ User name is already "Demo Account". No update needed.\n');
      return;
    }

    // Step 2: Update user name
    console.log('📝 Updating user name to "Demo Account"...');
    await client.query(
      "UPDATE users SET name = 'Demo Account', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );
    console.log('✅ User name updated successfully!\n');

    // Step 3: Verify
    const verifyResult = await client.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [user.id]
    );

    const updatedUser = verifyResult.rows[0];
    console.log('✅ Final State:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`User ID: ${updatedUser.id}`);
    console.log(`Email: ${updatedUser.email}`);
    console.log(`Name: ${updatedUser.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Update completed successfully!');
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
updateDemoUserName()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
