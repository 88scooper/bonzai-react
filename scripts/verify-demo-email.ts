import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

(async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  
  // Check all demo accounts
  const result = await client.query(`
    SELECT id, name, email, is_demo, created_at 
    FROM accounts 
    WHERE is_demo = true 
    ORDER BY created_at
  `);
  
  console.log(`Found ${result.rows.length} demo account(s):\n`);
  result.rows.forEach((row: any, i: number) => {
    console.log(`${i+1}. ID: ${row.id}`);
    console.log(`   Name: ${row.name}`);
    console.log(`   Email: ${row.email || 'NULL'}`);
    console.log(`   Created: ${row.created_at}\n`);
  });
  
  // Update all demo accounts to have the correct email
  if (result.rows.length > 0) {
    console.log('Updating all demo accounts to demo@proplytics.ca...\n');
    const updateResult = await client.query(`
      UPDATE accounts 
      SET email = 'demo@proplytics.ca'
      WHERE is_demo = true
      RETURNING id, name, email
    `);
    
    console.log(`✅ Updated ${updateResult.rows.length} demo account(s):\n`);
    updateResult.rows.forEach((row: any) => {
      console.log(`   - ${row.name}: ${row.email}`);
    });
  }
  
  await client.end();
})();
