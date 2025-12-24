/**
 * Script to import properties from code files to database
 * Run with: npx tsx scripts/import-properties.ts
 */

import { apiClient } from '../src/lib/api-client';
import { properties } from '../src/data/properties';
import { scProperties } from '../src/data/scProperties';

// Login and get token
async function login(): Promise<string> {
  const response = await apiClient.login('cooper.stuartc@gmail.com', 'testpass');
  if (!response.success || !response.data?.token) {
    throw new Error('Login failed');
  }
  return response.data.token;
}

// Map property to API format
function mapPropertyToApi(property: any, accountId: string): any {
  return {
    accountId,
    nickname: property.nickname || property.name || 'Unnamed Property',
    address: property.address || '',
    purchasePrice: property.purchasePrice || 0,
    purchaseDate: property.purchaseDate || null,
    closingCosts: property.closingCosts || 0,
    renovationCosts: property.renovationCosts || 0,
    initialRenovations: property.initialRenovations || 0,
    currentMarketValue: property.currentMarketValue || property.currentValue || 0,
    yearBuilt: property.yearBuilt || null,
    propertyType: property.propertyType || property.type || null,
    size: property.size || property.squareFootage || null,
    unitConfig: property.unitConfig || null,
    propertyData: {
      units: property.units || 1,
      rent: property.rent || null,
      tenants: property.tenants || [],
      originalId: property.id,
    }
  };
}

// Map mortgage to API format
function mapMortgageToApi(mortgage: any): any {
  if (!mortgage) return null;
  
  return {
    lender: mortgage.lender || mortgage.lenderName || '',
    originalAmount: mortgage.originalAmount || mortgage.principal || 0,
    interestRate: mortgage.interestRate || mortgage.rate || 0,
    rateType: mortgage.rateType || 'Fixed',
    termMonths: mortgage.termMonths || (mortgage.termYears ? mortgage.termYears * 12 : 60),
    amortizationYears: mortgage.amortizationYears || mortgage.amortizationPeriodYears || 25,
    paymentFrequency: mortgage.paymentFrequency || 'Monthly',
    startDate: mortgage.startDate || null,
    mortgageData: {
      mortgageNumber: mortgage.mortgageNumber || null,
      currentBalance: mortgage.currentBalance || null,
      paymentAmount: mortgage.paymentAmount || null,
      renewalDate: mortgage.renewalDate || null,
      remainingAmortization: mortgage.remainingAmortization || null,
    }
  };
}

// Map expense to API format
function mapExpenseToApi(expense: any): any {
  return {
    date: expense.date || new Date().toISOString().split('T')[0],
    amount: expense.amount || 0,
    category: expense.category || 'Other',
    description: expense.description || expense.note || '',
    expenseData: {}
  };
}

