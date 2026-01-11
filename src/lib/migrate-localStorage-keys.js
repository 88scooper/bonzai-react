/**
 * Migration utility to migrate old Proplytics localStorage keys to Bonzai
 * Run this once on app load for existing users
 * 
 * This ensures backward compatibility for users who have existing data
 * stored under the old "proplytics_*" keys
 */

export function migrateLocalStorageKeys() {
  if (typeof window === 'undefined') return;
  
  // Check if migration has already been run
  if (localStorage.getItem('bonzai_migration_complete')) {
    return; // Migration already completed
  }
  
  const migrations = [
    // Settings
    { old: 'proplytics_settings', new: 'bonzai_settings' },
    
    // Property tabs
    { old: 'proplytics_property_tabs', new: 'bonzai_property_tabs' },
    
    // Property notes
    { old: 'proplytics_property_notes', new: 'bonzai_property_notes' },
    
    // Scenarios
    { old: 'proplytics_saved_scenarios', new: 'bonzai_saved_scenarios' },
    { old: 'proplytics_scenario_folders', new: 'bonzai_scenario_folders' },
    
    // Accounts
    { old: 'proplytics_accounts', new: 'bonzai_accounts' },
    { old: 'proplytics_current_account', new: 'bonzai_current_account' },
  ];
  
  let migrated = false;
  
  // Migrate simple key-value pairs
  migrations.forEach(({ old, new: newKey }) => {
    const oldValue = localStorage.getItem(old);
    if (oldValue && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldValue);
      migrated = true;
      console.log(`Migrated localStorage key: ${old} → ${newKey}`);
    }
  });
  
  // Migrate account data keys (proplytics_account_data_*)
  const accountDataKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('proplytics_account_data_')
  );
  
  accountDataKeys.forEach(oldKey => {
    const newKey = oldKey.replace('proplytics_account_data_', 'bonzai_account_data_');
    if (!localStorage.getItem(newKey)) {
      const value = localStorage.getItem(oldKey);
      if (value) {
        localStorage.setItem(newKey, value);
        migrated = true;
        console.log(`Migrated localStorage key: ${oldKey} → ${newKey}`);
      }
    }
  });
  
  // Mark migration as complete
  if (migrated) {
    localStorage.setItem('bonzai_migration_complete', 'true');
    console.log('✅ localStorage migration completed successfully');
  }
}
