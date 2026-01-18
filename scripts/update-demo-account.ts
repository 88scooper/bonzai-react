/**
 * Script to update demo account email and password
 * Usage: npx tsx scripts/update-demo-account.ts
 * 
 * This script will:
 * 1. Find all demo accounts and their associated users
 * 2. Update user email to demo@bonzia.io
 * 3. Update user password to testpass (hashed)
 * 4. Update account email to demo@bonzia.io
 */

import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Hash password using bcrypt (same as auth.ts)
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ POSTGRES_URL environment variable is not set');
  console.error('Please set it in .env.local or export it before running this script');
  process.exit(1);
}

async function updateDemoAccount() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔍 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected to database\n');

    const newEmail = 'demo@bonzia.io';
    const newPassword = 'testpass';

    // Step 1: Find all demo accounts and their users
    console.log('📋 Step 1: Finding demo accounts and associated users...\n');
    const accountsResult = await client.query(`
      SELECT a.id as account_id, a.name as account_name, a.email as account_email, 
             a.user_id, u.id as user_id, u.email as user_email
      FROM accounts a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.is_demo = true
      ORDER BY a.created_at
    `);

    if (accountsResult.rows.length === 0) {
      console.log('⚠️  No demo accounts found in database\n');
      console.log('ℹ️  You may need to create a demo account first.\n');
      return;
    }

    console.log(`Found ${accountsResult.rows.length} demo account(s):\n`);
    accountsResult.rows.forEach((row: any, i: number) => {
      console.log(`${i+1}. Account ID: ${row.account_id}`);
      console.log(`   Account Name: ${row.account_name}`);
      console.log(`   Account Email: ${row.account_email || 'NULL'}`);
      console.log(`   User ID: ${row.user_id || 'NULL'}`);
      console.log(`   User Email: ${row.user_email || 'NULL'}\n`);
    });

    // Get unique user IDs
    const userIds = [...new Set(accountsResult.rows.map((r: any) => r.user_id).filter(Boolean))];
    console.log(`Found ${userIds.length} unique user(s) associated with demo accounts\n`);

    // Step 2: Update users (email and password)
    if (userIds.length > 0) {
      console.log('📧 Step 2: Updating user email and password...\n');
      
      // Hash the password
      console.log('   Hashing password...');
      const passwordHash = await hashPassword(newPassword);
      console.log('   ✅ Password hashed\n');

      // Update each user
      for (const userId of userIds) {
        // Check if a user with the new email already exists (different user)
        const existingUserCheck = await client.query(`
          SELECT id, email FROM users WHERE email = $1 AND id != $2
        `, [newEmail, userId]);

        if (existingUserCheck.rows.length > 0) {
          console.log(`⚠️  Warning: User with email ${newEmail} already exists with ID ${existingUserCheck.rows[0].id}`);
          console.log(`   Skipping update for user ${userId} to avoid email conflict\n`);
          continue;
        }

        // Update the user
        const updateUserResult = await client.query(`
          UPDATE users 
          SET email = $1, password_hash = $2
          WHERE id = $3
          RETURNING id, email
        `, [newEmail, passwordHash, userId]);

        if (updateUserResult.rows.length > 0) {
          const updated = updateUserResult.rows[0];
          console.log(`   ✅ Updated user ${userId}:`);
          console.log(`      Email: ${updated.email}\n`);
        } else {
          console.log(`   ⚠️  User ${userId} not found or update failed\n`);
        }
      }
    } else {
      console.log('⚠️  No user IDs found associated with demo accounts\n');
      console.log('ℹ️  Demo accounts may not have associated users. This is unusual.\n');
    }

    // Step 3: Update account emails
    console.log('📧 Step 3: Updating account emails...\n');
    const updateAccountsResult = await client.query(`
      UPDATE accounts 
      SET email = $1
      WHERE is_demo = true
      RETURNING id, name, email
    `, [newEmail]);

    if (updateAccountsResult.rows.length > 0) {
      console.log(`✅ Updated ${updateAccountsResult.rows.length} demo account(s):\n`);
      updateAccountsResult.rows.forEach((row: any) => {
        console.log(`   - ${row.name}: ${row.email}`);
      });
      console.log();
    }

    // Step 4: Verify the updates
    console.log('🔍 Step 4: Verifying updates...\n');
    const verifyAccounts = await client.query(`
      SELECT a.id as account_id, a.name, a.email as account_email, 
             u.id as user_id, u.email as user_email
      FROM accounts a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.is_demo = true
    `);

    console.log('📊 Final Status:\n');
    verifyAccounts.rows.forEach((row: any, i: number) => {
      console.log(`${i+1}. Account: ${row.name}`);
      console.log(`   Account Email: ${row.account_email || 'NULL'}`);
      console.log(`   User Email: ${row.user_email || 'NULL'}`);
      console.log(`   Match: ${row.account_email === row.user_email && row.account_email === newEmail ? '✅' : '⚠️'}\n`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Update Complete!\n');
    console.log(`Demo account email: ${newEmail}`);
    console.log(`Demo account password: ${newPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ Error occurred:');
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

updateDemoAccount();
