/**
 * Script to update property thumbnails for:
 * - King West Condo -> /images/King West Condo.png
 * - Eglinton Condo -> /images/Eglinton Condo.png
 * - Gerrard Street Multiplex -> /images/Gerrard St Multiplex.png
 * 
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

interface PropertyUpdate {
  nickname: string;
  imageUrl: string;
}

const propertyUpdates: PropertyUpdate[] = [
  { nickname: 'King West Condo', imageUrl: '/images/King West Condo.png' },
  { nickname: 'Eglinton Condo', imageUrl: '/images/Eglinton Condo.png' },
  { nickname: 'Gerrard Street Multiplex', imageUrl: '/images/Gerrard St Multiplex.png' }
];

async function updatePropertyThumbnails() {
  try {
    console.log('🔍 Searching for properties to update...\n');

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const update of propertyUpdates) {
      console.log(`📝 Processing: ${update.nickname}...`);

      // Find the property by nickname
      const properties = await sql`
        SELECT 
          p.id, 
          p.nickname, 
          p.property_data,
          a.name as account_name,
          a.is_demo
        FROM properties p
        INNER JOIN accounts a ON p.account_id = a.id
        WHERE p.nickname = ${update.nickname}
        ORDER BY a.is_demo DESC, p.created_at DESC
      ` as Array<{
        id: string;
        nickname: string | null;
        property_data: any;
        account_name: string;
        is_demo: boolean;
      }>;

      if (properties.length === 0) {
        console.log(`   ⚠️  Property not found: ${update.nickname}`);
        notFoundCount++;
        continue;
      }

      // Update all matching properties (in case there are duplicates)
      for (const property of properties) {
        console.log(`   ✅ Found: ${property.nickname} (ID: ${property.id})`);
        console.log(`      Account: ${property.account_name} (Demo: ${property.is_demo})`);

        // Get current property_data
        const currentPropertyData = property.property_data || {};
        
        // Update property_data with imageUrl
        const updatedPropertyData = {
          ...currentPropertyData,
          imageUrl: update.imageUrl,
          imageUrls: currentPropertyData.imageUrls && Array.isArray(currentPropertyData.imageUrls) 
            ? [...new Set([update.imageUrl, ...currentPropertyData.imageUrls])] // Add to array if not already present
            : [update.imageUrl] // Create new array if it doesn't exist
        };

        console.log(`   📝 Setting imageUrl: ${update.imageUrl}`);
        console.log(`   📝 Setting imageUrls: [${updatedPropertyData.imageUrls.join(', ')}]`);

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
          console.log(`   ✅ Successfully updated!`);
          console.log(`      Image URL: ${updatedProperty.property_data?.imageUrl || 'N/A'}`);
          console.log(`      Image URLs: ${JSON.stringify(updatedProperty.property_data?.imageUrls || [])}\n`);
          updatedCount++;
        } else {
          console.log(`   ❌ Failed to update property\n`);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updatedCount} properties`);
    console.log(`   ⚠️  Not found: ${notFoundCount} properties`);

    if (updatedCount === 0 && notFoundCount > 0) {
      console.error('\n❌ No properties were updated. Please check that the properties exist in the database.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error updating properties:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
updatePropertyThumbnails()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
