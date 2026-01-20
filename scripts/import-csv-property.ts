/**
 * Script to import property from CSV file to database
 * Run with: npx tsx scripts/import-csv-property.ts
 * 
 * Make sure the dev server is running: npm run dev
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseCSVToProperty } from '../src/lib/csvToProperties';

// Set API base URL for Node.js environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Simple API client for Node.js script
class ScriptApiClient {
  private token: string | null = null;

  async login(email: string, password: string): Promise<{ success: boolean; data?: { token: string }; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (data.success && data.data?.token) {
      this.token = data.data.token;
    }
    return data;
  }

  async getAccounts(): Promise<{ success: boolean; data?: { data: any[] }; error?: string }> {
    return this.request('/accounts?page=1&limit=100');
  }

  async createAccount(name: string, email?: string, isDemo = false): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({ name, email, isDemo }),
    });
  }

  async createProperty(data: any): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.request('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveMortgage(propertyId: string, data: any): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.request(`/properties/${propertyId}/mortgage`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createExpense(propertyId: string, data: any): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.request(`/properties/${propertyId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    return await response.json();
  }
}

const apiClient = new ScriptApiClient();

// Login and get token
async function login(): Promise<string> {
  const email = 'cooper.stuartc@gmail.com';
  const password = process.env.USER_PASSWORD || 'testpass';
  
  console.log(`📝 Logging in as ${email}...`);
  const response = await apiClient.login(email, password);
  if (!response.success || !response.data?.token) {
    throw new Error(`Login failed: ${response.error || 'Unknown error'}`);
  }
  console.log('✅ Logged in successfully\n');
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
      monthlyExpenses: property.monthlyExpenses || {},
      originalId: property.id,
    }
  };
}

// Map mortgage to API format
function mapMortgageToApi(mortgage: any): any {
  if (!mortgage || !mortgage.lender) return null;
  
  // Map rate type to uppercase enum
  const rateTypeMap: Record<string, string> = {
    'Fixed': 'FIXED',
    'Variable': 'VARIABLE',
    'fixed': 'FIXED',
    'variable': 'VARIABLE',
  };
  const rateType = rateTypeMap[mortgage.rateType] || 'FIXED';
  
  // Map payment frequency to uppercase enum
  const frequencyMap: Record<string, string> = {
    'Monthly': 'MONTHLY',
    'Semi-Monthly': 'SEMI_MONTHLY',
    'Bi-Weekly': 'BI_WEEKLY',
    'Accelerated Bi-Weekly': 'ACCELERATED_BI_WEEKLY',
    'Weekly': 'WEEKLY',
    'Accelerated Weekly': 'ACCELERATED_WEEKLY',
    'monthly': 'MONTHLY',
    'semi-monthly': 'SEMI_MONTHLY',
    'bi-weekly': 'BI_WEEKLY',
    'weekly': 'WEEKLY',
  };
  const paymentFrequency = frequencyMap[mortgage.paymentFrequency] || 'MONTHLY';
  
  return {
    lender: mortgage.lender || '',
    originalAmount: mortgage.originalAmount || mortgage.principal || 0,
    interestRate: mortgage.interestRate || mortgage.rate || 0,
    rateType: rateType,
    termMonths: mortgage.termMonths || (mortgage.termYears ? mortgage.termYears * 12 : 60),
    amortizationYears: mortgage.amortizationYears || mortgage.amortizationPeriodYears || 25,
    paymentFrequency: paymentFrequency,
    startDate: mortgage.startDate || null,
    mortgageData: {
      mortgageType: mortgage.mortgageType || 'Closed',
      fixedPayments: mortgage.fixedPayments !== undefined ? mortgage.fixedPayments : true,
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
  console.log('🚀 Starting CSV property import...\n');

  // Login
  await login();

  // Get or create account
  console.log('📋 Checking accounts...');
  const accountsResponse = await apiClient.getAccounts();
  if (!accountsResponse.success) {
    throw new Error('Failed to get accounts');
  }
  
  const accounts = accountsResponse.data?.data || [];
  let account = accounts.find((a: any) => a.name === 'SC Properties' || a.name?.includes('Properties'));
  
  // Create account if needed
  if (!account) {
    console.log('➕ Creating SC Properties account...');
    const createResponse = await apiClient.createAccount('SC Properties', 'cooper.stuartc@gmail.com', false);
    if (!createResponse.success || !createResponse.data) {
      throw new Error('Failed to create account');
    }
    account = createResponse.data;
    console.log(`✅ Account created: ${account.id}\n`);
  } else {
    console.log(`✅ Account found: ${account.name} (${account.id})\n`);
  }

  const accountId = account.id;

  // Read CSV file
  const csvPath = path.join(process.cwd(), 'Mock Data', 'queen-west-condo-toronto.csv');
  console.log(`📄 Reading CSV file: ${csvPath}...`);
  
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  console.log('✅ CSV file read successfully\n');

  // Parse CSV to property
  console.log('🔍 Parsing CSV data...');
  const propertyId = `queen-west-condo-${Date.now()}`;
  const property = parseCSVToProperty(csvContent, propertyId);
  
  if (!property) {
    throw new Error('Failed to parse CSV file');
  }
  
  console.log(`✅ Property parsed: ${property.nickname || property.name}`);
  console.log(`   Address: ${property.address}`);
  console.log(`   Purchase Price: $${property.purchasePrice?.toLocaleString() || 0}\n`);

  // Create property
  console.log('📦 Creating property in database...');
  const propertyData = mapPropertyToApi(property, accountId);
  const propertyResponse = await apiClient.createProperty(propertyData);

  if (!propertyResponse.success || !propertyResponse.data) {
    throw new Error(`Failed to create property: ${propertyResponse.error || 'Unknown error'}`);
  }

  const newPropertyId = propertyResponse.data.id;
  console.log(`✅ Property created: ${newPropertyId}\n`);

  // Create mortgage
  if (property.mortgage && property.mortgage.lender) {
    console.log('🏦 Creating mortgage...');
    try {
      const mortgageData = mapMortgageToApi(property.mortgage);
      if (mortgageData) {
        const mortgageResponse = await apiClient.saveMortgage(newPropertyId, mortgageData);
        if (mortgageResponse.success) {
          console.log('✅ Mortgage created\n');
        } else {
          console.warn(`⚠️  Mortgage creation failed: ${mortgageResponse.error}\n`);
        }
      }
    } catch (error: any) {
      console.warn(`⚠️  Error creating mortgage: ${error.message}\n`);
    }
  }

  // Create expenses
  if (property.expenseHistory && Array.isArray(property.expenseHistory) && property.expenseHistory.length > 0) {
    console.log(`💰 Creating ${property.expenseHistory.length} expense records...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const expense of property.expenseHistory) {
      try {
        const expenseData = mapExpenseToApi(expense);
        const expenseResponse = await apiClient.createExpense(newPropertyId, expenseData);
        if (expenseResponse.success) {
          successCount++;
        } else {
          errorCount++;
          console.warn(`   ⚠️  Failed to create expense: ${expense.description || expense.category}`);
        }
      } catch (error: any) {
        errorCount++;
        console.warn(`   ⚠️  Error creating expense: ${error.message}`);
      }
    }
    
    console.log(`✅ Expenses created: ${successCount} successful, ${errorCount} failed\n`);
  }

  console.log('🎉 Import complete!');
  console.log(`\nProperty ID: ${newPropertyId}`);
  console.log(`Account ID: ${accountId}`);
  console.log(`\nYou can now view the property in the app at: /my-properties`);
}

main().catch((error) => {
  console.error('\n❌ Import failed:', error.message);
  process.exit(1);
});
