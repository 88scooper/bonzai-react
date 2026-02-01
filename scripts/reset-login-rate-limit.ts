/**
 * Script to reset login rate limits
 * Run with: npx tsx scripts/reset-login-rate-limit.ts
 * 
 * This script clears all login rate limits from the database.
 */

import { clearAllRateLimits, clearRateLimit } from '../src/lib/rate-limit';
import { sql } from '../src/lib/db';

async function resetLoginRateLimits() {
  try {
    console.log('Resetting login rate limits...');
    
    // Option 1: Clear all login-related rate limits
    const loginLimits = await sql`
      SELECT key FROM rate_limits 
      WHERE key LIKE 'login:%'
    ` as Array<{ key: string }>;
    
    if (loginLimits.length > 0) {
      console.log(`Found ${loginLimits.length} login rate limit entries:`);
      for (const limit of loginLimits) {
        console.log(`  - ${limit.key}`);
        await clearRateLimit(limit.key);
      }
      console.log('✅ Cleared all login rate limits');
    } else {
      console.log('ℹ️  No login rate limits found');
    }
    
    // Option 2: Clear all rate limits (uncomment if needed)
    // console.log('Clearing ALL rate limits...');
    // await clearAllRateLimits();
    // console.log('✅ Cleared all rate limits');
    
    console.log('\n✅ Script completed successfully!');
    console.log('You can now try logging in again.');
  } catch (error) {
    console.error('❌ Error resetting rate limits:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      if (error.message.includes('POSTGRES_URL') || error.message.includes('connection')) {
        console.error('\n⚠️  Database connection error!');
        console.error('Make sure POSTGRES_URL is set in your .env.local file.');
      }
    }
    process.exit(1);
  }
}

// Run the script
resetLoginRateLimits()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
