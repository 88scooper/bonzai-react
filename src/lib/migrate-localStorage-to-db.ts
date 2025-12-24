/**
 * Migration script to move data from localStorage to Neon database
 * 
 * This script:
 * 1. Reads accounts and properties from localStorage
 * 2. Creates accounts in the database via API
 * 3. Creates properties with mortgages and expenses in the database
 * 4. Provides progress feedback
 */

import { apiClient } from './api-client';

interface LocalStorageAccount {
  id: string;
  name: string;
  email?: string;
  createdAt?: string;
  isDemo?: boolean;
}

interface LocalStorageProperty {
  id: string;
  accountId?: string;
  name?: string;
  nickname?: string;
  address?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  closingCosts?: number;
  renovationCosts?: number;
  initialRenovations?: number;
  currentMarketValue?: number;
  currentValue?: number;
  yearBuilt?: number;
  propertyType?: string;
  type?: string;
  size?: number;
  squareFootage?: number;
  unitConfig?: string;
  units?: number;
  mortgage?: any;
  expenseHistory?: any[];
  rent?: any;
  tenants?: any[];
  [key: string]: any; // Allow additional properties
}

interface MigrationResult {
  success: boolean;
  accountsCreated: number;
  propertiesCreated: number;
  mortgagesCreated: number;
  expensesCreated: number;
  errors: string[];
}

/**
 * Get all accounts from localStorage
 */
function getLocalStorageAccounts(): LocalStorageAccount[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const accountsJson = localStorage.getItem('proplytics_accounts');
    if (!accountsJson) return [];
    return JSON.parse(accountsJson);
  } catch (error) {
    console.error('Error reading accounts from localStorage:', error);
    return [];
  }
}

/**
 * Get properties for an account from localStorage
 */
function getLocalStorageProperties(accountId: string): LocalStorageProperty[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const propertiesJson = localStorage.getItem(`proplytics_account_data_${accountId}`);
    if (!propertiesJson) return [];
    const data = JSON.parse(propertiesJson);
    return data.properties || [];
  } catch (error) {
    console.error(`Error reading properties for account ${accountId}:`, error);
    return [];
  }
}

/**
 * Map localStorage property to API property format
 */
function mapPropertyToApi(property: LocalStorageProperty, accountId: string): any {
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
      // Store any additional fields in propertyData
      ...Object.fromEntries(
        Object.entries(property).filter(([key]) => 
          !['id', 'accountId', 'nickname', 'name', 'address', 'purchasePrice', 
            'purchaseDate', 'closingCosts', 'renovationCosts', 'initialRenovations',
            'currentMarketValue', 'currentValue', 'yearBuilt', 'propertyType', 'type',
            'size', 'squareFootage', 'unitConfig', 'units', 'mortgage', 
            'expenseHistory', 'rent', 'tenants'].includes(key)
        )
      )
    }
  };
}

/**
 * Map localStorage mortgage to API mortgage format
 */
function mapMortgageToApi(mortgage: any): any {
  if (!mortgage) return null;
  
  return {
    lender: mortgage.lenderName || mortgage.lender || '',
    originalAmount: mortgage.originalAmount || mortgage.principal || 0,
    interestRate: mortgage.interestRate || mortgage.rate || 0,
    rateType: mortgage.rateType || 'Fixed',
    termMonths: mortgage.termMonths || (mortgage.termYears ? mortgage.termYears * 12 : 60),
    amortizationYears: mortgage.amortizationYears || mortgage.amortizationPeriodYears || 25,
    paymentFrequency: mortgage.paymentFrequency || 'Monthly',
    startDate: mortgage.startDate || null,
    mortgageData: {
      // Store any additional mortgage fields
      ...Object.fromEntries(
        Object.entries(mortgage).filter(([key]) => 
          !['lenderName', 'lender', 'originalAmount', 'principal', 'interestRate', 
            'rate', 'rateType', 'termMonths', 'termYears', 'amortizationYears',
            'amortizationPeriodYears', 'paymentFrequency', 'startDate'].includes(key)
        )
      )
    }
  };
}

/**
 * Map localStorage expense to API expense format
 */
function mapExpenseToApi(expense: any): any {
  return {
    date: expense.date || new Date().toISOString().split('T')[0],
    amount: expense.amount || 0,
    category: expense.category || 'Other',
    description: expense.description || expense.note || '',
    expenseData: {
      // Store any additional expense fields
      ...Object.fromEntries(
        Object.entries(expense).filter(([key]) => 
          !['date', 'amount', 'category', 'description', 'note'].includes(key)
        )
      )
    }
  };
}

/**
 * Main migration function
 */
