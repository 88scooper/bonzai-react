"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { calculateLandTransferTax } from '@/utils/financialCalculations';

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

  // Track if demo data is currently being loaded (to prevent duplicate calls)
  const isLoadingDemoDataRef = useRef(false);

  // Load demo data from public API
  const loadDemoData = useCallback(async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Prevent loading demo data if already loading or already loaded for demo account
    if (isLoadingDemoDataRef.current || (currentAccount?.isDemo && properties.length > 0)) {
      console.log('[AccountContext] Demo data already loading or loaded, skipping...', {
        isLoadingDemoData: isLoadingDemoDataRef.current,
        isDemoAccount: currentAccount?.isDemo,
        propertiesCount: properties.length
      });
      return;
    }
    
    isLoadingDemoDataRef.current = true;

    console.log('[AccountContext] Loading demo data from /api/demo...');
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch('/api/demo', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to load demo data: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('[AccountContext] Demo API response:', { 
          success: result.success, 
          propertiesCount: result.data?.properties?.length || 0 
        });
        
        if (result.success && result.data) {
          // Set demo account
          const demoAccount: Account = {
            id: result.data.account.id,
            name: result.data.account.name,
            email: result.data.account.email || '',
            createdAt: result.data.account.createdAt,
            isDemo: true,
          };
          
          setAccounts([demoAccount]);
          setCurrentAccountId(demoAccount.id);
          setCurrentAccount(demoAccount);
          
          // Map demo properties and attach mortgages/expenses
          const properties = (result.data.properties || []).map((property: any) => {
            // Find mortgage for this property
            const mortgage = (result.data.mortgages || []).find((m: any) => m.propertyId === property.id);
            // Find expenses for this property
            const expenses = (result.data.expenses || []).filter((e: any) => e.propertyId === property.id);
            
            // Map mortgage data
            if (mortgage) {
              property.mortgage = {
                lender: mortgage.lenderName || '',
                originalAmount: parseFloat(mortgage.originalAmount || 0),
                interestRate: parseFloat(mortgage.interestRate || 0),
                rateType: 'Fixed',
                termMonths: mortgage.termMonths || 60,
                amortizationYears: 25,
                paymentFrequency: mortgage.paymentFrequency || 'Monthly',
                startDate: mortgage.startDate || null,
                currentBalance: mortgage.currentBalance ? parseFloat(mortgage.currentBalance) : null,
                paymentAmount: mortgage.paymentAmount ? parseFloat(mortgage.paymentAmount) : null,
                mortgageData: mortgage.mortgageData || {},
              };
            }
            
            // Map expense history
            if (expenses && expenses.length > 0) {
              property.expenseHistory = expenses.map((exp: any) => ({
                id: exp.id,
                date: exp.expenseDate,
                amount: parseFloat(exp.amount || 0),
                category: exp.category || 'Other',
                description: exp.description || '',
              }));
              
              // Calculate monthly expenses from expense history
              const currentYear = new Date().getFullYear();
              const currentYearExpenses = expenses.filter((e: any) => {
                const expDate = new Date(e.expenseDate);
                return expDate.getFullYear() === currentYear;
              });
              
              const categoryTotals: Record<string, number> = {};
              currentYearExpenses.forEach((exp: any) => {
                const category = exp.category || 'Other';
                const amount = parseFloat(exp.amount || 0);
                categoryTotals[category] = (categoryTotals[category] || 0) + amount;
              });
              
              const categoryMapping: Record<string, string> = {
                'Property Tax': 'propertyTax',
                'Condo Fees': 'condoFees',
                'Insurance': 'insurance',
                'Maintenance': 'maintenance',
                'Professional Fees': 'professionalFees',
                'Utilities': 'utilities',
                'Other': 'other',
              };
              
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
                const monthlyKey = categoryMapping[category] || 'other';
                monthlyExpenses[monthlyKey] = annualTotal / 12;
              });
              
              const operatingTotal = 
                monthlyExpenses.propertyTax +
                monthlyExpenses.condoFees +
                monthlyExpenses.insurance +
                monthlyExpenses.maintenance +
                monthlyExpenses.professionalFees +
                monthlyExpenses.utilities +
                monthlyExpenses.other;
              monthlyExpenses.total = operatingTotal;
              
              property.monthlyExpenses = monthlyExpenses;
            } else {
              property.expenseHistory = [];
              property.monthlyExpenses = {
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
            
            // Extract tenant/rent data from propertyData
            const propertyData = property.propertyData || {};
            const rent = propertyData.rent || {};
            const tenants = propertyData.tenants || [];
            
            // Map rent data
            property.rent = {
              monthlyRent: rent.monthlyRent || rent.monthly_rent || 0,
              annualRent: rent.annualRent || rent.annual_rent || 0,
            };
            
            // If we have monthly rent but no annual, calculate it
            if (property.rent.monthlyRent && !property.rent.annualRent) {
              property.rent.annualRent = property.rent.monthlyRent * 12;
            }
            
            // Map tenant data
            property.tenants = tenants;
            property.tenant = tenants.length > 0 ? {
              name: tenants[0].name || '',
              leaseStartDate: tenants[0].leaseStart || tenants[0].lease_start || '',
              leaseEndDate: tenants[0].leaseEnd || tenants[0].lease_end || '',
              rent: tenants[0].rent || property.rent.monthlyRent || 0,
              status: tenants[0].status || '',
            } : {
              name: '',
              leaseStartDate: '',
              leaseEndDate: '',
              rent: 0,
              status: '',
            };
            
            // Ensure property has required fields
            property.squareFootage = property.size || 0;
            property.currentValue = property.currentMarketValue || 0;
            property.name = property.nickname || '';
            property.type = property.propertyType || '';
            property.units = propertyData.units || 1;
            property.bedrooms = propertyData.bedrooms !== undefined ? propertyData.bedrooms : null;
            property.bathrooms = propertyData.bathrooms !== undefined ? propertyData.bathrooms : null;
            property.dens = propertyData.dens !== undefined ? propertyData.dens : null;
            property.isPrincipalResidence = propertyData.isPrincipalResidence || false;
            property.ownership = propertyData.ownership || null;
            
            // Calculate Land Transfer Tax
            const city = property.address?.includes('Toronto') ? 'Toronto' : '';
            const province = 'ON';
            const landTransferTax = calculateLandTransferTax(
              property.purchasePrice || 0,
              city,
              province,
              property.landTransferTax // Manual override if provided
            );
            
            // Calculate down payment
            const mortgageAmount = property.mortgage?.originalAmount || 0;
            const downPayment = (property.purchasePrice || 0) - mortgageAmount;
            
            property.totalInvestment = downPayment + 
                                      (property.closingCosts || 0) + 
                                      (property.renovationCosts || 0) + 
                                      (property.initialRenovations || 0) + 
                                      landTransferTax;
            property.landTransferTax = landTransferTax;
            
            // Calculate appreciation
            if (property.currentMarketValue && property.purchasePrice) {
              property.appreciation = property.currentMarketValue - property.purchasePrice;
            } else {
              property.appreciation = 0;
            }
            
            // Ensure property_data structure exists
            if (!property.propertyData) {
              property.propertyData = {};
            }
            
            return property;
          });
          
          console.log('[AccountContext] Demo data loaded:', {
            accountId: demoAccount.id,
            accountName: demoAccount.name,
            propertiesCount: properties.length
          });
          
          setProperties(properties);
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('current_account_id', demoAccount.id);
          }
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          console.warn('Demo data fetch timed out');
          setError('Request timed out');
        } else {
          throw fetchErr;
        }
      }
    } catch (err) {
      console.error('[AccountContext] Error loading demo data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load demo data';
      setError(errorMessage);
      // Don't clear properties on error - keep existing state
    } finally {
      setLoading(false);
      isLoadingDemoDataRef.current = false;
    }
  }, [currentAccount?.isDemo, properties.length]);

  // Load accounts from API
  const loadAccounts = useCallback(async () => {
    // Don't make API calls during SSR/build
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    // If user is authenticated, clear demo mode flag (real users shouldn't see demo mode)
    if (isAuthenticated()) {
      // Clear demo mode from sessionStorage if a real user is logged in
      if (sessionStorage.getItem('demoMode') === 'true') {
        sessionStorage.removeItem('demoMode');
      }
    }
    
    // Check for demo mode (only from sessionStorage to avoid static generation issues)
    // Only use demo mode if user is NOT authenticated
    // Note: Check sessionStorage first, then isAuthenticated() to handle stale tokens
    const demoModeFlag = sessionStorage.getItem('demoMode') === 'true';
    const userAuthenticated = isAuthenticated();
    const isDemoMode = demoModeFlag && !userAuthenticated;
    
    console.log('[AccountContext] loadAccounts check:', {
      demoModeFlag,
      userAuthenticated,
      isDemoMode,
      user: user?.id || null
    });
    
    if (isDemoMode) {
      console.log('[AccountContext] Demo mode detected in loadAccounts, loading demo data...');
      await loadDemoData();
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

        // If no accounts exist, clear current account to trigger onboarding
        if (mappedAccounts.length === 0) {
          setCurrentAccountId(null);
          setCurrentAccount(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('current_account_id');
          }
        }
        // Set current account if not set
        else if (!currentAccountId && mappedAccounts.length > 0) {
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
  }, [currentAccountId, user?.email, loadDemoData]);

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
      // Additional fields from property_data
      name: apiProperty.nickname || '',
      type: apiProperty.property_type || '',
      units: propertyData.units || 1,
      isPrincipalResidence: propertyData.isPrincipalResidence || false,
      ownership: propertyData.ownership || null,
      bedrooms: propertyData.bedrooms !== undefined ? propertyData.bedrooms : null,
      bathrooms: propertyData.bathrooms !== undefined ? propertyData.bathrooms : null,
      dens: propertyData.dens !== undefined ? propertyData.dens : null,
      currentValue: parseFloat(apiProperty.current_market_value || 0),
      // Image URL - try property_data first, then try to generate from address/nickname
      imageUrl: (() => {
        if (propertyData.imageUrl) return propertyData.imageUrl;
        
        // Try to construct from address (e.g., "500-415 Wilson Avenue" -> "500 Wilson Ave.png")
        // For addresses with ranges like "500-415", take the first number
        if (apiProperty.address) {
          const addressMatch = apiProperty.address.match(/^(\d+)(?:[-\s]*\d*)?\s+(.+?)(?:,|$)/);
          if (addressMatch) {
            const firstNumber = addressMatch[1]; // "500"
            const street = addressMatch[2].trim(); // "Wilson Avenue"
            
            // Convert full words to abbreviations
            let streetAbbr = street
              .replace(/\bAvenue\b/gi, 'Ave')
              .replace(/\bStreet\b/gi, 'St')
              .replace(/\bDrive\b/gi, 'Dr')
              .replace(/\bWay\b/gi, 'Way')
              .replace(/\bBoulevard\b/gi, 'Blvd')
              .replace(/\bRoad\b/gi, 'Rd');
            
            // Convert direction words to abbreviations (East -> E, West -> W, etc.)
            streetAbbr = streetAbbr
              .replace(/\bEast\b/gi, 'E')
              .replace(/\bWest\b/gi, 'W')
              .replace(/\bNorth\b/gi, 'N')
              .replace(/\bSouth\b/gi, 'S');
            
            // Construct: "500 Wilson Ave"
            const imageName = `${firstNumber} ${streetAbbr}`.trim();
            return `/images/${imageName}.png`;
          }
        }
        
        // Fallback to nickname
        if (apiProperty.nickname) {
          return `/images/${apiProperty.nickname}.png`;
        }
        
        return null;
      })(),
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
      expenseHistory: propertyData.expenseHistory || [],
      incomeHistory: propertyData.incomeHistory || [],
      // Preserve the full propertyData object (includes imageUrls array)
      propertyData: propertyData,
    };
  }

  // Load properties for current account
  const loadProperties = useCallback(async (accountId: string) => {
    // Don't make API calls during SSR/build
    if (typeof window === 'undefined') {
      return;
    }
    
    if (!isAuthenticated() || !accountId) {
      console.log('AccountContext: loadProperties skipped - not authenticated or no accountId', { isAuthenticated: isAuthenticated(), accountId });
      setProperties([]);
      return;
    }

    try {
      console.log('AccountContext: loadProperties called for accountId:', accountId);
      const response = await apiClient.getProperties(accountId, 1, 1000); // Get up to 1000 properties
      console.log('AccountContext: getProperties response:', { success: response.success, hasData: !!response.data, dataLength: Array.isArray(response.data?.data) ? response.data.data.length : (Array.isArray(response.data) ? response.data.length : 0) });
      
      // Handle "Account not found" error from API client
      if (!response.success && response.error === 'Account not found') {
        console.warn('Account not found, clearing invalid account ID and reloading accounts');
        // Clear the invalid account ID from state and localStorage
        setCurrentAccountId(null);
        setCurrentAccount(null);
        setProperties([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('current_account_id');
        }
        // Note: loadAccounts will be called via useEffect and will automatically
        // select a valid account (or first available account)
        return;
      }
      
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
        
        console.log('AccountContext: Setting properties:', mappedProperties.length, 'properties loaded');
        setProperties(mappedProperties);
      } else {
        console.log('AccountContext: No properties in response, setting empty array');
        setProperties([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load properties';
      
      // Handle "Account not found" - account may have been deleted or user lost access
      if (errorMessage.includes('Account not found')) {
        console.warn('Account not found, clearing invalid account ID and reloading accounts');
        // Clear the invalid account ID from state and localStorage
        setCurrentAccountId(null);
        setCurrentAccount(null);
        setProperties([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('current_account_id');
        }
        // Note: loadAccounts will be called via useEffect and will automatically
        // select a valid account (or first available account)
        return;
      }
      
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

  // Check for demo mode immediately on mount (before AuthContext fully initializes)
  // This ensures demo mode works even if there's a stale auth token
  useEffect(() => {
    if (typeof window !== 'undefined' && !user) {
      const demoMode = sessionStorage.getItem('demoMode') === 'true';
      if (demoMode && !currentAccountId && !loading) {
        console.log('[AccountContext] Demo mode detected on mount, loading demo data...');
        loadDemoData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - intentionally only run on mount

  // Initialize accounts and load current account
  useEffect(() => {
    // Only load accounts on client side
    // Add a small delay to ensure AuthContext has finished initializing
    if (typeof window !== 'undefined') {
      // Use setTimeout to prevent blocking the initial render
      const timeoutId = setTimeout(() => {
        loadAccounts();
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [loadAccounts]);

  // Load properties when current account changes
  useEffect(() => {
    // Load properties for all accounts, including demo accounts
    // Demo accounts loaded via loadDemoData() will have properties already set,
    // but authenticated users with demo accounts need to load properties via API
    if (currentAccountId) {
      // Only skip if user is not authenticated (meaning demo mode via loadDemoData)
      // For authenticated users, always load properties via API, even for demo accounts
      if (isAuthenticated()) {
        loadProperties(currentAccountId);
      }
      // If not authenticated and it's a demo account, properties should already be loaded via loadDemoData()
    } else {
      setProperties([]);
    }
  }, [currentAccountId, currentAccount?.isDemo, loadProperties]);

  // Refresh accounts
  const refreshAccounts = useCallback(async () => {
    console.log('AccountContext: refreshAccounts called, currentAccountId:', currentAccountId);
    setLoading(true);
    await loadAccounts();
    // Also reload properties for current account if it exists
    if (currentAccountId) {
      console.log('AccountContext: Loading properties for account:', currentAccountId);
      await loadProperties(currentAccountId);
      console.log('AccountContext: Properties loaded');
    }
    setLoading(false);
  }, [loadAccounts, currentAccountId, loadProperties]);

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
