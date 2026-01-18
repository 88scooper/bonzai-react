/**
 * Script to update demo@bonzia.io user email to demo@bonzai.io
 * Run with: npx tsx scripts/update-demo-user-email.ts
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

async function updateDemoUserEmail() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🚀 Updating demo user email...\n');

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
    console.log(`   Current email: ${user.email}`);
    console.log(`   Name: ${user.name || '(null)'}\n`);

    // Step 2: Check if demo@bonzai.io already exists
    console.log('📝 Checking if demo@bonzai.io already exists...');
    const existingResult = await client.query(
      'SELECT id, email, name FROM users WHERE email = $1 LIMIT 1',
      ['demo@bonzai.io']
    );

    if (existingResult.rows.length > 0) {
      const existingUser = existingResult.rows[0];
      if (existingUser.id !== user.id) {
        throw new Error(`Email demo@bonzai.io is already taken by another user (${existingUser.id}). Please handle this conflict first.`);
      } else {
        console.log('✅ Email is already demo@bonzai.io. No update needed.\n');
        return;
      }
    }

    // Step 3: Update user email
    console.log('📝 Updating user email to demo@bonzai.io...');
    await client.query(
      "UPDATE users SET email = 'demo@bonzai.io', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );
    console.log('✅ User email updated successfully!\n');

    // Step 4: Verify
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
updateDemoUserEmail()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
