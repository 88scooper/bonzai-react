/**
 * Export script for demo@bonzai.io properties
 * 
 * This script exports all properties, mortgages, and expenses
 * for the demo@bonzai.io user account to a JSON document.
 * 
 * Usage: node scripts/export-demo-properties.js
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if it exists
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

// Get database connection string from environment
const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Error: POSTGRES_URL environment variable is not set');
  console.error('Please set POSTGRES_URL before running this script');
  process.exit(1);
}

const sql = neon(connectionString);

/**
 * Format currency values
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? parseFloat(value) : value;
}

/**
 * Format date values
 */
function formatDate(date) {
  if (!date) return null;
  if (date instanceof Date) return date.toISOString().split('T')[0];
  return date;
}

/**
 * Main export function
 */
async function exportDemoProperties() {
  try {
    console.log('Starting export of demo@bonzai.io properties...\n');

    // Step 1: Find demo@bonzai.io user
    console.log('Step 1: Finding demo@bonzai.io user...');
    const userResult = await sql`
      SELECT id, email, name, created_at, updated_at
      FROM users
      WHERE LOWER(email) = 'demo@bonzai.io'
      LIMIT 1
    `;

    if (!userResult || userResult.length === 0) {
      throw new Error('Demo user (demo@bonzai.io) not found in database');
    }

    const user = userResult[0];
    console.log(`✓ Found user: ${user.email} (ID: ${user.id})\n`);

    // Step 2: Find demo account(s) for this user
    console.log('Step 2: Finding demo account(s)...');
    const accountResult = await sql`
      SELECT id, name, email, is_demo, user_id, created_at, updated_at
      FROM accounts
      WHERE user_id = ${user.id} AND is_demo = true
      ORDER BY created_at ASC
    `;

    if (!accountResult || accountResult.length === 0) {
      throw new Error('No demo account found for demo@bonzai.io user');
    }

    console.log(`✓ Found ${accountResult.length} demo account(s)\n`);

    // Step 3: Get all properties for all demo accounts
    console.log('Step 3: Fetching properties...');
    const accountIds = accountResult.map(acc => acc.id);
    
    // Query properties for all demo accounts
    const propertiesPromises = accountIds.map(accountId =>
      sql`
        SELECT id, account_id, nickname, address, purchase_price, purchase_date,
               closing_costs, renovation_costs, initial_renovations, current_market_value,
               year_built, property_type, size, unit_config, property_data,
               created_at, updated_at
        FROM properties
        WHERE account_id = ${accountId}
        ORDER BY created_at ASC
      `
    );

    const propertiesResults = await Promise.all(propertiesPromises);
    const allProperties = propertiesResults.flat();

    console.log(`✓ Found ${allProperties.length} property/properties\n`);

    if (allProperties.length === 0) {
      console.log('No properties found. Export document will show empty properties list.');
    }

    // Step 4: Get mortgages for all properties
    console.log('Step 4: Fetching mortgages...');
    const propertyIds = allProperties.map(p => p.id);
    let allMortgages = [];

    if (propertyIds.length > 0) {
      const mortgagesPromises = propertyIds.map(propertyId =>
        sql`
          SELECT id, property_id, lender, original_amount, interest_rate, rate_type,
                 term_months, amortization_years, payment_frequency, start_date,
                 mortgage_data, created_at, updated_at
          FROM mortgages
          WHERE property_id = ${propertyId}
          ORDER BY created_at ASC
        `
      );
      const mortgagesResults = await Promise.all(mortgagesPromises);
      allMortgages = mortgagesResults.flat();
    }

    console.log(`✓ Found ${allMortgages.length} mortgage(s)\n`);

    // Step 5: Get expenses for all properties
    console.log('Step 5: Fetching expenses...');
    let allExpenses = [];

    if (propertyIds.length > 0) {
      const expensesPromises = propertyIds.map(propertyId =>
        sql`
          SELECT id, property_id, date, amount, category, description, expense_data,
                 created_at, updated_at
          FROM expenses
          WHERE property_id = ${propertyId}
          ORDER BY date DESC, created_at DESC
        `
      );
      const expensesResults = await Promise.all(expensesPromises);
      allExpenses = expensesResults.flat();
    }

    console.log(`✓ Found ${allExpenses.length} expense(s)\n`);

    // Step 6: Organize data structure
    console.log('Step 6: Organizing data...');
    
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        exportedBy: 'export-demo-properties.js script',
        userEmail: user.email,
        userId: user.id,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: formatDate(user.created_at),
        updatedAt: formatDate(user.updated_at),
      },
      accounts: accountResult.map(acc => ({
        id: acc.id,
        name: acc.name,
        email: acc.email,
        isDemo: acc.is_demo,
        userId: acc.user_id,
        createdAt: formatDate(acc.created_at),
        updatedAt: formatDate(acc.updated_at),
      })),
      properties: allProperties.map(prop => {
        const propertyId = prop.id;
        const mortgages = allMortgages
          .filter(m => m.property_id === propertyId)
          .map(m => ({
            id: m.id,
            propertyId: m.property_id,
            lender: m.lender,
            originalAmount: formatCurrency(m.original_amount),
            interestRate: formatCurrency(m.interest_rate),
            rateType: m.rate_type,
            termMonths: m.term_months,
            amortizationYears: m.amortization_years,
            paymentFrequency: m.payment_frequency,
            startDate: formatDate(m.start_date),
            mortgageData: m.mortgage_data,
            createdAt: formatDate(m.created_at),
            updatedAt: formatDate(m.updated_at),
          }));

        const expenses = allExpenses
          .filter(e => e.property_id === propertyId)
          .map(e => ({
            id: e.id,
            propertyId: e.property_id,
            date: formatDate(e.date),
            amount: formatCurrency(e.amount),
            category: e.category,
            description: e.description,
            expenseData: e.expense_data,
            createdAt: formatDate(e.created_at),
            updatedAt: formatDate(e.updated_at),
          }));

        return {
          id: prop.id,
          accountId: prop.account_id,
          nickname: prop.nickname,
          address: prop.address,
          purchasePrice: formatCurrency(prop.purchase_price),
          purchaseDate: formatDate(prop.purchase_date),
          closingCosts: formatCurrency(prop.closing_costs),
          renovationCosts: formatCurrency(prop.renovation_costs),
          initialRenovations: formatCurrency(prop.initial_renovations),
          currentMarketValue: formatCurrency(prop.current_market_value),
          yearBuilt: prop.year_built,
          propertyType: prop.property_type,
          size: formatCurrency(prop.size),
          unitConfig: prop.unit_config,
          propertyData: prop.property_data,
          mortgages: mortgages,
          expenses: expenses,
          createdAt: formatDate(prop.created_at),
          updatedAt: formatDate(prop.updated_at),
        };
      }),
      summary: {
        totalAccounts: accountResult.length,
        totalProperties: allProperties.length,
        totalMortgages: allMortgages.length,
        totalExpenses: allExpenses.length,
        totalExpenseAmount: allExpenses.reduce((sum, e) => sum + (formatCurrency(e.amount) || 0), 0),
      },
    };

    // Step 7: Write to file
    console.log('Step 7: Writing export document...');
    
    const outputDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `demo-properties-export-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf8');

    console.log(`✓ Export complete!\n`);
    console.log(`Export saved to: ${filepath}\n`);
    console.log('Summary:');
    console.log(`  - Accounts: ${exportData.summary.totalAccounts}`);
    console.log(`  - Properties: ${exportData.summary.totalProperties}`);
    console.log(`  - Mortgages: ${exportData.summary.totalMortgages}`);
    console.log(`  - Expenses: ${exportData.summary.totalExpenses}`);
    console.log(`  - Total Expense Amount: $${exportData.summary.totalExpenseAmount.toFixed(2)}`);

    return exportData;
  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the export
if (require.main === module) {
  exportDemoProperties()
    .then(() => {
      console.log('\n✅ Export script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export script failed:', error);
      process.exit(1);
    });
}

module.exports = { exportDemoProperties };
