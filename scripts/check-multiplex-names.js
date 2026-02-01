const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

const sql = neon(process.env.POSTGRES_URL);

async function checkMultiplex() {
  try {
    // Find demo account
    const account = await sql`
      SELECT a.id 
      FROM accounts a
      JOIN users u ON a.user_id = u.id
      WHERE u.email = 'demo@bonzai.io' AND a.is_demo = true
      LIMIT 1
    `;

    if (account.length === 0) {
      console.log('Demo account not found');
      return;
    }

    // Find all properties with "Multiplex" in the name
    const properties = await sql`
      SELECT id, nickname, address 
      FROM properties 
      WHERE account_id = ${account[0].id} 
      AND (nickname ILIKE '%multiplex%' OR address ILIKE '%third%')
      ORDER BY nickname
    `;

    console.log(`Found ${properties.length} multiplex properties:\n`);
    properties.forEach(prop => {
      console.log(`  - ID: ${prop.id}`);
      console.log(`    Nickname: "${prop.nickname}"`);
      console.log(`    Address: ${prop.address}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkMultiplex();
