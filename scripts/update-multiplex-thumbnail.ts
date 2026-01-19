/**
 * Script to update the thumbnail for Multiplex - Demo property
 * This updates the property_data.imageUrl and property_data.imageUrls fields
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ POSTGRES_URL environment variable is not set');
  console.error('   Make sure you have a .env.local file with POSTGRES_URL');
  process.exit(1);
}

const sql = neon(connectionString);

async function updateMultiplexThumbnail() {
  try {
    console.log('🔍 Searching for Multiplex property in demo account...\n');

    // Find the property - look for properties with property_type = 'Multiplex' in demo accounts
    // or nickname = 'Third Avenue'
    const properties = await sql`
      SELECT 
        p.id, 
        p.nickname, 
        p.property_type, 
        p.property_data,
        a.name as account_name,
        a.is_demo
      FROM properties p
      INNER JOIN accounts a ON p.account_id = a.id
      WHERE (p.property_type = 'Multiplex' OR p.nickname ILIKE '%Third Avenue%' OR p.nickname ILIKE '%Multiplex%')
      AND (a.is_demo = true OR a.name ILIKE '%Demo%')
      ORDER BY a.is_demo DESC, p.created_at DESC
    ` as Array<{
      id: string;
      nickname: string | null;
      property_type: string | null;
      property_data: any;
      account_name: string;
      is_demo: boolean;
    }>;

    if (properties.length === 0) {
      console.error('❌ No Multiplex property found in demo account');
      console.error('   Searching for any property with "Third Avenue" or "Multiplex" in the name...');
      
      // Broader search
      const allProperties = await sql`
        SELECT 
          p.id, 
          p.nickname, 
          p.property_type, 
          a.name as account_name,
          a.is_demo
        FROM properties p
        INNER JOIN accounts a ON p.account_id = a.id
        WHERE p.property_type = 'Multiplex' OR p.nickname ILIKE '%Third%' OR p.nickname ILIKE '%Multiplex%'
        ORDER BY p.created_at DESC
      ` as Array<{
        id: string;
        nickname: string | null;
        property_type: string | null;
        account_name: string;
        is_demo: boolean;
      }>;

      if (allProperties.length > 0) {
        console.log('   Found properties:');
        allProperties.forEach(p => {
          console.log(`   - ${p.nickname || 'Unnamed'} (${p.property_type}) in account: ${p.account_name} (demo: ${p.is_demo})`);
        });
      }
      
      process.exit(1);
    }

    // Use the first matching property
    const property = properties[0];
    console.log(`✅ Found property: ${property.nickname || 'Unnamed'} (ID: ${property.id})`);
    console.log(`   Account: ${property.account_name} (Demo: ${property.is_demo})\n`);

    // Get current property_data
    const currentPropertyData = property.property_data || {};
    
    // Update property_data with imageUrl
    const updatedPropertyData = {
      ...currentPropertyData,
      imageUrl: '/images/Multiplex.png',
      imageUrls: currentPropertyData.imageUrls && Array.isArray(currentPropertyData.imageUrls) 
        ? [...new Set([...currentPropertyData.imageUrls, '/images/Multiplex.png'])] // Add if not already present
        : ['/images/Multiplex.png'] // Create new array if it doesn't exist
    };

    console.log('📝 Updating property with thumbnail...');
    console.log(`   Setting imageUrl: /images/Multiplex.png`);
    console.log(`   Setting imageUrls: [${updatedPropertyData.imageUrls.join(', ')}]\n`);

    // Update the property
    const result = await sql`
      UPDATE properties
      SET 
        property_data = ${JSON.stringify(updatedPropertyData)}::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${property.id}
      RETURNING id, nickname, property_data
    ` as Array<{
      id: string;
      nickname: string | null;
      property_data: any;
    }>;

    if (result.length > 0) {
      const updatedProperty = result[0];
      console.log('✅ Successfully updated property!');
      console.log(`   ID: ${updatedProperty.id}`);
      console.log(`   Nickname: ${updatedProperty.nickname || 'Unnamed'}`);
      console.log(`   Image URL: ${updatedProperty.property_data?.imageUrl || 'N/A'}`);
      console.log(`   Image URLs: ${JSON.stringify(updatedProperty.property_data?.imageUrls || [])}\n`);
    } else {
      console.error('❌ Failed to update property');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error updating property:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
updateMultiplexThumbnail()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
