"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import apiClient from '@/lib/api-client';

export interface Account {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  isDemo: boolean;
}

interface AccountContextType {
  accounts: Account[];
  currentAccount: Account | null;
  currentAccountId: string | null;
  properties: any[];
  loading: boolean;
  error: string | null;
  switchAccount: (accountId: string, account?: Account) => Promise<void>;
  createNewAccount: (name?: string, email?: string) => Promise<Account>;
  deleteAccount: (accountId: string) => Promise<void>;
  updateAccountName: (accountId: string, name: string) => Promise<void>;
  saveProperties: (properties: any[]) => Promise<void>;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

// Helper to check if user is authenticated
function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('auth_token');
}

// Map API account format to context format
function mapApiAccountToContext(apiAccount: any): Account {
  return {
    id: apiAccount.id,
    name: apiAccount.name,
    email: apiAccount.email || '',
    createdAt: apiAccount.created_at || new Date().toISOString(),
    isDemo: apiAccount.is_demo || false,
  };
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load accounts from API
  const loadAccounts = useCallback(async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      setError('Not authenticated. Please log in.');
      return;
    }

    try {
      setError(null);
      const response = await apiClient.getAccounts(1, 100); // Get first 100 accounts
      
      if (response.success && response.data) {
        const accountsData = response.data.data || response.data;
        const mappedAccounts = Array.isArray(accountsData)
          ? accountsData.map(mapApiAccountToContext)
          : [];
        
        setAccounts(mappedAccounts);

        // Set current account if not set
        if (!currentAccountId && mappedAccounts.length > 0) {
          const savedId = typeof window !== 'undefined' 
            ? localStorage.getItem('current_account_id') 
            : null;
          
          const accountToUse = mappedAccounts.find(a => a.id === savedId) || mappedAccounts[0];
          setCurrentAccountId(accountToUse.id);
          setCurrentAccount(accountToUse);
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('current_account_id', accountToUse.id);
          }
        }
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [currentAccountId]);

  // Map API property format (snake_case) to frontend format (camelCase)
  function mapApiPropertyToFrontend(apiProperty: any): any {
    // Extract rent and mortgage from property_data if they exist
    const propertyData = apiProperty.property_data || {};
    const rent = propertyData.rent || {};
    const tenants = propertyData.tenants || [];
    
    // Get mortgage from separate endpoint or property_data
    // For now, we'll need to fetch it separately or it should be in property_data
    
    return {
      id: apiProperty.id,
      nickname: apiProperty.nickname || '',
      address: apiProperty.address || '',
      purchasePrice: parseFloat(apiProperty.purchase_price || 0),
      purchaseDate: apiProperty.purchase_date || null,
      closingCosts: parseFloat(apiProperty.closing_costs || 0),
      renovationCosts: parseFloat(apiProperty.renovation_costs || 0),
      initialRenovations: parseFloat(apiProperty.initial_renovations || 0),
      currentMarketValue: parseFloat(apiProperty.current_market_value || 0),
      yearBuilt: apiProperty.year_built || null,
      propertyType: apiProperty.property_type || '',
      size: parseFloat(apiProperty.size || 0),
      squareFootage: parseFloat(apiProperty.size || 0), // Map size to squareFootage
      unitConfig: apiProperty.unit_config || '',
      rent: {
        monthlyRent: rent.monthlyRent || rent.monthly_rent || 0,
        annualRent: rent.annualRent || rent.annual_rent || 0,
      },
      tenants: tenants,
      // Mortgage will be loaded separately or from property_data
      mortgage: propertyData.mortgage || null,
      // Additional fields
      name: apiProperty.nickname || '',
      type: apiProperty.property_type || '',
      units: propertyData.units || 1,
      currentValue: parseFloat(apiProperty.current_market_value || 0),
      // Initialize empty structures that will be populated
      expenses: {},
      tenant: tenants.length > 0 ? {
        name: tenants[0].name || '',
        leaseStartDate: tenants[0].leaseStart || tenants[0].lease_start || '',
        leaseEndDate: tenants[0].leaseEnd || tenants[0].lease_end || '',
        rent: tenants[0].rent || 0,
        status: tenants[0].status || '',
      } : {
        name: '',
        leaseStartDate: '',
        leaseEndDate: '',
        rent: 0,
        status: '',
      },
      monthlyExpenses: {},
      expenseHistory: [],
    };
  }

  // Load properties for current account
  const loadProperties = useCallback(async (accountId: string) => {
    if (!isAuthenticated() || !accountId) {
      setProperties([]);
      return;
    }

    try {
      const response = await apiClient.getProperties(accountId, 1, 1000); // Get up to 1000 properties
      
      if (response.success && response.data) {
        const propertiesData = response.data.data || response.data;
        const propertiesArray = Array.isArray(propertiesData) ? propertiesData : [];
        
        // Map each property and load mortgage data
        const mappedProperties = await Promise.all(
          propertiesArray.map(async (apiProperty: any) => {
            const mapped = mapApiPropertyToFrontend(apiProperty);
            
            // Load mortgage for this property
            try {
              const mortgageResponse = await apiClient.getMortgage(apiProperty.id);
              if (mortgageResponse.success && mortgageResponse.data) {
                const mortgage = mortgageResponse.data;
                const mortgageData = mortgage.mortgage_data || {};
                mapped.mortgage = {
                  lender: mortgage.lender || '',
                  originalAmount: parseFloat(mortgage.original_amount || 0),
                  interestRate: parseFloat(mortgage.interest_rate || 0),
                  rateType: mortgage.rate_type || 'Fixed',
                  termMonths: mortgage.term_months || 60,
                  amortizationYears: mortgage.amortization_years || 25,
                  paymentFrequency: mortgage.payment_frequency || 'Monthly',
                  startDate: mortgage.start_date || null,
                  // Include additional mortgage data fields
                  mortgageNumber: mortgageData.mortgageNumber || mortgageData.mortgage_number || null,
                  currentBalance: mortgageData.currentBalance || mortgageData.current_balance || null,
                  paymentAmount: mortgageData.paymentAmount || mortgageData.payment_amount || null,
                  renewalDate: mortgageData.renewalDate || mortgageData.renewal_date || null,
                  remainingAmortization: mortgageData.remainingAmortization || mortgageData.remaining_amortization || null,
                };
              }
            } catch (err) {
              console.warn(`Could not load mortgage for property ${apiProperty.id}:`, err);
            }
            
            // Load expenses for this property and convert to monthly expenses
            try {
              const expensesResponse = await apiClient.getExpenses(apiProperty.id, 1, 1000);
              if (expensesResponse.success && expensesResponse.data) {
                const expensesData = expensesResponse.data.data || expensesResponse.data || [];
                const expensesArray = Array.isArray(expensesData) ? expensesData : [];
                
                // Convert expense history to monthly expenses format
                mapped.expenseHistory = expensesArray.map((exp: any) => ({
                  id: exp.id,
                  date: exp.date,
                  amount: parseFloat(exp.amount || 0),
                  category: exp.category || 'Other',
                  description: exp.description || '',
                }));
                
                // Calculate monthly averages from expense history
                // Use the most recent year with actual expense data
                const currentYear = new Date().getFullYear();
                
                // Group expenses by year and find the most recent year with data
                const expensesByYear: Record<number, any[]> = {};
                expensesArray.forEach((exp: any) => {
                  const expDate = new Date(exp.date);
                  const year = expDate.getFullYear();
                  if (!expensesByYear[year]) {
                    expensesByYear[year] = [];
                  }
                  expensesByYear[year].push(exp);
                });
                
                // Find the most recent year with non-zero expenses
                let selectedYear = currentYear;
                const years = Object.keys(expensesByYear).map(Number).sort((a, b) => b - a);
                for (const year of years) {
                  const yearTotal = expensesByYear[year].reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
                  if (yearTotal > 0) {
                    selectedYear = year;
                    break;
                  }
                }
                
                // Use expenses from the selected year
                const selectedYearExpenses = expensesByYear[selectedYear] || [];
                
                // Group expenses by category and calculate monthly averages
                const categoryTotals: Record<string, number> = {};
                selectedYearExpenses.forEach((exp: any) => {
                  const category = exp.category || 'Other';
                  const amount = parseFloat(exp.amount || 0);
                  categoryTotals[category] = (categoryTotals[category] || 0) + amount;
                });
                
                // Map categories to monthly expense fields
                // Handle both exact matches and description-based matching for utilities
                const categoryMapping: Record<string, string> = {
                  'Property Tax': 'propertyTax',
                  'Condo Fees': 'condoFees',
                  'Insurance': 'insurance',
                  'Maintenance': 'maintenance',
                  'Professional Fees': 'professionalFees',
                  'Utilities': 'utilities',
                  'Other': 'other',
                };
                
                // Calculate monthly averages (divide annual total by 12)
                const monthlyExpenses: Record<string, number> = {
                  propertyTax: 0,
                  condoFees: 0,
                  insurance: 0,
                  maintenance: 0,
                  professionalFees: 0,
                  utilities: 0,
                  other: 0,
                  mortgagePayment: 0,
                  mortgageInterest: 0,
                  mortgagePrincipal: 0,
                  total: 0,
                };
                
                Object.entries(categoryTotals).forEach(([category, annualTotal]) => {
                  // Check if it's utilities in "Other" category by description
                  let monthlyKey = categoryMapping[category] || 'other';
                  
                  // If category is "Other" but description mentions utilities, map to utilities
                  if (category === 'Other') {
                    const expensesInCategory = selectedYearExpenses.filter((e: any) => e.category === 'Other');
                    const hasUtilities = expensesInCategory.some((e: any) => 
                      e.description?.toLowerCase().includes('utilities') || 
                      e.description?.toLowerCase().includes('utility')
                    );
                    if (hasUtilities) {
                      // Split: utilities go to utilities, rest to other
                      const utilitiesTotal = expensesInCategory
                        .filter((e: any) => e.description?.toLowerCase().includes('utilities') || e.description?.toLowerCase().includes('utility'))
                        .reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);
                      const otherTotal = annualTotal - utilitiesTotal;
                      monthlyExpenses.utilities = utilitiesTotal / 12;
                      monthlyExpenses.other = otherTotal / 12;
                      return; // Skip the default assignment below
                    }
                  }
                  
                  monthlyExpenses[monthlyKey] = annualTotal / 12;
                });
                
                // Calculate total operating expenses (excluding mortgage)
                const operatingTotal = 
                  monthlyExpenses.propertyTax +
                  monthlyExpenses.condoFees +
                  monthlyExpenses.insurance +
                  monthlyExpenses.maintenance +
                  monthlyExpenses.professionalFees +
                  monthlyExpenses.utilities +
                  monthlyExpenses.other;
                
                monthlyExpenses.total = operatingTotal;
                mapped.monthlyExpenses = monthlyExpenses;
              } else {
                mapped.expenseHistory = [];
                mapped.monthlyExpenses = {
                  propertyTax: 0,
                  condoFees: 0,
                  insurance: 0,
                  maintenance: 0,
                  professionalFees: 0,
                  utilities: 0,
                  other: 0,
                  mortgagePayment: 0,
                  mortgageInterest: 0,
                  mortgagePrincipal: 0,
                  total: 0,
                };
              }
            } catch (err) {
              console.warn(`Could not load expenses for property ${apiProperty.id}:`, err);
              mapped.expenseHistory = [];
              mapped.monthlyExpenses = {
                propertyTax: 0,
                condoFees: 0,
                insurance: 0,
                maintenance: 0,
                professionalFees: 0,
                utilities: 0,
                other: 0,
                mortgagePayment: 0,
                mortgageInterest: 0,
                mortgagePrincipal: 0,
                total: 0,
              };
            }
            
            return mapped;
          })
        );
        
        setProperties(mappedProperties);
      } else {
        setProperties([]);
      }
    } catch (err) {
      console.error('Error loading properties:', err);
      setProperties([]);
    }
  }, []);

  // Initialize accounts and load current account
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Load properties when current account changes
  useEffect(() => {
    if (currentAccountId) {
      loadProperties(currentAccountId);
    } else {
      setProperties([]);
    }
  }, [currentAccountId, loadProperties]);

  // Refresh accounts
  const refreshAccounts = useCallback(async () => {
    setLoading(true);
    await loadAccounts();
  }, [loadAccounts]);

  // Switch to a different account
  const switchAccount = useCallback(async (accountId: string, account?: Account) => {
    try {
      setError(null);
      
      // Use provided account or find it in the accounts array
      const accountToSwitch = account || accounts.find(a => a.id === accountId);
      if (!accountToSwitch) {
        throw new Error('Account not found');
      }

      setCurrentAccountId(accountId);
      setCurrentAccount(accountToSwitch);
      
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_account_id', accountId);
      }

      // Load properties for new account
      await loadProperties(accountId);
    } catch (err) {
      console.error('Error switching account:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch account');
      throw err;
    }
  }, [accounts, loadProperties]);

  // Create a new account
  const createNewAccount = useCallback(async (name?: string, email?: string): Promise<Account> => {
    try {
      setError(null);
      
      if (!isAuthenticated()) {
        throw new Error('Not authenticated. Please log in.');
      }

      const response = await apiClient.createAccount(
        name || `Account ${new Date().toLocaleDateString()}`,
        email,
        false
      );

      if (response.success && response.data) {
        const newAccount = mapApiAccountToContext(response.data);
        
        // Refresh accounts list to sync with server (includes the new account)
        await loadAccounts();
        
        // Switch to new account - pass the account object directly to avoid lookup timing issues
        await switchAccount(newAccount.id, newAccount);
        
        return newAccount;
      } else {
        throw new Error(response.error || 'Failed to create account');
      }
    } catch (err) {
      console.error('Error creating account:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
      throw err;
    }
  }, [loadAccounts, switchAccount]);

  // Delete an account
  const deleteAccount = useCallback(async (accountId: string) => {
    try {
      setError(null);
      
      // Don't allow deleting the last account
      if (accounts.length <= 1) {
        throw new Error('Cannot delete the last account');
      }
      
      // Don't allow deleting demo account
      const account = accounts.find(a => a.id === accountId);
      if (account?.isDemo) {
        throw new Error('Cannot delete the demo account');
      }

      const response = await apiClient.deleteAccount(accountId);
      
      if (response.success) {
        // Refresh accounts list
        await loadAccounts();
        
        // If we deleted the current account, switch to another one
        if (currentAccountId === accountId) {
          const remainingAccounts = accounts.filter(a => a.id !== accountId);
          if (remainingAccounts.length > 0) {
            await switchAccount(remainingAccounts[0].id);
          } else {
            setCurrentAccountId(null);
            setCurrentAccount(null);
            setProperties([]);
          }
        }
      } else {
        throw new Error(response.error || 'Failed to delete account');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
      throw err;
    }
  }, [accounts, currentAccountId, loadAccounts, switchAccount]);

  // Update account name
  const updateAccountName = useCallback(async (accountId: string, name: string) => {
    try {
      setError(null);
      
      const response = await apiClient.updateAccount(accountId, { name });

      if (response.success && response.data) {
        const updatedAccount = mapApiAccountToContext(response.data);
        
        // Update in local state
        setAccounts(prev => prev.map(a => a.id === accountId ? updatedAccount : a));
        
        // Update current account if it's the one being updated
        if (currentAccountId === accountId) {
          setCurrentAccount(updatedAccount);
        }
      } else {
        throw new Error(response.error || 'Failed to update account');
      }
    } catch (err) {
      console.error('Error updating account:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update account';
      setError(errorMessage);
      throw err;
    }
  }, [currentAccountId]);

  // Save properties for current account
  const saveProperties = useCallback(async (newProperties: any[]) => {
    if (!currentAccountId) {
      throw new Error('No account selected');
    }

    try {
      setError(null);
      
      // Save each property via API
      // Note: This is a simplified version - in production you might want to batch updates
      const savePromises = newProperties.map(async (property) => {
        if (property.id) {
          // Update existing property
          return apiClient.updateProperty(property.id, {
            ...property,
            accountId: currentAccountId,
          });
        } else {
          // Create new property
          return apiClient.createProperty({
            ...property,
            accountId: currentAccountId,
          });
        }
      });

      await Promise.all(savePromises);
      
      // Reload properties to get latest from server
      await loadProperties(currentAccountId);
    } catch (err) {
      console.error('Error saving properties:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save properties';
      setError(errorMessage);
      throw err;
    }
  }, [currentAccountId, loadProperties]);

  const value: AccountContextType = {
    accounts,
    currentAccount,
    currentAccountId,
    properties,
    loading,
    error,
    switchAccount,
    createNewAccount,
    deleteAccount,
    updateAccountName,
    saveProperties,
    refreshAccounts,
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