export async function migrateLocalStorageToDatabase(
  onProgress?: (message: string, progress?: number) => void
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    accountsCreated: 0,
    propertiesCreated: 0,
    mortgagesCreated: 0,
    expensesCreated: 0,
    errors: []
  };

  try {
    // Step 1: Get accounts from localStorage
    onProgress?.('Reading accounts from localStorage...', 0);
    const localStorageAccounts = getLocalStorageAccounts();
    
    if (localStorageAccounts.length === 0) {
      onProgress?.('No accounts found in localStorage.', 100);
      return result;
    }

    onProgress?.(`Found ${localStorageAccounts.length} account(s) to migrate.`, 10);

    // Step 2: Create accounts in database
    for (let i = 0; i < localStorageAccounts.length; i++) {
      const account = localStorageAccounts[i];
      const progress = 10 + (i / localStorageAccounts.length) * 20;
      
      try {
        onProgress?.(`Creating account: ${account.name}...`, progress);
        
        const response = await apiClient.createAccount(
          account.name,
          account.email,
          account.isDemo || false
        );

        if (response.success && response.data) {
          result.accountsCreated++;
          const newAccountId = response.data.id;

          // Step 3: Get properties for this account
          onProgress?.(`Reading properties for ${account.name}...`, progress + 5);
          const properties = getLocalStorageProperties(account.id);

          if (properties.length > 0) {
            onProgress?.(`Found ${properties.length} property/properties.`, progress + 10);

            // Step 4: Create properties
            for (let j = 0; j < properties.length; j++) {
              const property = properties[j];
              const propertyProgress = progress + 10 + (j / properties.length) * 60;

              try {
                onProgress?.(`Creating property: ${property.nickname || property.name || 'Unnamed'}...`, propertyProgress);
                
                const propertyData = mapPropertyToApi(property, newAccountId);
                const propertyResponse = await apiClient.createProperty(propertyData);

                if (propertyResponse.success && propertyResponse.data) {
                  result.propertiesCreated++;
                  const newPropertyId = propertyResponse.data.id;

                  // Step 5: Create mortgage if exists
                  if (property.mortgage) {
                    try {
                      onProgress?.(`Creating mortgage for property...`, propertyProgress + 5);
                      const mortgageData = mapMortgageToApi(property.mortgage);
                      if (mortgageData) {
                        const mortgageResponse = await apiClient.saveMortgage(newPropertyId, mortgageData);
                        if (mortgageResponse.success) {
                          result.mortgagesCreated++;
                        }
                      }
                    } catch (error: any) {
                      const errorMsg = `Error creating mortgage: ${error.message}`;
                      result.errors.push(errorMsg);
                      console.error(errorMsg, error);
                    }
                  }

                  // Step 6: Create expenses if exist
                  if (property.expenseHistory && Array.isArray(property.expenseHistory) && property.expenseHistory.length > 0) {
                    onProgress?.(`Creating ${property.expenseHistory.length} expense(s)...`, propertyProgress + 10);
                    
                    for (const expense of property.expenseHistory) {
                      try {
                        const expenseData = mapExpenseToApi(expense);
                        const expenseResponse = await apiClient.createExpense(newPropertyId, expenseData);
                        if (expenseResponse.success) {
                          result.expensesCreated++;
                        }
                      } catch (error: any) {
                        const errorMsg = `Error creating expense: ${error.message}`;
                        result.errors.push(errorMsg);
                        console.error(errorMsg, error);
                      }
                    }
                  }
                } else {
                  throw new Error(propertyResponse.error || 'Failed to create property');
                }
              } catch (error: any) {
                const errorMsg = `Error creating property ${property.nickname || property.name}: ${error.message}`;
                result.errors.push(errorMsg);
                console.error(errorMsg, error);
              }
            }
          }
        } else {
          throw new Error(response.error || 'Failed to create account');
        }
      } catch (error: any) {
        const errorMsg = `Error creating account ${account.name}: ${error.message}`;
        result.errors.push(errorMsg);
        result.success = false;
        console.error(errorMsg, error);
      }
    }

    onProgress?.('Migration complete!', 100);
    
    if (result.errors.length > 0) {
      onProgress?.(`Migration completed with ${result.errors.length} error(s). Check console for details.`, 100);
    }

    return result;
  } catch (error: any) {
    const errorMsg = `Migration failed: ${error.message}`;
    result.errors.push(errorMsg);
    result.success = false;
    onProgress?.(errorMsg, 100);
    console.error(errorMsg, error);
    return result;
  }
}

/**
 * Check if there's data in localStorage to migrate
 */
export function hasLocalStorageData(): boolean {
  if (typeof window === 'undefined') return false;
  
  const accounts = getLocalStorageAccounts();
  if (accounts.length === 0) return false;
  
  // Check if any account has properties
  return accounts.some(account => {
    const properties = getLocalStorageProperties(account.id);
    return properties.length > 0;
  });
}

