/**
 * Script to reset passwords for admin@bonzai.io and demo@bonzai.io
 * Run with: npx tsx scripts/reset-passwords.ts
 * 
 * This script resets both accounts to use password: testpass123!
 */

import { hashPassword } from '../src/lib/auth';
import { sql } from '../src/lib/db';

async function resetPasswords() {
  const password = 'testpass123!'; // Meets requirements: 10+ chars, has number, has special char
  
  try {
    console.log('Resetting passwords for admin@bonzai.io and demo@bonzai.io...');
    console.log(`New password: ${password}`);
    console.log('');

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await hashPassword(password);

    // Update admin@bonzai.io
    console.log('Updating admin@bonzai.io password...');
    const adminResult = await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE email = 'admin@bonzai.io'
      RETURNING id, email, name
    ` as Array<{ id: string; email: string; name: string | null }>;
    
    if (adminResult.length > 0) {
      console.log('✅ admin@bonzai.io password updated');
      console.log(`   User ID: ${adminResult[0].id}`);
      console.log(`   Email: ${adminResult[0].email}`);
      console.log(`   Name: ${adminResult[0].name}`);
    } else {
      console.log('❌ admin@bonzai.io not found');
    }

    console.log('');

    // Update demo@bonzai.io
    console.log('Updating demo@bonzai.io password...');
    const demoResult = await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE email = 'demo@bonzai.io'
      RETURNING id, email, name
    ` as Array<{ id: string; email: string; name: string | null }>;
    
    if (demoResult.length > 0) {
      console.log('✅ demo@bonzai.io password updated');
      console.log(`   User ID: ${demoResult[0].id}`);
      console.log(`   Email: ${demoResult[0].email}`);
      console.log(`   Name: ${demoResult[0].name}`);
    } else {
      console.log('❌ demo@bonzai.io not found');
    }

    console.log('');
    console.log('✅ Password reset complete!');
    console.log('');
    console.log('You can now log in with:');
    console.log('  Email: admin@bonzai.io');
    console.log('  Password: testpass123!');
    console.log('');
    console.log('  Email: demo@bonzai.io');
    console.log('  Password: testpass123!');
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
resetPasswords()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
