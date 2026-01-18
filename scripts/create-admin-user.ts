/**
 * Script to create an admin user
 * Run with: npx tsx scripts/create-admin-user.ts
 * 
 * This script creates a user with admin privileges.
 * Make sure to run the database migration (003_add_admin_field.sql) first!
 */

import { hashPassword, createUser, getUserByEmail } from '../src/lib/auth';
import { sql } from '../src/lib/db';

async function createAdminUser() {
  const email = 'admin@bonzia.io';
  const password = 'testpass';
  const name = 'Admin User';

  try {
    console.log('Creating admin user...');
    console.log(`Email: ${email}`);
    console.log(`Name: ${name}`);

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      console.log('User already exists. Updating to admin...');
      
      // Update user to be admin
      await sql`
        UPDATE users
        SET is_admin = TRUE
        WHERE email = ${email}
      `;
      
      console.log('✅ User updated to admin successfully!');
      console.log(`User ID: ${existingUser.id}`);
      return;
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await hashPassword(password);

    // Create user
    console.log('Creating user...');
    const user = await createUser(email, passwordHash, name);

    // Update user to be admin
    console.log('Setting admin privileges...');
    await sql`
      UPDATE users
      SET is_admin = TRUE
      WHERE id = ${user.id}
    `;

    console.log('✅ Admin user created successfully!');
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log('\nYou can now log in with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

