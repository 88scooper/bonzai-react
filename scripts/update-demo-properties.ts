/**
 * Script to update demo properties in the database with new data from properties.js
 * This updates existing demo properties with realistic Toronto investment property data
 * 
 * Run with: npx tsx scripts/update-demo-properties.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';
import { properties } from '../src/data/properties';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ POSTGRES_URL environment variable is not set');
  console.error('Please set it in .env.local or export it before running this script');
  process.exit(1);
}

async function updateDemoProperties() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🔄 Updating demo properties with new Toronto data...\n');

    // Step 1: Find demo@bonzai.io user
    console.log('📝 Finding demo@bonzai.io user...');
    const userResult = await client.query(
      'SELECT id, email FROM users WHERE LOWER(email) = $1 LIMIT 1',
      ['demo@bonzai.io']
    );

    if (userResult.rows.length === 0) {
      throw new Error('demo@bonzai.io user not found.');
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.id}\n`);

    // Step 2: Find demo account
    console.log('📝 Finding demo account...');
    const accountResult = await client.query(
      'SELECT id, name FROM accounts WHERE user_id = $1 AND is_demo = true LIMIT 1',
      [user.id]
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Demo account not found.');
    }

    const demoAccount = accountResult.rows[0];
    console.log(`✅ Found demo account: ${demoAccount.id}\n`);

    // Step 3: Get demo property IDs from properties.js
    const demoPropertyIds = ['first-st-1', 'second-dr-1', 'third-ave-1'];
    const demoProperties = properties.filter(p => demoPropertyIds.includes(p.id));

    console.log(`📋 Found ${demoProperties.length} properties to update:\n`);

    // Step 4: Update each property
    for (const property of demoProperties) {
      console.log(`🔄 Updating property: ${property.nickname} (${property.id})...`);

      // Find the property in database by originalId in property_data
      const existingPropertyResult = await client.query(
        `SELECT id FROM properties 
         WHERE account_id = $1 
         AND property_data->>'originalId' = $2
         LIMIT 1`,
        [demoAccount.id, property.id]
      );

      let propertyId: string;

      if (existingPropertyResult.rows.length === 0) {
        // Create property if it doesn't exist
        console.log(`   ➕ Creating new property...`);
        const propertyData = {
          account_id: demoAccount.id,
          nickname: property.nickname || property.name || 'Unnamed Property',
          address: property.address || '',
          purchase_price: property.purchasePrice || 0,
          purchase_date: property.purchaseDate || null,
          closing_costs: property.closingCosts || 0,
          renovation_costs: property.renovationCosts || 0,
          initial_renovations: property.initialRenovations || 0,
          current_market_value: property.currentMarketValue || property.currentValue || 0,
          year_built: property.yearBuilt || null,
          property_type: property.propertyType || property.type || null,
          size: property.size || property.squareFootage || null,
          unit_config: property.unitConfig || null,
          property_data: JSON.stringify({
            units: property.units || 1,
            rent: property.rent || null,
            tenants: property.tenants || [],
            originalId: property.id,
          })
        };

        const createResult = await client.query(
          `INSERT INTO properties (
            account_id, nickname, address, purchase_price, purchase_date,
            closing_costs, renovation_costs, initial_renovations,
            current_market_value, year_built, property_type, size, unit_config, property_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
          RETURNING id`,
          [
            propertyData.account_id,
            propertyData.nickname,
            propertyData.address,
            propertyData.purchase_price,
            propertyData.purchase_date,
            propertyData.closing_costs,
            propertyData.renovation_costs,
            propertyData.initial_renovations,
            propertyData.current_market_value,
            propertyData.year_built,
            propertyData.property_type,
            propertyData.size,
            propertyData.unit_config,
            propertyData.property_data
          ]
        );

        propertyId = createResult.rows[0].id;
        console.log(`   ✅ Created property: ${property.nickname}`);
      } else {
        propertyId = existingPropertyResult.rows[0].id;

        // Update property
        await client.query(
          `UPDATE properties 
           SET 
             nickname = $1,
             address = $2,
             purchase_price = $3,
             purchase_date = $4,
             closing_costs = $5,
             renovation_costs = $6,
             initial_renovations = $7,
             current_market_value = $8,
             year_built = $9,
             property_type = $10,
             size = $11,
             unit_config = $12,
             property_data = jsonb_set(
               COALESCE(property_data, '{}'::jsonb),
               '{rent}',
               $13::jsonb
             ),
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $14`,
          [
            property.nickname || property.name,
            property.address,
            property.purchasePrice,
            property.purchaseDate,
            property.closingCosts,
            property.renovationCosts,
            property.initialRenovations,
            property.currentMarketValue || property.currentValue,
            property.yearBuilt,
            property.propertyType || property.type,
            property.size || property.squareFootage,
            property.unitConfig,
            JSON.stringify(property.rent || {}),
            propertyId
          ]
        );

        console.log(`   ✅ Updated property: ${property.nickname}`);
      }

      // Update or create mortgage if exists
      if (property.mortgage) {
        const mortgageResult = await client.query(
          'SELECT id FROM mortgages WHERE property_id = $1 LIMIT 1',
          [propertyId]
        );

        if (mortgageResult.rows.length > 0) {
          await client.query(
            `UPDATE mortgages 
             SET 
               lender = $1,
               original_amount = $2,
               interest_rate = $3,
               rate_type = $4,
               term_months = $5,
               amortization_years = $6,
               payment_frequency = $7,
               start_date = $8,
               updated_at = CURRENT_TIMESTAMP
             WHERE property_id = $9`,
            [
              property.mortgage.lender,
              property.mortgage.originalAmount,
              property.mortgage.interestRate,
              property.mortgage.rateType,
              property.mortgage.termMonths,
              property.mortgage.amortizationYears,
              property.mortgage.paymentFrequency,
              property.mortgage.startDate,
              propertyId
            ]
          );
          console.log(`   ✅ Updated mortgage`);
        } else {
          // Create mortgage if it doesn't exist
          await client.query(
            `INSERT INTO mortgages (
              property_id, lender, original_amount, interest_rate, rate_type,
              term_months, amortization_years, payment_frequency, start_date, mortgage_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '{}'::jsonb)`,
            [
              propertyId,
              property.mortgage.lender,
              property.mortgage.originalAmount,
              property.mortgage.interestRate,
              property.mortgage.rateType,
              property.mortgage.termMonths,
              property.mortgage.amortizationYears,
              property.mortgage.paymentFrequency,
              property.mortgage.startDate
            ]
          );
          console.log(`   ✅ Created mortgage`);
        }
      }

      // Delete old expenses and insert new ones
      await client.query('DELETE FROM expenses WHERE property_id = $1', [propertyId]);
      console.log(`   🗑️  Deleted old expenses`);

      if (property.expenseHistory && Array.isArray(property.expenseHistory)) {
        for (const expense of property.expenseHistory) {
          await client.query(
            `INSERT INTO expenses (property_id, date, amount, category, description, expense_data)
             VALUES ($1, $2, $3, $4, $5, '{}'::jsonb)`,
            [
              propertyId,
              expense.date,
              expense.amount,
              expense.category,
              expense.description
            ]
          );
        }
        console.log(`   ✅ Inserted ${property.expenseHistory.length} expenses`);
      }

      console.log('');
    }

    console.log('✅ All demo properties updated successfully!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error instanceof Error && error.stack) {
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
updateDemoProperties()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
