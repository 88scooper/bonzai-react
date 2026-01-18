/**
 * Script to diagnose and fix demo account issues
 * Usage: npx tsx scripts/diagnose-demo-account.ts
 * 
 * This script will:
 * 1. Check if demo account exists
 * 2. Check if demo properties exist
 * 3. Update demo account email if missing
 */

import { Client } from 'pg';
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

async function diagnoseDemoAccount() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔍 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Check if demo account exists
    console.log('📋 Step 1: Checking demo account...\n');
    const demoAccountResult = await client.query(`
      SELECT id, name, email, user_id, is_demo, created_at 
      FROM accounts 
      WHERE is_demo = true
    `);

    if (demoAccountResult.rows.length === 0) {
      console.log('⚠️  Demo account NOT found in database\n');
      console.log('ℹ️  The demo account needs to be created. You can:');
      console.log('   1. Run the import script: npx tsx scripts/import-properties.ts');
      console.log('   2. Create it manually via the API or SQL\n');
    } else {
      const account = demoAccountResult.rows[0];
      console.log('✅ Demo account found:');
      console.log(`   ID: ${account.id}`);
      console.log(`   Name: ${account.name}`);
      console.log(`   Email: ${account.email || 'NULL (missing)'}`);
      console.log(`   User ID: ${account.user_id}`);
      console.log(`   Is Demo: ${account.is_demo}`);
      console.log(`   Created: ${account.created_at}\n`);

      // Step 2: Check if email is missing and update it
      if (!account.email || account.email === null) {
        console.log('📧 Step 2: Email is missing. Updating to demo@proplytics.ca...\n');
        const updateResult = await client.query(`
          UPDATE accounts 
          SET email = 'demo@proplytics.ca'
          WHERE id = $1
          RETURNING id, name, email
        `, [account.id]);

        if (updateResult.rows.length > 0) {
          const updated = updateResult.rows[0];
          console.log('✅ Email updated successfully:');
          console.log(`   ID: ${updated.id}`);
          console.log(`   Name: ${updated.name}`);
          console.log(`   Email: ${updated.email}\n`);
        }
      } else if (account.email !== 'demo@proplytics.ca') {
        console.log(`⚠️  Email is set to '${account.email}' (expected: 'demo@proplytics.ca')`);
        console.log('📧 Updating email to demo@proplytics.ca...\n');
        const updateResult = await client.query(`
          UPDATE accounts 
          SET email = 'demo@proplytics.ca'
          WHERE id = $1
          RETURNING id, name, email
        `, [account.id]);

        if (updateResult.rows.length > 0) {
          const updated = updateResult.rows[0];
          console.log('✅ Email updated successfully:');
          console.log(`   ID: ${updated.id}`);
          console.log(`   Name: ${updated.name}`);
          console.log(`   Email: ${updated.email}\n`);
        }
      } else {
        console.log('✅ Email is already set correctly: demo@proplytics.ca\n');
      }

      // Step 3: Check demo properties
      console.log('📦 Step 3: Checking demo properties...\n');
      const propertiesResult = await client.query(`
        SELECT p.id, p.nickname, p.address, a.name as account_name, a.is_demo
        FROM properties p
        JOIN accounts a ON p.account_id = a.id
        WHERE a.is_demo = true
        ORDER BY p.nickname
      `);

      if (propertiesResult.rows.length === 0) {
        console.log('⚠️  No properties found for demo account\n');
        console.log('ℹ️  Expected properties: First St, Second Dr, Third Avenue');
        console.log('   Run the import script to add them: npx tsx scripts/import-properties.ts\n');
      } else {
        console.log(`✅ Found ${propertiesResult.rows.length} properties:\n`);
        propertiesResult.rows.forEach((prop: any) => {
          console.log(`   - ${prop.nickname || 'Unnamed'}`);
          console.log(`     Address: ${prop.address || 'N/A'}`);
          console.log(`     ID: ${prop.id}\n`);
        });

        // Check for expected properties
        const expectedProperties = ['First St', 'Second Dr', 'Third Avenue'];
        const foundNicknames = propertiesResult.rows.map((p: any) => p.nickname);
        const missing = expectedProperties.filter(exp => !foundNicknames.includes(exp));
        
        if (missing.length > 0) {
          console.log('⚠️  Missing properties:');
          missing.forEach(name => console.log(`   - ${name}\n`));
        } else {
          console.log('✅ All expected properties found!\n');
        }
      }
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary\n');
    
    const finalAccountCheck = await client.query(`
      SELECT id, name, email, is_demo
      FROM accounts 
      WHERE is_demo = true
    `);
    
    if (finalAccountCheck.rows.length > 0) {
      const acc = finalAccountCheck.rows[0];
      console.log(`✅ Demo Account: ${acc.name} (${acc.email || 'no email'})`);
    } else {
      console.log('❌ Demo Account: NOT FOUND');
    }

    const propertyCount = await client.query(`
      SELECT COUNT(*) as count
      FROM properties p
      JOIN accounts a ON p.account_id = a.id
      WHERE a.is_demo = true
    `);
    
    console.log(`📦 Demo Properties: ${propertyCount.rows[0].count || 0} found`);
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

diagnoseDemoAccount();
