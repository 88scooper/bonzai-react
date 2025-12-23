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
  switchAccount: (accountId: string) => Promise<void>;
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
        setProperties(Array.isArray(propertiesData) ? propertiesData : []);
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
  const switchAccount = useCallback(async (accountId: string) => {
    try {
      setError(null);
      
      // Verify account exists
      const account = accounts.find(a => a.id === accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      setCurrentAccountId(accountId);
      setCurrentAccount(account);
      
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
        
        // Refresh accounts list
        await loadAccounts();
        
        // Switch to new account
        await switchAccount(newAccount.id);
        
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
