/**
 * Script to divide demo@bonzia.io account into two separate accounts
 * 
 * Account 1: Stuart Cooper (cooper.stuartc@gmail.com)
 *   Properties: 403-311 Richmond St E, 317-30 Tretti Way, 415-500 Wilson Ave
 * 
 * Account 2: Demo Account (demo@bonzai.io)
 *   Properties: First St, Second Dr, Third Avenue
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

async function divideDemoAccount() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🚀 Starting account division...\n');

    // Step 1: Find demo@bonzia.io user
    console.log('📝 Step 1: Finding demo@bonzia.io user...');
    const demoUserResult = await client.query(
      'SELECT id, email, name, created_at, is_admin FROM users WHERE email = $1 LIMIT 1',
      ['demo@bonzia.io']
    );
    
    if (demoUserResult.rows.length === 0) {
      throw new Error('demo@bonzia.io user not found. Please create this user first.');
    }
    const demoUser = demoUserResult.rows[0];
    console.log(`✅ Found user: ${demoUser.id} (${demoUser.email})\n`);

    // Step 2: Find or create cooper.stuartc@gmail.com user
    console.log('📝 Step 2: Finding cooper.stuartc@gmail.com user...');
    let cooperUserResult = await client.query(
      'SELECT id, email, name, created_at, is_admin FROM users WHERE email = $1 LIMIT 1',
      ['cooper.stuartc@gmail.com']
    );
    
    let cooperUser;
    if (cooperUserResult.rows.length === 0) {
      console.log('   User not found. Searching for similar user...');
      // Check if there's a user with "Stuart" or "Cooper" in the name
      const similarUserResult = await client.query(
        "SELECT id, email, name, created_at, is_admin FROM users WHERE name ILIKE '%stuart%' OR name ILIKE '%cooper%' LIMIT 1"
      );
      
      if (similarUserResult.rows.length > 0) {
        const similarUser = similarUserResult.rows[0];
        console.log(`   Found similar user: ${similarUser.email} (${similarUser.name})`);
        console.log(`   ⚠️  Note: You'll need to manually update this user's email to cooper.stuartc@gmail.com`);
        cooperUser = similarUser;
      } else {
        throw new Error('cooper.stuartc@gmail.com user not found. Please create this user first.\nYou can create it via signup or use the admin API.');
      }
    } else {
      cooperUser = cooperUserResult.rows[0];
    }
    console.log(`✅ Using user: ${cooperUser.id} (${cooperUser.email})\n`);

    // Step 3: Find accounts for both users
    console.log('📝 Step 3: Finding accounts...');
    
    // Find all accounts for demo@bonzia.io user
    const demoAccountsResult = await client.query(
      'SELECT id, name, email, is_demo, user_id, created_at, updated_at FROM accounts WHERE user_id = $1 ORDER BY created_at ASC',
      [demoUser.id]
    );
    const demoAccounts = demoAccountsResult.rows;

    console.log(`   Found ${demoAccounts.length} account(s) for demo@bonzia.io`);
    demoAccounts.forEach(acc => {
      console.log(`     - ${acc.name} (${acc.email || 'no email'}) - ID: ${acc.id}`);
    });

    // Find or create Stuart Cooper account
    const cooperAccountsResult = await client.query(
      "SELECT id, name, email, is_demo, user_id, created_at, updated_at FROM accounts WHERE user_id = $1 AND name = 'Stuart Cooper' LIMIT 1",
      [cooperUser.id]
    );

    let cooperAccount = cooperAccountsResult.rows[0];
    if (!cooperAccount) {
      console.log('   Creating Stuart Cooper account...');
      const createResult = await client.query(
        "INSERT INTO accounts (user_id, name, email, is_demo) VALUES ($1, 'Stuart Cooper', 'cooper.stuartc@gmail.com', false) RETURNING id, name, email, is_demo, user_id, created_at, updated_at",
        [cooperUser.id]
      );
      cooperAccount = createResult.rows[0];
      console.log(`✅ Created Stuart Cooper account: ${cooperAccount.id}\n`);
    } else {
      console.log(`✅ Found Stuart Cooper account: ${cooperAccount.id}\n`);
    }

    // Find or create/update Demo Account (demo@bonzai.io)
    let demoAccount = demoAccounts.find(acc => acc.is_demo || acc.name === 'Demo Account');
    
    if (!demoAccount) {
      console.log('   Creating Demo Account...');
      const createResult = await client.query(
        "INSERT INTO accounts (user_id, name, email, is_demo) VALUES ($1, 'Demo Account', 'demo@bonzai.io', true) RETURNING id, name, email, is_demo, user_id, created_at, updated_at",
        [demoUser.id]
      );
      demoAccount = createResult.rows[0];
      console.log(`✅ Created Demo Account: ${demoAccount.id}\n`);
    } else {
      // Update existing demo account email
      console.log('   Updating Demo Account email to demo@bonzai.io...');
      await client.query(
        "UPDATE accounts SET email = 'demo@bonzai.io', is_demo = true, name = 'Demo Account' WHERE id = $1",
        [demoAccount.id]
      );
      console.log(`✅ Updated Demo Account: ${demoAccount.id}\n`);
    }

    // Step 4: Get all properties from demo user's accounts
    console.log('📝 Step 4: Finding properties...');
    
    // Get all property IDs from all demo user's accounts
    const allPropertyIds = demoAccounts.map(acc => acc.id);
    
    if (allPropertyIds.length === 0) {
      console.log('   ⚠️  No accounts found with properties to move\n');
    } else {
      const allPropertiesResult = await client.query(
        `SELECT id, account_id, nickname, address FROM properties WHERE account_id = ANY($1) ORDER BY address ASC`,
        [allPropertyIds]
      );
      const allProperties = allPropertiesResult.rows;

      console.log(`   Found ${allProperties.length} properties total:`);
      allProperties.forEach(prop => {
        console.log(`     - ${prop.nickname || 'No nickname'} (${prop.address || 'No address'}) - ID: ${prop.id}`);
      });
      console.log('');

      // Step 5: Identify properties to move
      const propertiesToMove = {
        cooper: [] as string[],
        demo: [] as string[]
      };

      // Properties for Stuart Cooper (match by address pattern)
      const cooperPropertyPatterns = [
        '403-311 richmond', '311-403 richmond', 'richmond st e', 'richmond street east',
        '317-30 tretti', '30 tretti way', 'tretti way',
        '415-500 wilson', '500 wilson ave', 'wilson ave'
      ];

      // Properties for Demo Account (match by address pattern)
      const demoPropertyPatterns = [
        'first st', 'first street',
        'second dr', 'second drive',
        'third avenue', 'third ave'
      ];

      for (const prop of allProperties) {
        const address = (prop.address || prop.nickname || '').toLowerCase();
        
        // Check if it's a Cooper property
        if (cooperPropertyPatterns.some(pattern => address.includes(pattern))) {
          propertiesToMove.cooper.push(prop.id);
          console.log(`   → Moving to Cooper: ${prop.nickname || 'No nickname'} (${prop.address || 'No address'})`);
        }
        // Check if it's a Demo property
        else if (demoPropertyPatterns.some(pattern => address.includes(pattern))) {
          propertiesToMove.demo.push(prop.id);
          console.log(`   → Moving to Demo: ${prop.nickname || 'No nickname'} (${prop.address || 'No address'})`);
        } else {
          // Properties that don't match - show warning
          console.log(`   ⚠️  Unmatched property: ${prop.nickname || 'No nickname'} (${prop.address || 'No address'})`);
        }
      }
      console.log('');

      // Step 6: Move properties to Stuart Cooper account
      if (propertiesToMove.cooper.length > 0) {
        console.log(`📝 Step 5: Moving ${propertiesToMove.cooper.length} properties to Stuart Cooper account...`);
        await client.query(
          'UPDATE properties SET account_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2)',
          [cooperAccount.id, propertiesToMove.cooper]
        );
        console.log(`✅ Moved ${propertiesToMove.cooper.length} properties to Stuart Cooper account\n`);
      }

      // Step 7: Move properties to Demo Account
      if (propertiesToMove.demo.length > 0) {
        console.log(`📝 Step 6: Moving ${propertiesToMove.demo.length} properties to Demo Account...`);
        await client.query(
          'UPDATE properties SET account_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2)',
          [demoAccount.id, propertiesToMove.demo]
        );
        console.log(`✅ Moved ${propertiesToMove.demo.length} properties to Demo Account\n`);
      }
    }

    // Step 8: Verify final state
    console.log('📝 Step 7: Verifying final state...\n');
    
    const cooperPropsResult = await client.query(
      'SELECT id, nickname, address FROM properties WHERE account_id = $1 ORDER BY address ASC',
      [cooperAccount.id]
    );
    const cooperProps = cooperPropsResult.rows;
    
    const demoPropsResult = await client.query(
      'SELECT id, nickname, address FROM properties WHERE account_id = $1 ORDER BY address ASC',
      [demoAccount.id]
    );
    const demoProps = demoPropsResult.rows;

    console.log('✅ Final State:\n');
    console.log(`Stuart Cooper Account (${cooperAccount.id}):`);
    console.log(`  Email: cooper.stuartc@gmail.com`);
    console.log(`  Properties (${cooperProps.length}):`);
    cooperProps.forEach(prop => {
      console.log(`    - ${prop.nickname || 'No nickname'} (${prop.address || 'No address'})`);
    });
    console.log('');
    
    console.log(`Demo Account (${demoAccount.id}):`);
    console.log(`  Email: demo@bonzai.io`);
    console.log(`  Properties (${demoProps.length}):`);
    demoProps.forEach(prop => {
      console.log(`    - ${prop.nickname || 'No nickname'} (${prop.address || 'No address'})`);
    });
    console.log('');

    console.log('✅ Account division completed successfully!');
  } catch (error: any) {
    console.error('❌ Error dividing account:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
divideDemoAccount()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
