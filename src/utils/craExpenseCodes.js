/**
 * CRA Expense Category Codes
 * Maps to Canada Revenue Agency Form T776 expense categories
 */

export const CRA_EXPENSE_CATEGORIES = {
  // Income
  RENTAL_INCOME: { name: 'Rental Income', code: null, isIncome: true },
  
  // Expenses with CRA codes
  ADVERTISING: { name: 'Advertising', code: '8521', isIncome: false },
  INSURANCE: { name: 'Insurance', code: '8691', isIncome: false },
  INTEREST_BANK_CHARGES: { name: 'Interest & Bank Charges', code: '8710', isIncome: false },
  OFFICE_EXPENSES: { name: 'Office Expenses', code: '8810', isIncome: false },
  PROFESSIONAL_FEES: { name: 'Professional Fees', code: '8860', isIncome: false },
  MANAGEMENT_ADMIN: { name: 'Management & Administration', code: '8871', isIncome: false },
  REPAIRS_MAINTENANCE: { name: 'Repairs & Maintenance', code: '8960', isIncome: false },
  SALARIES_WAGES: { name: 'Salaries, Wages, and Benefits', code: '9060', isIncome: false },
  PROPERTY_TAXES: { name: 'Property Taxes', code: '9180', isIncome: false },
  TRAVEL: { name: 'Travel', code: '9200', isIncome: false },
  UTILITIES: { name: 'Utilities', code: '9220', isIncome: false },
  MOTOR_VEHICLE: { name: 'Motor Vehicle Expenses', code: '9281', isIncome: false },
  OTHER_EXPENSES: { name: 'Other Expenses', code: '9270', isIncome: false },
  CONDO_FEES: { name: 'Condo Maintenance Fees', code: null, isIncome: false }, // Often separate line item
  MORTGAGE_PRINCIPAL: { name: 'Mortgage (Principal)', code: null, isIncome: false }, // Not deductible, but shown for completeness
};

// Map database expense categories to CRA categories
export const CATEGORY_MAPPING = {
  'Advertising': 'ADVERTISING',
  'Insurance': 'INSURANCE',
  'Interest & Bank Charges': 'INTEREST_BANK_CHARGES',
  'Interest': 'INTEREST_BANK_CHARGES',
  'Office Expenses': 'OFFICE_EXPENSES',
  'Professional Fees': 'PROFESSIONAL_FEES',
  'Management': 'MANAGEMENT_ADMIN',
  'Management & Administration': 'MANAGEMENT_ADMIN',
  'Maintenance': 'REPAIRS_MAINTENANCE',
  'Repairs & Maintenance': 'REPAIRS_MAINTENANCE',
  'Repairs': 'REPAIRS_MAINTENANCE',
  'Property Tax': 'PROPERTY_TAXES',
  'Property Taxes': 'PROPERTY_TAXES',
  'Travel': 'TRAVEL',
  'Utilities': 'UTILITIES',
  'Motor Vehicle': 'MOTOR_VEHICLE',
  'Motor Vehicle Expenses': 'MOTOR_VEHICLE',
  'Other': 'OTHER_EXPENSES',
  'Other Expenses': 'OTHER_EXPENSES',
  'Condo Fees': 'CONDO_FEES',
  'Condo Maintenance Fees': 'CONDO_FEES',
  'Rent': 'RENTAL_INCOME',
  'Income': 'RENTAL_INCOME',
};

/**
 * Get CRA category name and code for a database category
 */
export function getCRACategory(dbCategory) {
  if (!dbCategory) return null;
  
  const mappedKey = CATEGORY_MAPPING[dbCategory];
  if (!mappedKey) return null;
  
  return CRA_EXPENSE_CATEGORIES[mappedKey];
}

/**
 * Get all expense categories in the order they should appear in the report
 */
export function getExpenseCategoryOrder() {
  return [
    'Advertising',
    'Insurance',
    'Interest & Bank Charges',
    'Office Expenses',
    'Professional Fees',
    'Management & Administration',
    'Repairs & Maintenance',
    'Salaries, Wages, and Benefits',
    'Property Taxes',
    'Travel',
    'Utilities',
    'Motor Vehicle Expenses',
    'Other Expenses',
    'Condo Maintenance Fees',
    'Mortgage (Principal)',
  ];
}
