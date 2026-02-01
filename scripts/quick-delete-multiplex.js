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

async function deleteMultiplex() {
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

    // Find and delete the property
    const property = await sql`
      SELECT id FROM properties 
      WHERE account_id = ${account[0].id} 
      AND nickname = 'Multiplex - Demo'
    `;

    if (property.length === 0) {
      console.log('Property not found');
      return;
    }

    const propertyId = property[0].id;

    // Delete expenses
    await sql`DELETE FROM expenses WHERE property_id = ${propertyId}`;
    console.log('Deleted expenses');

    // Delete mortgages
    await sql`DELETE FROM mortgages WHERE property_id = ${propertyId}`;
    console.log('Deleted mortgages');

    // Delete property
    await sql`DELETE FROM properties WHERE id = ${propertyId}`;
    console.log('Deleted property');

    console.log('✅ Successfully deleted "Multiplex - Demo" property!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deleteMultiplex();
