/**
 * Script to create cooper.stuartc@gmail.com user and move Stuart Cooper account
 * Run with: npx tsx scripts/create-cooper-user.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ POSTGRES_URL environment variable is not set');
  console.error('Please set it in .env.local or export it before running this script');
  process.exit(1);
}

async function createCooperUser() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🚀 Starting user creation and account migration...\n');

    const email = 'cooper.stuartc@gmail.com';
    const password = 'testpass';
    const name = 'Stuart Cooper';

    // Step 1: Check if user already exists
    console.log(`📝 Step 1: Checking if user ${email} exists...`);
    const existingUserResult = await client.query(
      'SELECT id, email, name FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    let cooperUserId: string;
    
    if (existingUserResult.rows.length > 0) {
      const existingUser = existingUserResult.rows[0];
      console.log(`✅ User already exists: ${existingUser.id} (${existingUser.email})\n`);
      cooperUserId = existingUser.id;
    } else {
      // Step 2: Create new user
      console.log(`📝 Step 2: Creating new user ${email}...`);
      const passwordHash = await bcrypt.hash(password, 12);
      
      const createUserResult = await client.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email, passwordHash, name]
      );
      
      const newUser = createUserResult.rows[0];
      cooperUserId = newUser.id;
      console.log(`✅ User created: ${newUser.id} (${newUser.email})\n`);
    }

    // Step 3: Find Stuart Cooper account
    console.log('📝 Step 3: Finding Stuart Cooper account...');
    const accountResult = await client.query(
      "SELECT id, name, email, user_id, is_demo FROM accounts WHERE name = 'Stuart Cooper' AND email = 'cooper.stuartc@gmail.com' LIMIT 1"
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Stuart Cooper account not found. Please run the divide-demo-account script first.');
    }

    const cooperAccount = accountResult.rows[0];
    console.log(`✅ Found account: ${cooperAccount.id} (${cooperAccount.name})\n`);
    console.log(`   Current user_id: ${cooperAccount.user_id}`);
    console.log(`   Target user_id: ${cooperUserId}`);

    if (cooperAccount.user_id === cooperUserId) {
      console.log('\n✅ Account is already assigned to the correct user!\n');
      return;
    }

    // Step 4: Move account to cooper.stuartc@gmail.com user
    console.log(`\n📝 Step 4: Moving Stuart Cooper account to ${email} user...`);
    await client.query(
      'UPDATE accounts SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [cooperUserId, cooperAccount.id]
    );
    console.log(`✅ Account moved successfully!\n`);

    // Step 5: Verify final state
    console.log('📝 Step 5: Verifying final state...\n');
    
    const verifyResult = await client.query(
      `SELECT a.id, a.name, a.email, a.user_id, u.email as user_email, u.name as user_name,
              (SELECT COUNT(*) FROM properties WHERE account_id = a.id) as property_count
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [cooperAccount.id]
    );

    const final = verifyResult.rows[0];

    console.log('✅ Final State:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Account: ${final.name}`);
    console.log(`  Account ID: ${final.id}`);
    console.log(`  Account Email: ${final.email}`);
    console.log(`  User ID: ${final.user_id}`);
    console.log(`  User Email: ${final.user_email}`);
    console.log(`  User Name: ${final.user_name}`);
    console.log(`  Properties: ${final.property_count}`);
    console.log(`  Password: ${password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ User creation and account migration completed successfully!');
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
createCooperUser()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
