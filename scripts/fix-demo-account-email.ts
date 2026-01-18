import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

(async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();

  const targetEmail = 'demo@bonzia.io';
  const targetPassword = 'testpass';

  try {
    // Find the demo account with properties (the active one)
    const accountWithProps = await client.query(`
      SELECT a.id as account_id, a.user_id, u.email as user_email, COUNT(p.id) as property_count
      FROM accounts a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN properties p ON p.account_id = a.id
      WHERE a.is_demo = true
      GROUP BY a.id, a.user_id, u.email
      HAVING COUNT(p.id) > 0
      ORDER BY property_count DESC
      LIMIT 1
    `);

    if (accountWithProps.rows.length === 0) {
      console.log('❌ No demo account with properties found');
      await client.end();
      return;
    }

    const activeAccount = accountWithProps.rows[0];
    console.log('✅ Found active demo account:');
    console.log(`   Account ID: ${activeAccount.account_id}`);
    console.log(`   User ID: ${activeAccount.user_id}`);
    console.log(`   Current User Email: ${activeAccount.user_email}`);
    console.log(`   Properties: ${activeAccount.property_count}\n`);

    // Check if another user already has demo@bonzia.io
    const existingUser = await client.query(`
      SELECT id, email FROM users WHERE email = $1 AND id != $2
    `, [targetEmail, activeAccount.user_id]);

    if (existingUser.rows.length > 0) {
      console.log(`⚠️  Another user has email ${targetEmail}:`);
      console.log(`   User ID: ${existingUser.rows[0].id}`);
      console.log(`   Updating that user's email first...\n`);

      // Update the other user's email to free it up
      await client.query(`
        UPDATE users SET email = $1 WHERE id = $2
      `, [`old-${existingUser.rows[0].id.substring(0, 8)}@bonzia.io`, existingUser.rows[0].id]);
      console.log(`✅ Freed up email ${targetEmail}\n`);
    }

    // Now update the active user to demo@bonzia.io
    console.log(`📧 Updating active user to ${targetEmail}...`);
    const passwordHash = await bcrypt.hash(targetPassword, 12);
    
    const updateResult = await client.query(`
      UPDATE users 
      SET email = $1, password_hash = $2
      WHERE id = $3
      RETURNING id, email
    `, [targetEmail, passwordHash, activeAccount.user_id]);

    if (updateResult.rows.length > 0) {
      console.log(`✅ User updated successfully:`);
      console.log(`   User ID: ${updateResult.rows[0].id}`);
      console.log(`   Email: ${updateResult.rows[0].email}\n`);
    }

    // Verify account email is also correct
    const accountCheck = await client.query(`
      SELECT id, email FROM accounts WHERE id = $1
    `, [activeAccount.account_id]);

    if (accountCheck.rows[0].email !== targetEmail) {
      await client.query(`
        UPDATE accounts SET email = $1 WHERE id = $2
      `, [targetEmail, activeAccount.account_id]);
      console.log(`✅ Account email updated to ${targetEmail}\n`);
    }

    // Final verification
    const finalCheck = await client.query(`
      SELECT a.id, a.email as account_email, u.email as user_email
      FROM accounts a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [activeAccount.account_id]);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Update Complete!\n');
    console.log('Final Status:');
    const final = finalCheck.rows[0];
    console.log(`   Account Email: ${final.account_email}`);
    console.log(`   User Email: ${final.user_email}`);
    console.log(`   Password: ${targetPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
})();