async function main() {
  console.log('🚀 Starting property import...\n');

  // Login
  console.log('📝 Logging in...');
  await login();
  console.log('✅ Logged in\n');

  // Get or create Demo Account
  console.log('📋 Checking accounts...');
  const accountsResponse = await apiClient.getAccounts();
  if (!accountsResponse.success) {
    throw new Error('Failed to get accounts');
  }
  
  const accounts = accountsResponse.data?.data || [];
  let demoAccount = accounts.find((a: any) => a.name === 'Demo Account' || a.is_demo);
  let scAccount = accounts.find((a: any) => a.name === 'SC Properties');

  // Create Demo Account if needed
  if (!demoAccount) {
    console.log('➕ Creating Demo Account...');
    const createResponse = await apiClient.createAccount('Demo Account', undefined, true);
    if (!createResponse.success || !createResponse.data) {
      throw new Error('Failed to create Demo Account');
    }
    demoAccount = createResponse.data;
    console.log(`✅ Demo Account created: ${demoAccount.id}\n`);
  } else {
    console.log(`✅ Demo Account found: ${demoAccount.id}\n`);
  }

  // Verify SC Properties account exists
  if (!scAccount) {
    throw new Error('SC Properties account not found. Please create it first.');
  }
  console.log(`✅ SC Properties account found: ${scAccount.id}\n`);

  const demoAccountId = demoAccount.id;
  const scAccountId = scAccount.id;

  // Import Demo Properties
  console.log('📦 Importing Demo Account properties...');
  const demoPropertyIds = ['first-st-1', 'second-dr-1', 'third-ave-1'];
  const demoProperties = properties.filter(p => demoPropertyIds.includes(p.id));
  
  console.log(`   Found ${demoProperties.length} properties to import`);
  
  let demoResults = { properties: 0, mortgages: 0, expenses: 0, errors: [] as string[] };

  for (const property of demoProperties) {
    try {
      console.log(`   Creating: ${property.nickname || property.name}...`);
      
      const propertyData = mapPropertyToApi(property, demoAccountId);
      const propertyResponse = await apiClient.createProperty(propertyData);

      if (propertyResponse.success && propertyResponse.data) {
        demoResults.properties++;
        const newPropertyId = propertyResponse.data.id;

        // Create mortgage
        if (property.mortgage) {
          try {
            const mortgageData = mapMortgageToApi(property.mortgage);
            if (mortgageData) {
              const mortgageResponse = await apiClient.saveMortgage(newPropertyId, mortgageData);
              if (mortgageResponse.success) {
                demoResults.mortgages++;
              }
            }
          } catch (error: any) {
            demoResults.errors.push(`Mortgage for ${property.nickname}: ${error.message}`);
          }
        }

        // Create expenses
        if (property.expenseHistory && Array.isArray(property.expenseHistory)) {
          for (const expense of property.expenseHistory) {
            try {
              const expenseData = mapExpenseToApi(expense);
              const expenseResponse = await apiClient.createExpense(newPropertyId, expenseData);
              if (expenseResponse.success) {
                demoResults.expenses++;
              }
            } catch (error: any) {
              demoResults.errors.push(`Expense for ${property.nickname}: ${error.message}`);
            }
          }
        }
        console.log(`   ✅ ${property.nickname} imported`);
      } else {
        throw new Error(propertyResponse.error || 'Failed to create property');
      }
    } catch (error: any) {
      const errorMsg = `Error importing ${property.nickname}: ${error.message}`;
      demoResults.errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }
  }

  console.log(`\n✅ Demo Account import complete:`);
  console.log(`   Properties: ${demoResults.properties}`);
  console.log(`   Mortgages: ${demoResults.mortgages}`);
  console.log(`   Expenses: ${demoResults.expenses}`);
  if (demoResults.errors.length > 0) {
    console.log(`   Errors: ${demoResults.errors.length}`);
  }

  // Import SC Properties
  console.log('\n📦 Importing SC Properties account properties...');
  const scPropertyIds = ['richmond-st-e-403', 'tretti-way-317', 'wilson-ave-415'];
  const scProps = scProperties.filter(p => scPropertyIds.includes(p.id));
  
  console.log(`   Found ${scProps.length} properties to import`);
  
  let scResults = { properties: 0, mortgages: 0, expenses: 0, errors: [] as string[] };

  for (const property of scProps) {
    try {
      console.log(`   Creating: ${property.nickname || property.name}...`);
      
      const propertyData = mapPropertyToApi(property, scAccountId);
      const propertyResponse = await apiClient.createProperty(propertyData);

      if (propertyResponse.success && propertyResponse.data) {
        scResults.properties++;
        const newPropertyId = propertyResponse.data.id;

        // Create mortgage
        if (property.mortgage) {
          try {
            const mortgageData = mapMortgageToApi(property.mortgage);
            if (mortgageData) {
              const mortgageResponse = await apiClient.saveMortgage(newPropertyId, mortgageData);
              if (mortgageResponse.success) {
                scResults.mortgages++;
              }
            }
          } catch (error: any) {
            scResults.errors.push(`Mortgage for ${property.nickname}: ${error.message}`);
          }
        }

        // Create expenses
        if (property.expenseHistory && Array.isArray(property.expenseHistory)) {
          for (const expense of property.expenseHistory) {
            try {
              const expenseData = mapExpenseToApi(expense);
              const expenseResponse = await apiClient.createExpense(newPropertyId, expenseData);
              if (expenseResponse.success) {
                scResults.expenses++;
              }
            } catch (error: any) {
              scResults.errors.push(`Expense for ${property.nickname}: ${error.message}`);
            }
          }
        }
        console.log(`   ✅ ${property.nickname} imported`);
      } else {
        throw new Error(propertyResponse.error || 'Failed to create property');
      }
    } catch (error: any) {
      const errorMsg = `Error importing ${property.nickname}: ${error.message}`;
      scResults.errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }
  }

  console.log(`\n✅ SC Properties import complete:`);
  console.log(`   Properties: ${scResults.properties}`);
  console.log(`   Mortgages: ${scResults.mortgages}`);
  console.log(`   Expenses: ${scResults.expenses}`);
  if (scResults.errors.length > 0) {
    console.log(`   Errors: ${scResults.errors.length}`);
  }

  console.log('\n🎉 Import complete!');
}

main().catch(console.error);

