/**
 * Script to fix property assignment for cooper.stuartc@gmail.com
 * - Deletes incorrectly created "SC Properties" account
 * - Deletes incorrectly imported Queen West Condo property
 * - Imports correct properties to user's account
 * 
 * Run with: npx tsx scripts/fix-property-assignment.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { scProperties } from '../src/data/scProperties';

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

  async deleteAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
    return this.request(`/accounts/${accountId}`, {
      method: 'DELETE',
    });
  }

  async getProperties(accountId?: string): Promise<{ success: boolean; data?: { data: any[] }; error?: string }> {
    const url = accountId 
      ? `/properties?accountId=${accountId}&page=1&limit=100`
      : '/properties?page=1&limit=100';
    return this.request(url);
  }

  async deleteProperty(propertyId: string): Promise<{ success: boolean; error?: string }> {
    return this.request(`/properties/${propertyId}`, {
      method: 'DELETE',
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
  console.log('🚀 Starting property assignment fix...\n');

  // Login
  const email = 'cooper.stuartc@gmail.com';
  const password = process.env.USER_PASSWORD || 'testpass';
  
  console.log(`📝 Logging in as ${email}...`);
  const loginResponse = await apiClient.login(email, password);
  if (!loginResponse.success || !loginResponse.data?.token) {
    throw new Error(`Login failed: ${loginResponse.error || 'Unknown error'}`);
  }
  console.log('✅ Logged in successfully\n');

  // Get all accounts
  console.log('📋 Checking accounts...');
  const accountsResponse = await apiClient.getAccounts();
  if (!accountsResponse.success) {
    throw new Error('Failed to get accounts');
  }
  
  const accounts = accountsResponse.data?.data || [];
  console.log(`Found ${accounts.length} account(s)`);
  
  // Find and delete "SC Properties" account
  const scAccount = accounts.find((a: any) => a.name === 'SC Properties');
  if (scAccount) {
    console.log(`\n🗑️  Deleting incorrectly created "SC Properties" account (${scAccount.id})...`);
    
    // First, get all properties in this account to delete them
    const propertiesResponse = await apiClient.getProperties(scAccount.id);
    if (propertiesResponse.success && propertiesResponse.data?.data) {
      const properties = propertiesResponse.data.data;
      console.log(`   Found ${properties.length} property(ies) in this account`);
      
      for (const prop of properties) {
        console.log(`   Deleting property: ${prop.nickname || prop.address}...`);
        await apiClient.deleteProperty(prop.id);
      }
    }
    
    // Delete the account (this should cascade delete properties, but we deleted them explicitly above)
    const deleteResponse = await apiClient.deleteAccount(scAccount.id);
    if (deleteResponse.success) {
      console.log('✅ SC Properties account deleted\n');
    } else {
      console.warn(`⚠️  Failed to delete account: ${deleteResponse.error}\n`);
    }
  } else {
    console.log('✅ No "SC Properties" account found\n');
  }

  // Find user's main account (not demo, not SC Properties)
  let userAccount = accounts.find((a: any) => 
    !a.isDemo && 
    a.name !== 'SC Properties' &&
    (a.email === email || !a.email)
  );

  // If no account exists, create one
  if (!userAccount) {
    console.log('➕ Creating account for user...');
    const createResponse = await apiClient.createAccount('My Properties', email, false);
    if (!createResponse.success || !createResponse.data) {
      throw new Error('Failed to create account');
    }
    userAccount = createResponse.data;
    console.log(`✅ Account created: ${userAccount.name} (${userAccount.id})\n`);
  } else {
    console.log(`✅ Using existing account: ${userAccount.name} (${userAccount.id})\n`);
  }

  const accountId = userAccount.id;

  // Import the three correct properties
  console.log('📦 Importing correct properties...');
  const propertyIds = ['richmond-st-e-403', 'tretti-way-317', 'wilson-ave-415'];
  const propertiesToImport = scProperties.filter(p => propertyIds.includes(p.id));
  
  console.log(`Found ${propertiesToImport.length} properties to import:\n`);

  for (const property of propertiesToImport) {
    try {
      console.log(`   📍 ${property.nickname || property.address}...`);
      
      const propertyData = mapPropertyToApi(property, accountId);
      const propertyResponse = await apiClient.createProperty(propertyData);

      if (!propertyResponse.success || !propertyResponse.data) {
        throw new Error(`Failed to create property: ${propertyResponse.error || 'Unknown error'}`);
      }

      const newPropertyId = propertyResponse.data.id;
      console.log(`      ✅ Property created: ${newPropertyId}`);

      // Create mortgage
      if (property.mortgage && property.mortgage.lender) {
        try {
          const mortgageData = mapMortgageToApi(property.mortgage);
          if (mortgageData) {
            const mortgageResponse = await apiClient.saveMortgage(newPropertyId, mortgageData);
            if (mortgageResponse.success) {
              console.log(`      ✅ Mortgage created`);
            } else {
              console.warn(`      ⚠️  Mortgage creation failed: ${mortgageResponse.error}`);
            }
          }
        } catch (error: any) {
          console.warn(`      ⚠️  Error creating mortgage: ${error.message}`);
        }
      }

      // Create expenses
      if (property.expenseHistory && Array.isArray(property.expenseHistory) && property.expenseHistory.length > 0) {
        let successCount = 0;
        for (const expense of property.expenseHistory) {
          try {
            const expenseData = mapExpenseToApi(expense);
            const expenseResponse = await apiClient.createExpense(newPropertyId, expenseData);
            if (expenseResponse.success) {
              successCount++;
            }
          } catch (error: any) {
            // Silently continue
          }
        }
        console.log(`      ✅ ${successCount} expense(s) created`);
      }
      
      console.log('');
    } catch (error: any) {
      console.error(`   ❌ Error importing ${property.nickname}: ${error.message}\n`);
    }
  }

  console.log('🎉 Property assignment fix complete!');
  console.log(`\nAccount: ${userAccount.name} (${userAccount.id})`);
  console.log(`Properties imported: ${propertiesToImport.length}`);
}

main().catch((error) => {
  console.error('\n❌ Fix failed:', error.message);
  process.exit(1);
});
