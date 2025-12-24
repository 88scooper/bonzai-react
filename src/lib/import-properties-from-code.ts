/**
 * Script to import properties from code files into the database
 * and assign them to the correct accounts
 * 
 * Demo Account: First St, Second Dr, Third Avenue
 * SC Properties Account: Richmond St E, Tretti Way, Wilson Ave
 */

import { apiClient } from './api-client';
import { properties } from '@/data/properties';
import { scProperties } from '@/data/scProperties';

interface PropertyData {
  id: string;
  nickname?: string;
  name?: string;
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
  [key: string]: any;
}

/**
 * Map property data to API format
 */
function mapPropertyToApi(property: PropertyData, accountId: string): any {
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
      // Store original ID for reference
      originalId: property.id,
    }
  };
}

/**
 * Map mortgage to API format
 */
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
      // Store additional mortgage fields
      mortgageNumber: mortgage.mortgageNumber || null,
      currentBalance: mortgage.currentBalance || null,
      paymentAmount: mortgage.paymentAmount || null,
      renewalDate: mortgage.renewalDate || null,
      remainingAmortization: mortgage.remainingAmortization || null,
    }
  };
}

/**
 * Map expense to API format
 */
function mapExpenseToApi(expense: any): any {
  return {
    date: expense.date || new Date().toISOString().split('T')[0],
    amount: expense.amount || 0,
    category: expense.category || 'Other',
    description: expense.description || expense.note || '',
    expenseData: {}
  };
}

/**
 * Import properties for Demo account
 */
async function importDemoProperties(accountId: string, onProgress?: (msg: string) => void) {
  const demoPropertyIds = ['first-st-1', 'second-dr-1', 'third-ave-1'];
  const demoProperties = properties.filter(p => demoPropertyIds.includes(p.id));
  
  onProgress?.(`Found ${demoProperties.length} properties for Demo account`);
  
  const results = {
    propertiesCreated: 0,
    mortgagesCreated: 0,
    expensesCreated: 0,
    errors: [] as string[]
  };

  for (const property of demoProperties) {
    try {
      onProgress?.(`Creating property: ${property.nickname || property.name}...`);
      
      const propertyData = mapPropertyToApi(property, accountId);
      const propertyResponse = await apiClient.createProperty(propertyData);

      if (propertyResponse.success && propertyResponse.data) {
        results.propertiesCreated++;
        const newPropertyId = propertyResponse.data.id;

        // Create mortgage if exists
        if (property.mortgage) {
          try {
            const mortgageData = mapMortgageToApi(property.mortgage);
            if (mortgageData) {
              const mortgageResponse = await apiClient.saveMortgage(newPropertyId, mortgageData);
              if (mortgageResponse.success) {
                results.mortgagesCreated++;
              }
            }
          } catch (error: any) {
            results.errors.push(`Error creating mortgage for ${property.nickname}: ${error.message}`);
          }
        }

        // Create expenses
        if (property.expenseHistory && Array.isArray(property.expenseHistory)) {
          for (const expense of property.expenseHistory) {
            try {
              const expenseData = mapExpenseToApi(expense);
              const expenseResponse = await apiClient.createExpense(newPropertyId, expenseData);
              if (expenseResponse.success) {
                results.expensesCreated++;
              }
            } catch (error: any) {
              results.errors.push(`Error creating expense for ${property.nickname}: ${error.message}`);
            }
          }
        }
      } else {
        results.errors.push(`Failed to create property ${property.nickname}: ${propertyResponse.error}`);
      }
    } catch (error: any) {
      results.errors.push(`Error creating property ${property.nickname}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Import properties for SC Properties account
 */
async function importSCProperties(accountId: string, onProgress?: (msg: string) => void) {
  // SC Properties: Richmond St E (403-311), Tretti Way (317-30), Wilson Ave (415-500)
  const scPropertyIds = ['richmond-st-e-403', 'tretti-way-317', 'wilson-ave-415'];
  const scProps = scProperties.filter(p => scPropertyIds.includes(p.id));
  
  onProgress?.(`Found ${scProps.length} properties for SC Properties account`);
  
  const results = {
    propertiesCreated: 0,
    mortgagesCreated: 0,
    expensesCreated: 0,
    errors: [] as string[]
  };

  for (const property of scProps) {
    try {
      onProgress?.(`Creating property: ${property.nickname || property.name}...`);
      
      const propertyData = mapPropertyToApi(property, accountId);
      const propertyResponse = await apiClient.createProperty(propertyData);

      if (propertyResponse.success && propertyResponse.data) {
        results.propertiesCreated++;
        const newPropertyId = propertyResponse.data.id;

        // Create mortgage if exists
        if (property.mortgage) {
          try {
            const mortgageData = mapMortgageToApi(property.mortgage);
            if (mortgageData) {
              const mortgageResponse = await apiClient.saveMortgage(newPropertyId, mortgageData);
              if (mortgageResponse.success) {
                results.mortgagesCreated++;
              }
            }
          } catch (error: any) {
            results.errors.push(`Error creating mortgage for ${property.nickname}: ${error.message}`);
          }
        }

        // Create expenses
        if (property.expenseHistory && Array.isArray(property.expenseHistory)) {
          for (const expense of property.expenseHistory) {
            try {
              const expenseData = mapExpenseToApi(expense);
              const expenseResponse = await apiClient.createExpense(newPropertyId, expenseData);
              if (expenseResponse.success) {
                results.expensesCreated++;
              }
            } catch (error: any) {
              results.errors.push(`Error creating expense for ${property.nickname}: ${error.message}`);
            }
          }
        }
      } else {
        results.errors.push(`Failed to create property ${property.nickname}: ${propertyResponse.error}`);
      }
    } catch (error: any) {
      results.errors.push(`Error creating property ${property.nickname}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Main import function
 */
export async function importPropertiesFromCode(
  demoAccountId: string,
  scPropertiesAccountId: string,
  onProgress?: (message: string) => void
): Promise<{
  success: boolean;
  demo: { propertiesCreated: number; mortgagesCreated: number; expensesCreated: number; errors: string[] };
  scProperties: { propertiesCreated: number; mortgagesCreated: number; expensesCreated: number; errors: string[] };
}> {
  try {
    onProgress?.('Starting property import from code files...');

    // Import Demo properties
    onProgress?.('Importing Demo account properties...');
    const demoResults = await importDemoProperties(demoAccountId, onProgress);

    // Import SC Properties
    onProgress?.('Importing SC Properties account properties...');
    const scResults = await importSCProperties(scPropertiesAccountId, onProgress);

    const success = demoResults.errors.length === 0 && scResults.errors.length === 0;

    onProgress?.('Import complete!');

    return {
      success,
      demo: demoResults,
      scProperties: scResults,
    };
  } catch (error: any) {
    onProgress?.(`Import failed: ${error.message}`);
    throw error;
  }
}

