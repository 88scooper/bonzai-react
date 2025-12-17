"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  getAllAccounts,
  getCurrentAccountId,
  setCurrentAccountId as saveCurrentAccountId,
  getAccountProperties,
  saveAccountProperties,
  createNewAccount as createAccount,
  deleteAccount as removeAccount,
  initializeDemoAccount
} from '@/lib/accountStorage';
import { properties as defaultProperties } from '@/data/properties';
import { scProperties } from '@/data/scProperties';

export interface Account {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isDemo: boolean;
}

interface AccountContextType {
  accounts: Account[];
  currentAccount: Account | null;
  currentAccountId: string | null;
  properties: any[];
  loading: boolean;
  switchAccount: (accountId: string) => void;
  createNewAccount: (name?: string, email?: string) => Account;
  deleteAccount: (accountId: string) => void;
  updateAccountName: (accountId: string, name: string) => void;
  saveProperties: (properties: any[]) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize accounts and load current account
  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      // Load all accounts
      let allAccounts = getAllAccounts();
      
      // If no accounts exist, initialize demo account with default properties
      if (allAccounts.length === 0) {
        initializeDemoAccount(defaultProperties);
        allAccounts = getAllAccounts();
      } else {
        // Ensure demo account has properties if it exists
        const demoAccount = allAccounts.find(a => a.isDemo);
        if (demoAccount) {
          const demoProperties = getAccountProperties(demoAccount.id);
          if (!demoProperties || demoProperties.length === 0) {
            saveAccountProperties(demoAccount.id, defaultProperties);
          }
        }
      }
      
      // Ensure SC Properties account exists and has properties initialized
      const scPropertiesAccount = allAccounts.find(a => a.name === 'SC Properties');
      if (!scPropertiesAccount) {
        const scAccount = createAccount('SC Properties', '');
        // Initialize with SC Properties data if available
        if (scProperties && scProperties.length > 0) {
          saveAccountProperties(scAccount.id, scProperties);
        }
        allAccounts = getAllAccounts();
      } else {
        // Ensure SC Properties account has data if it exists but is empty
        const scAccountProperties = getAccountProperties(scPropertiesAccount.id);
        if ((!scAccountProperties || scAccountProperties.length === 0) && scProperties && scProperties.length > 0) {
          saveAccountProperties(scPropertiesAccount.id, scProperties);
        }
      }
      
      setAccounts(allAccounts);
      
      // Load current account
      const currentId = getCurrentAccountId();
      setCurrentAccountId(currentId);
      
      const account = allAccounts.find(a => a.id === currentId);
      setCurrentAccount(account || allAccounts[0] || null);
      
      // Load properties for current account
      if (currentId) {
        const accountProperties = getAccountProperties(currentId);
        // If no properties found and it's the demo account, use default properties
        if ((!accountProperties || accountProperties.length === 0) && account?.isDemo) {
          setProperties(defaultProperties);
        } else {
          setProperties(accountProperties || []);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing accounts:', error);
      setLoading(false);
    }
  }, []);

  // Switch to a different account
  const switchAccount = useCallback((accountId: string) => {
    try {
      saveCurrentAccountId(accountId);
      
      // Reload accounts to get latest data
      const allAccounts = getAllAccounts();
      setAccounts(allAccounts);
      
      setCurrentAccountId(accountId);
      
      const account = allAccounts.find(a => a.id === accountId);
      setCurrentAccount(account || null);
      
      // Load properties for the new account
      const accountProperties = getAccountProperties(accountId);
      // If no properties found and it's the demo account, use default properties
      if ((!accountProperties || accountProperties.length === 0) && account?.isDemo) {
        setProperties(defaultProperties);
      } else {
        setProperties(accountProperties || []);
      }
      
      // Trigger a page reload to ensure all contexts update
      window.location.reload();
    } catch (error) {
      console.error('Error switching account:', error);
    }
  }, []);

  // Create a new account
  const createNewAccount = useCallback((name?: string, email?: string) => {
    const newAccount = createAccount(name, email);
    const updatedAccounts = getAllAccounts();
    setAccounts(updatedAccounts);
    return newAccount;
  }, []);

  // Delete an account
  const deleteAccount = useCallback((accountId: string) => {
    // Don't allow deleting the last account
    if (accounts.length <= 1) {
      throw new Error('Cannot delete the last account');
    }
    
    // Don't allow deleting demo account
    const account = accounts.find(a => a.id === accountId);
    if (account?.isDemo) {
      throw new Error('Cannot delete the demo account');
    }
    
    removeAccount(accountId);
    const updatedAccounts = getAllAccounts();
    setAccounts(updatedAccounts);
    
    // If we deleted the current account, switch to another one
    if (currentAccountId === accountId) {
      const remainingAccounts = updatedAccounts.filter(a => a.id !== accountId);
      if (remainingAccounts.length > 0) {
        switchAccount(remainingAccounts[0].id);
      }
    }
  }, [accounts, currentAccountId, switchAccount]);

  // Update account name
  const updateAccountName = useCallback((accountId: string, name: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      account.name = name;
      const updatedAccounts = accounts.map(a => 
        a.id === accountId ? account : a
      );
      setAccounts(updatedAccounts);
      
      // Update in storage
      const { saveAccount } = require('@/lib/accountStorage');
      saveAccount(account);
      
      // Update current account if it's the one being updated
      if (currentAccountId === accountId) {
        setCurrentAccount(account);
      }
    }
  }, [accounts, currentAccountId]);

  // Save properties for current account
  const saveProperties = useCallback((newProperties: any[]) => {
    if (!currentAccountId) return;
    
    try {
      saveAccountProperties(currentAccountId, newProperties);
      setProperties(newProperties);
    } catch (error) {
      console.error('Error saving properties:', error);
    }
  }, [currentAccountId]);

  const value: AccountContextType = {
    accounts,
    currentAccount,
    currentAccountId,
    properties,
    loading,
    switchAccount,
    createNewAccount,
    deleteAccount,
    updateAccountName,
    saveProperties
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


