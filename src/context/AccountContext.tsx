"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';

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

// Helper function to normalize date to YYYY-MM-DD format
function normalizeDate(dateValue: any): string | null {
  if (!dateValue) return null;
  // If it's already in YYYY-MM-DD format, return as is
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  // If it's an ISO string with time, extract just the date part
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  // Try to parse as Date and format
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // If parsing fails, return null
  }
  return null;
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
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); // Start as false, will be set to true when needed
  const [error, setError] = useState<string | null>(null);

  // Load accounts from API
  const loadAccounts = useCallback(async () => {
    // Don't make API calls during SSR/build
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    if (!isAuthenticated()) {
      setLoading(false);
      setError(null); // Don't set error for unauthenticated users on initial load
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getAccounts(1, 100); // Get first 100 accounts
      
      // Handle authentication errors gracefully - redirect is happening
      if (!response.success && response.error === 'Authentication required') {
        setLoading(false);
        return; // Don't process further, redirect will handle it
      }
      
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
          
          let accountToUse: Account | undefined;
          
          // For cooper.stuartc@gmail.com, always prefer "SC Properties" as default
          if (user?.email === 'cooper.stuartc@gmail.com') {
            const scPropertiesAccount = mappedAccounts.find(a => 
              a.name === 'SC Properties' || a.name?.toLowerCase().includes('sc properties')
            );
            if (scPropertiesAccount) {
              accountToUse = scPropertiesAccount;
            }
          }
          
          // Fallback to saved account or first account
          if (!accountToUse) {
            accountToUse = mappedAccounts.find(a => a.id === savedId) || mappedAccounts[0];
          }
          
          setCurrentAccountId(accountToUse.id);
          setCurrentAccount(accountToUse);
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('current_account_id', accountToUse.id);
          }
        } else if (currentAccountId && user?.email === 'cooper.stuartc@gmail.com') {
          // If account is already set but user is cooper.stuartc@gmail.com,
          // check if we should switch to SC Properties
          const scPropertiesAccount = mappedAccounts.find(a => 
            (a.name === 'SC Properties' || a.name?.toLowerCase().includes('sc properties')) &&
            a.id !== currentAccountId
          );
          if (scPropertiesAccount) {
            // Switch to SC Properties if it exists and is different from current
            setCurrentAccountId(scPropertiesAccount.id);
            setCurrentAccount(scPropertiesAccount);
            if (typeof window !== 'undefined') {
              localStorage.setItem('current_account_id', scPropertiesAccount.id);
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load accounts';
      // Handle authentication errors gracefully - redirect will happen
      if (errorMessage.includes('Authentication required')) {
        // Don't set error or log - redirect to login is happening
        setLoading(false);
        return;
      }
      // Only log network errors, don't set error state (to avoid breaking UI)
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network error')) {
        console.warn('Network error loading accounts (API may be unavailable):', err);
        // Keep existing accounts if available, don't clear them
      } else {
        console.error('Error loading accounts:', err);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [currentAccountId, user?.email]);

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
      isPrincipalResidence: propertyData.isPrincipalResidence || false,
      ownership: propertyData.ownership || null,
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
    // Don't make API calls during SSR/build
    if (typeof window === 'undefined') {
      return;
    }
    
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
              // Check if mortgage exists (success: true with data) or was not found (success: false with "Mortgage not found")
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
              // If success is false and error is "Mortgage not found", that's expected - property just doesn't have a mortgage
            } catch (err) {
              // Silently handle "Mortgage not found" - it's normal for properties to not have mortgages
              const errorMessage = err instanceof Error ? err.message : String(err);
              if (errorMessage.includes('Mortgage not found') || errorMessage.includes('404')) {
                // Property doesn't have a mortgage - this is expected and not an error
                // No need to log or throw
              } else {
                // Log other errors (network issues, etc.) but don't throw
                console.warn(`Could not load mortgage for property ${apiProperty.id}:`, err);
              }
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to load properties';
      // Only log network errors, don't clear properties (to avoid breaking UI)
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network error')) {
        console.warn('Network error loading properties (API may be unavailable):', err);
        // Keep existing properties if available, don't clear them
      } else {
        console.error('Error loading properties:', err);
        setProperties([]);
      }
    }
  }, []);

  // Initialize accounts and load current account
  useEffect(() => {
    // Only load accounts on client side
    if (typeof window !== 'undefined') {
      loadAccounts();
    }
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch account';
      // Handle network errors gracefully
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network error')) {
        console.warn('Network error switching account (API may be unavailable):', err);
        // Still update the UI state even if API call fails
        // The account switch will work locally, properties just won't load
      } else {
        console.error('Error switching account:', err);
        setError(errorMessage);
      }
      // Don't throw - allow the account switch to complete even if properties can't load
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
        
        // Add the new account to the state immediately
        setAccounts(prev => {
          // Check if account already exists to avoid duplicates
          if (prev.find(a => a.id === newAccount.id)) {
            return prev;
          }
          return [...prev, newAccount];
        });
        
        // Set as current account immediately
        setCurrentAccountId(newAccount.id);
        setCurrentAccount(newAccount);
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_account_id', newAccount.id);
        }
        
        // Refresh accounts list and load properties in the background (non-blocking)
        // Use setTimeout to ensure this doesn't block the return
        setTimeout(() => {
          Promise.all([
            loadAccounts().catch(err => {
              console.warn('Failed to refresh accounts list after creation:', err);
            }),
            loadProperties(newAccount.id).catch(err => {
              console.warn('Failed to load properties after account creation:', err);
            })
          ]).catch(() => {
            // Ignore errors - account is already created and set
          });
        }, 100);
        
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
  }, [loadAccounts, loadProperties]);

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
        // Normalize purchaseDate to YYYY-MM-DD format
        const normalizedProperty = {
          ...property,
          purchaseDate: normalizeDate(property.purchaseDate),
        };

        if (property.id) {
          // Update existing property
          return apiClient.updateProperty(property.id, {
            ...normalizedProperty,
            accountId: currentAccountId,
          });
        } else {
          // Create new property
          return apiClient.createProperty({
            ...normalizedProperty,
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
