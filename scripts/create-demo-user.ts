/**
 * Script to create a demo user
 * Run with: npx tsx scripts/create-demo-user.ts
 * 
 * This script creates the demo@bonzai.io user account.
 */

import { hashPassword, createUser, getUserByEmail } from '../src/lib/auth';
import { sql } from '../src/lib/db';

async function createDemoUser() {
  const email = 'demo@bonzai.io';
  const password = 'testpass';
  const name = 'Demo User';

  try {
    console.log('Creating demo user...');
    console.log(`Email: ${email}`);
    console.log(`Name: ${name}`);

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      console.log('✅ Demo user already exists!');
      console.log(`User ID: ${existingUser.id}`);
      console.log(`Email: ${existingUser.email}`);
      console.log(`Name: ${existingUser.name}`);
      console.log('\nYou can log in with:');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password} (if unchanged)`);
      return;
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await hashPassword(password);

    // Create user
    console.log('Creating user...');
    const user = await createUser(email, passwordHash, name);

    console.log('✅ Demo user created successfully!');
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log('\nYou can now log in with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('❌ Error creating demo user:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
createDemoUser()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
