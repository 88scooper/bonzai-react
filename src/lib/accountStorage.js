// Account storage utility for managing multiple accounts and their data
// Uses localStorage to persist account data

const STORAGE_KEY_ACCOUNTS = 'proplytics_accounts';
const STORAGE_KEY_CURRENT_ACCOUNT = 'proplytics_current_account';
const STORAGE_KEY_ACCOUNT_DATA_PREFIX = 'proplytics_account_data_';

// Get all accounts
export function getAllAccounts() {
  if (typeof window === 'undefined') return [];
  
  try {
    const accountsJson = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!accountsJson) {
      // Initialize with demo account if no accounts exist
      const demoAccount = {
        id: 'demo-account',
        name: 'Demo Account',
        email: 'demo@proplytics.com',
        createdAt: new Date().toISOString(),
        isDemo: true
      };
      saveAccount(demoAccount);
      return [demoAccount];
    }
    return JSON.parse(accountsJson);
  } catch (error) {
    console.error('Error loading accounts:', error);
    return [];
  }
}

// Save an account
export function saveAccount(account) {
  if (typeof window === 'undefined') return;
  
  try {
    const accounts = getAllAccounts();
    const existingIndex = accounts.findIndex(a => a.id === account.id);
    
    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
    }
    
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (error) {
    console.error('Error saving account:', error);
  }
}

// Delete an account
export function deleteAccount(accountId) {
  if (typeof window === 'undefined') return;
  
  try {
    const accounts = getAllAccounts().filter(a => a.id !== accountId);
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    
    // Delete account data
    localStorage.removeItem(`${STORAGE_KEY_ACCOUNT_DATA_PREFIX}${accountId}`);
    
    // If deleted account was current, switch to first available account
    const currentAccountId = getCurrentAccountId();
    if (currentAccountId === accountId && accounts.length > 0) {
      setCurrentAccountId(accounts[0].id);
    }
  } catch (error) {
    console.error('Error deleting account:', error);
  }
}

// Get current account ID
export function getCurrentAccountId() {
  if (typeof window === 'undefined') return 'demo-account';
  
  try {
    const currentId = localStorage.getItem(STORAGE_KEY_CURRENT_ACCOUNT);
    if (currentId) {
      return currentId;
    }
    
    // If no current account, set demo account as default
    const accounts = getAllAccounts();
    if (accounts.length > 0) {
      const demoAccount = accounts.find(a => a.isDemo) || accounts[0];
      setCurrentAccountId(demoAccount.id);
      return demoAccount.id;
    }
    
    return 'demo-account';
  } catch (error) {
    console.error('Error getting current account:', error);
    return 'demo-account';
  }
}

// Set current account ID
export function setCurrentAccountId(accountId) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT_ACCOUNT, accountId);
  } catch (error) {
    console.error('Error setting current account:', error);
  }
}

// Get account data (properties, mortgages, etc.)
export function getAccountData(accountId) {
  if (typeof window === 'undefined') return null;
  
  try {
    const dataJson = localStorage.getItem(`${STORAGE_KEY_ACCOUNT_DATA_PREFIX}${accountId}`);
    return dataJson ? JSON.parse(dataJson) : null;
  } catch (error) {
    console.error('Error loading account data:', error);
    return null;
  }
}

// Save account data
export function saveAccountData(accountId, data) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(
      `${STORAGE_KEY_ACCOUNT_DATA_PREFIX}${accountId}`,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error('Error saving account data:', error);
  }
}

// Get properties for an account
export function getAccountProperties(accountId) {
  const accountData = getAccountData(accountId);
  return accountData?.properties || [];
}

// Save properties for an account
export function saveAccountProperties(accountId, properties) {
  const accountData = getAccountData(accountId) || {};
  accountData.properties = properties;
  saveAccountData(accountId, accountData);
}

// Initialize demo account with default properties
export function initializeDemoAccount(properties) {
  const demoAccountId = 'demo-account';
  const demoAccount = {
    id: demoAccountId,
    name: 'Demo Account',
    email: 'demo@proplytics.com',
    createdAt: new Date().toISOString(),
    isDemo: true
  };
  
  saveAccount(demoAccount);
  saveAccountProperties(demoAccountId, properties);
  
  // Set as current if no current account
  if (!getCurrentAccountId() || getCurrentAccountId() === 'demo-account') {
    setCurrentAccountId(demoAccountId);
  }
}

// Create a new account
export function createNewAccount(name, email) {
  const newAccount = {
    id: `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: name || `Account ${new Date().toLocaleDateString()}`,
    email: email || '',
    createdAt: new Date().toISOString(),
    isDemo: false
  };
  
  saveAccount(newAccount);
  saveAccountProperties(newAccount.id, []); // Start with empty properties
  
  return newAccount;
}


