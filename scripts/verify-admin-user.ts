/**
 * Script to verify and fix admin user
 * Run with: npx tsx scripts/verify-admin-user.ts
 * 
 * This script checks if admin@bonzai.io exists and creates/updates it if needed.
 */

import { hashPassword, getUserByEmail, verifyPassword } from '../src/lib/auth';
import { sql } from '../src/lib/db';

async function verifyAdminUser() {
  const email = 'admin@bonzai.io';
  const password = 'testpass';
  const name = 'Admin User';

  try {
    console.log('Checking admin user...');
    console.log(`Email: ${email}`);

    // Check if user exists
    const existingUser = await getUserByEmail(email);
    
    if (existingUser) {
      console.log('✅ User exists!');
      console.log(`User ID: ${existingUser.id}`);
      console.log(`Name: ${existingUser.name}`);
      console.log(`Is Admin: ${existingUser.is_admin || false}`);
      
      // Check if password is correct
      const result = await sql`
        SELECT password_hash
        FROM users
        WHERE email = ${email}
        LIMIT 1
      ` as Array<{ password_hash: string }>;
      
      if (result[0]) {
        const isValid = await verifyPassword(password, result[0].password_hash);
        if (isValid) {
          console.log('✅ Password is correct!');
        } else {
          console.log('⚠️  Password is incorrect. Updating password...');
          const passwordHash = await hashPassword(password);
          await sql`
            UPDATE users
            SET password_hash = ${passwordHash}
            WHERE email = ${email}
          `;
          console.log('✅ Password updated!');
        }
      }
      
      // Ensure user is admin
      if (!existingUser.is_admin) {
        console.log('⚠️  User is not admin. Updating...');
        await sql`
          UPDATE users
          SET is_admin = TRUE
          WHERE email = ${email}
        `;
        console.log('✅ User updated to admin!');
      } else {
        console.log('✅ User is already admin!');
      }
      
      console.log('\n✅ Admin user is ready!');
      console.log(`You can log in with:`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      return;
    }

    // User doesn't exist, create it
    console.log('⚠️  User does not exist. Creating...');
    
    // Hash password
    console.log('Hashing password...');
    const passwordHash = await hashPassword(password);

    // Create user
    console.log('Creating user...');
    const result = await sql`
      INSERT INTO users (email, password_hash, name, is_admin)
      VALUES (${email}, ${passwordHash}, ${name}, TRUE)
      RETURNING id, email, name, is_admin
    ` as Array<{ id: string; email: string; name: string | null; is_admin: boolean }>;

    if (!result[0]) {
      throw new Error('Failed to create user');
    }

    console.log('✅ Admin user created successfully!');
    console.log(`User ID: ${result[0].id}`);
    console.log(`Email: ${result[0].email}`);
    console.log(`Name: ${result[0].name}`);
    console.log(`Is Admin: ${result[0].is_admin}`);
    console.log('\n✅ You can now log in with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('❌ Error verifying admin user:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check for common issues
      if (error.message.includes('POSTGRES_URL') || error.message.includes('connection')) {
        console.error('\n⚠️  Database connection error!');
        console.error('Make sure POSTGRES_URL is set in your .env.local file.');
      }
    }
    process.exit(1);
  }
}

// Run the script
verifyAdminUser()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
