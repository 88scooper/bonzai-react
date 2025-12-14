// Import mortgage calculator utilities (conditional import for Next.js environment)
let getMonthlyMortgagePayment, getMonthlyMortgageInterest, getMonthlyMortgagePrincipal, getCurrentMortgageBalance, getAnnualMortgageInterest;

try {
  const mortgageUtils = require('@/utils/mortgageCalculator');
  getMonthlyMortgagePayment = mortgageUtils.getMonthlyMortgagePayment;
  getMonthlyMortgageInterest = mortgageUtils.getMonthlyMortgageInterest;
  getMonthlyMortgagePrincipal = mortgageUtils.getMonthlyMortgagePrincipal;
  getCurrentMortgageBalance = mortgageUtils.getCurrentMortgageBalance;
  getAnnualMortgageInterest = mortgageUtils.getAnnualMortgageInterest;
} catch (error) {
  // Fallback functions for non-Next.js environments
  getMonthlyMortgagePayment = () => 0;
  getMonthlyMortgageInterest = () => 0;
  getMonthlyMortgagePrincipal = () => 0;
  getCurrentMortgageBalance = (mortgage) => mortgage?.originalAmount || 0;
  getAnnualMortgageInterest = (mortgage) => (mortgage?.originalAmount || 0) * (mortgage?.interestRate || 0);
}

// Import financial calculation utilities
let calculateAnnualOperatingExpenses, calculateNOI, calculateCapRate, calculateMonthlyCashFlow, calculateAnnualCashFlow, calculateCashOnCashReturn, updatePropertyFinancialMetrics;

try {
  const financialUtils = require('@/utils/financialCalculations');
  calculateAnnualOperatingExpenses = financialUtils.calculateAnnualOperatingExpenses;
  calculateNOI = financialUtils.calculateNOI;
  calculateCapRate = financialUtils.calculateCapRate;
  calculateMonthlyCashFlow = financialUtils.calculateMonthlyCashFlow;
  calculateAnnualCashFlow = financialUtils.calculateAnnualCashFlow;
  calculateCashOnCashReturn = financialUtils.calculateCashOnCashReturn;
  updatePropertyFinancialMetrics = financialUtils.updatePropertyFinancialMetrics;
} catch (error) {
  // Fallback functions for non-Next.js environments
  calculateAnnualOperatingExpenses = () => 0;
  calculateNOI = () => 0;
  calculateCapRate = () => 0;
  calculateMonthlyCashFlow = () => 0;
  calculateAnnualCashFlow = () => 0;
  calculateCashOnCashReturn = () => 0;
  updatePropertyFinancialMetrics = (property) => property;
}

// Helper function to parse number from CSV
function parseNumber(value) {
  if (!value || value === '') return 0;
  const cleaned = String(value).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Helper function to parse date from CSV format (DD-MMM-YY)
function parseDate(dateStr) {
  if (!dateStr || dateStr === '') return new Date().toISOString().split('T')[0];
  
  // Handle DD-MMM-YY format
  const match = dateStr.match(/(\d{1,2})-(\w{3})-(\d{2})/i);
  if (match) {
    const months = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    const day = match[1].padStart(2, '0');
    const month = months[match[2].toLowerCase()] || '01';
    const year = '20' + match[3];
    return `${year}-${month}-${day}`;
  }
  
  // Handle YYYY-MM-DD format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  return new Date().toISOString().split('T')[0];
}

// SC Properties account data
export const scProperties = [
  // Richmond Street East - 311-403
  {
    id: 'richmond-st-e-403',
    nickname: 'Richmond St E',
    address: '311-403 Richmond Street East, Toronto, ON M5A 4S8',
    purchasePrice: 615000,
    purchaseDate: '2019-02-04',
    closingCosts: 18150,
    initialRenovations: 100000,
    renovationCosts: 0,
    currentMarketValue: 800000,
    yearBuilt: 2001,
    propertyType: 'Condo',
    size: 946,
    unitConfig: '2 Bed, Den, 2 Bath',
    
    mortgage: {
      lender: 'RMG',
      originalAmount: 492000,
      interestRate: 0.05, // Variable rate with -0.95% spread, using 5% as base
      rateType: 'Variable',
      termMonths: 60,
      amortizationYears: 25, // 300 months
      paymentFrequency: 'Monthly',
      startDate: '2019-02-04',
    },

    rent: {
      monthlyRent: 3450,
      annualRent: 41400, // Using 2024 annual rent
    },

    expenseHistory: [
      // 2023 Expenses
      { id: 'richmond-2023-insurance', date: '2023-01-15', amount: 0, category: 'Insurance', description: 'Property insurance' },
      { id: 'richmond-2023-interest', date: '2023-06-01', amount: 1696.05, category: 'Other', description: 'Interest & bank charges' },
      { id: 'richmond-2023-professional', date: '2023-03-15', amount: 3785.59, category: 'Professional Fees', description: 'Professional fees' },
      { id: 'richmond-2023-maintenance', date: '2023-08-15', amount: 0, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'richmond-2023-tax', date: '2023-01-15', amount: 524.39, category: 'Property Tax', description: 'Property taxes' },
      { id: 'richmond-2023-utilities', date: '2023-01-15', amount: 54, category: 'Other', description: 'Utilities' },
      { id: 'richmond-2023-condo', date: '2023-01-15', amount: 1580.58, category: 'Condo Fees', description: 'Condo maintenance fees' },
      
      // 2024 Expenses
      { id: 'richmond-2024-insurance', date: '2024-01-15', amount: 310.14, category: 'Insurance', description: 'Property insurance' },
      { id: 'richmond-2024-interest', date: '2024-06-01', amount: 10343.11, category: 'Other', description: 'Interest & bank charges' },
      { id: 'richmond-2024-professional', date: '2024-03-15', amount: 0, category: 'Professional Fees', description: 'Professional fees' },
      { id: 'richmond-2024-maintenance', date: '2024-08-15', amount: 59.68, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'richmond-2024-tax', date: '2024-01-15', amount: 3218.8, category: 'Property Tax', description: 'Property taxes' },
      { id: 'richmond-2024-condo', date: '2024-01-15', amount: 9562.04, category: 'Condo Fees', description: 'Condo maintenance fees' },
      
      // 2025 Expenses
      { id: 'richmond-2025-insurance', date: '2025-01-15', amount: 512, category: 'Insurance', description: 'Property insurance' },
      { id: 'richmond-2025-interest', date: '2025-06-01', amount: 0, category: 'Other', description: 'Interest & bank charges' },
      { id: 'richmond-2025-professional', date: '2025-03-15', amount: 3898.5, category: 'Professional Fees', description: 'Professional fees' },
      { id: 'richmond-2025-maintenance', date: '2025-08-15', amount: 829.17, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'richmond-2025-tax', date: '2025-01-15', amount: 2205.39, category: 'Property Tax', description: 'Property taxes' },
      { id: 'richmond-2025-condo', date: '2025-01-15', amount: 9954.84, category: 'Condo Fees', description: 'Condo maintenance fees' },
    ],

    tenant: {
      name: 'Steve MacNeil, Kate St John',
      leaseStartDate: '2025-02-16',
      leaseEndDate: 'Active',
      rent: 3450,
      status: 'Active'
    },

    // Calculated fields
    totalInvestment: 233150, // down payment (123000) + closingCosts (18150) + initialRenovations (100000)
    appreciation: 185000, // currentMarketValue - purchasePrice
    monthlyPropertyTax: 183.78, // 2205.39 / 12 (using 2025 data)
    monthlyCondoFees: 829.57, // 9954.84 / 12 (using 2025 data)
    monthlyInsurance: 42.67, // 512 / 12 (using 2025 data)
    monthlyMaintenance: 69.10, // 829.17 / 12 (using 2025 data)
    monthlyProfessionalFees: 324.88, // 3898.5 / 12 (using 2025 data)
    
    monthlyExpenses: {
      propertyTax: 183.78,
      condoFees: 829.57,
      insurance: 42.67,
      maintenance: 69.10,
      professionalFees: 324.88,
      mortgagePayment: 0, // Will be calculated below
      mortgageInterest: 0, // Will be calculated below
      mortgagePrincipal: 0, // Will be calculated below
      total: 1449.00 // Will be recalculated below
    },
    
    monthlyCashFlow: 2001.00, // monthlyRent - monthlyExpenses.total (will be recalculated)
    annualCashFlow: 24012, // monthlyCashFlow * 12
    capRate: 5.2, // (annualRent / currentMarketValue) * 100 = (41400 / 800000) * 100
    occupancy: 100,
    
    // Additional fields for compatibility
    name: 'Richmond St E',
    type: 'Condo',
    units: 1,
    bedrooms: [2],
    bathrooms: [2],
    squareFootage: 946,
    currentValue: 800000,
    imageUrl: '/images/311 Richmond St E.png',
    tenants: [
      {
        name: 'Marci Graore',
        unit: 'Unit 403',
        rent: 3350,
        leaseStart: '2023-12-01',
        leaseEnd: '2025-02-15',
        status: 'Vacant'
      },
      {
        name: 'Steve MacNeil, Kate St John',
        unit: 'Unit 403',
        rent: 3450,
        leaseStart: '2025-02-16',
        leaseEnd: 'Active',
        status: 'Active'
      }
    ]
  },
  
  // Tretti Way - 30-317
  {
    id: 'tretti-way-317',
    nickname: 'Tretti Way',
    address: '30-317 Tretti Way, Toronto, ON M3H 0E3',
    purchasePrice: 448618,
    purchaseDate: '2023-10-04',
    closingCosts: 68086,
    initialRenovations: 0,
    renovationCosts: 0,
    currentMarketValue: 550000,
    yearBuilt: 2023,
    propertyType: 'Condo',
    size: 553,
    unitConfig: '2 Bed, 2 Bath',
    
    mortgage: {
      lender: 'TD Bank',
      originalAmount: 358800,
      interestRate: 0.0549, // 5.49% as decimal
      rateType: 'Fixed',
      termMonths: 48,
      amortizationYears: 30, // 360 months
      paymentFrequency: 'Monthly',
      startDate: '2023-08-01',
    },

    rent: {
      monthlyRent: 2300,
      annualRent: 27600, // Using 2024 annual rent
    },

    expenseHistory: [
      // 2023 Expenses
      { id: 'tretti-2023-insurance', date: '2023-01-15', amount: 179, category: 'Insurance', description: 'Property insurance' },
      { id: 'tretti-2023-interest', date: '2023-06-01', amount: 4863.71, category: 'Other', description: 'Interest & bank charges' },
      { id: 'tretti-2023-professional', date: '2023-03-15', amount: 1864.57, category: 'Professional Fees', description: 'Professional fees' },
      { id: 'tretti-2023-maintenance', date: '2023-08-15', amount: 0, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'tretti-2023-tax', date: '2023-01-15', amount: 0, category: 'Property Tax', description: 'Property taxes' },
      { id: 'tretti-2023-other', date: '2023-01-15', amount: 18877.17, category: 'Other', description: 'Other rental expenses' },
      { id: 'tretti-2023-condo', date: '2023-01-15', amount: 1221.15, category: 'Condo Fees', description: 'Condo maintenance fees' },
      
      // 2024 Expenses
      { id: 'tretti-2024-insurance', date: '2024-01-15', amount: 291.85, category: 'Insurance', description: 'Property insurance' },
      { id: 'tretti-2024-interest', date: '2024-06-01', amount: 19266.66, category: 'Other', description: 'Interest & bank charges' },
      { id: 'tretti-2024-professional', date: '2024-03-15', amount: 2712, category: 'Professional Fees', description: 'Professional fees' },
      { id: 'tretti-2024-maintenance', date: '2024-08-15', amount: 0, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'tretti-2024-tax', date: '2024-01-15', amount: 2294.1, category: 'Property Tax', description: 'Property taxes' },
      { id: 'tretti-2024-condo', date: '2024-01-15', amount: 5204.88, category: 'Condo Fees', description: 'Condo maintenance fees' },
      
      // 2025 Expenses
      { id: 'tretti-2025-insurance', date: '2025-01-15', amount: 552.96, category: 'Insurance', description: 'Property insurance' },
      { id: 'tretti-2025-interest', date: '2025-06-01', amount: 0, category: 'Other', description: 'Interest & bank charges' },
      { id: 'tretti-2025-professional', date: '2025-03-15', amount: 0, category: 'Professional Fees', description: 'Professional fees' },
      { id: 'tretti-2025-maintenance', date: '2025-08-15', amount: 0, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'tretti-2025-tax', date: '2025-01-15', amount: 0, category: 'Property Tax', description: 'Property taxes' },
      { id: 'tretti-2025-condo', date: '2025-01-15', amount: 0, category: 'Condo Fees', description: 'Condo maintenance fees' },
    ],

    tenant: {
      name: 'Pratikkumar Chaudary',
      leaseStartDate: '2024-07-01',
      leaseEndDate: 'Active',
      rent: 2300,
      status: 'Active'
    },

    // Calculated fields
    totalInvestment: 157904, // down payment (89732) + closingCosts (68086) + initialRenovations (0)
    appreciation: 101382, // currentMarketValue - purchasePrice
    monthlyPropertyTax: 191.18, // 2294.1 / 12 (using 2024 data)
    monthlyCondoFees: 433.74, // 5204.88 / 12 (using 2024 data)
    monthlyInsurance: 46.08, // 552.96 / 12 (using 2025 data)
    monthlyMaintenance: 0,
    monthlyProfessionalFees: 0,
    
    monthlyExpenses: {
      propertyTax: 191.18,
      condoFees: 433.74,
      insurance: 46.08,
      maintenance: 0,
      professionalFees: 0,
      mortgagePayment: 0, // Will be calculated below
      mortgageInterest: 0, // Will be calculated below
      mortgagePrincipal: 0, // Will be calculated below
      total: 671.00 // Will be recalculated below
    },
    
    monthlyCashFlow: 1629.00, // monthlyRent - monthlyExpenses.total (will be recalculated)
    annualCashFlow: 19548, // monthlyCashFlow * 12
    capRate: 5.0, // (annualRent / currentMarketValue) * 100 = (27600 / 550000) * 100
    occupancy: 100,
    
    // Additional fields for compatibility
    name: 'Tretti Way',
    type: 'Condo',
    units: 1,
    bedrooms: [2],
    bathrooms: [2],
    squareFootage: 553,
    currentValue: 550000,
    imageUrl: '/images/30 Tretti Way.png',
    tenants: [
      {
        name: 'Honey Goyal',
        unit: 'Unit 317',
        rent: 2083.33, // 25000 / 12
        leaseStart: '2023-03-10',
        leaseEnd: '2024-06-30',
        status: 'Vacant'
      },
      {
        name: 'Pratikkumar Chaudary',
        unit: 'Unit 317',
        rent: 2300,
        leaseStart: '2024-07-01',
        leaseEnd: 'Active',
        status: 'Active'
      }
    ]
  },
  
  // Wilson Avenue - 500-415
  {
    id: 'wilson-ave-415',
    nickname: 'Wilson Ave',
    address: '500-415 Wilson Avenue, Toronto, ON M3H 0E5',
    purchasePrice: 533379.47,
    purchaseDate: '2025-01-22',
    closingCosts: 53241.9,
    initialRenovations: 0,
    renovationCosts: 0,
    currentMarketValue: 550000,
    yearBuilt: 2025,
    propertyType: 'Condo',
    size: 557,
    unitConfig: '2 Bed, 2 Bath',
    
    mortgage: {
      lender: 'RBC',
      originalAmount: 426382.1,
      interestRate: 0.0445, // 4.45% as decimal
      rateType: 'Fixed',
      termMonths: 36,
      amortizationYears: 30, // 360 months
      paymentFrequency: 'Monthly',
      startDate: '2025-01-22',
    },

    rent: {
      monthlyRent: 2400,
      annualRent: 28800, // Using 2025 annual rent
    },

    expenseHistory: [
      // 2024 Expenses
      { id: 'wilson-2024-insurance', date: '2024-01-15', amount: 710, category: 'Insurance', description: 'Property insurance' },
      { id: 'wilson-2024-professional', date: '2024-03-15', amount: 2712, category: 'Professional Fees', description: 'Professional fees' },
      { id: 'wilson-2024-maintenance', date: '2024-08-15', amount: 253.9, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'wilson-2024-utilities', date: '2024-01-15', amount: 175.96, category: 'Other', description: 'Utilities' },
      { id: 'wilson-2024-other', date: '2024-01-15', amount: 28483.62, category: 'Other', description: 'Other rental expenses' },
      
      // 2025 Expenses
      { id: 'wilson-2025-insurance', date: '2025-01-15', amount: 0, category: 'Insurance', description: 'Property insurance' },
      { id: 'wilson-2025-professional', date: '2025-03-15', amount: 0, category: 'Professional Fees', description: 'Professional fees' },
      { id: 'wilson-2025-maintenance', date: '2025-08-15', amount: 0, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'wilson-2025-tax', date: '2025-01-15', amount: 0, category: 'Property Tax', description: 'Property taxes' },
    ],

    tenant: {
      name: 'Aanal Shah, Kavya Gandhi, Parth Patel',
      leaseStartDate: '2025-07-01',
      leaseEndDate: '2025-08-31',
      rent: 2400,
      status: 'Active'
    },

    // Calculated fields
    totalInvestment: 160239.27, // down payment (106757.37) + closingCosts (53241.9) + initialRenovations (0)
    appreciation: 16620.53, // currentMarketValue - purchasePrice
    monthlyPropertyTax: 0, // No 2025 data available
    monthlyCondoFees: 0, // No 2025 data available
    monthlyInsurance: 59.17, // 710 / 12 (using 2024 data)
    monthlyMaintenance: 21.16, // 253.9 / 12 (using 2024 data)
    monthlyProfessionalFees: 0,
    
    monthlyExpenses: {
      propertyTax: 0,
      condoFees: 0,
      insurance: 59.17,
      maintenance: 21.16,
      professionalFees: 0,
      mortgagePayment: 0, // Will be calculated below
      mortgageInterest: 0, // Will be calculated below
      mortgagePrincipal: 0, // Will be calculated below
      total: 80.33 // Will be recalculated below
    },
    
    monthlyCashFlow: 2319.67, // monthlyRent - monthlyExpenses.total (will be recalculated)
    annualCashFlow: 27836, // monthlyCashFlow * 12
    capRate: 5.2, // (annualRent / currentMarketValue) * 100 = (28800 / 550000) * 100
    occupancy: 100,
    
    // Additional fields for compatibility
    name: 'Wilson Ave',
    type: 'Condo',
    units: 1,
    bedrooms: [2],
    bathrooms: [2],
    squareFootage: 557,
    currentValue: 550000,
    imageUrl: '/images/500 Wilson Ave.png',
    tenants: [
      {
        name: 'Aanal Shah, Kavya Gandhi, Parth Patel',
        unit: 'Unit 415',
        rent: 2400,
        leaseStart: '2025-07-01',
        leaseEnd: '2025-08-31',
        status: 'Active'
      }
    ]
  }
];

// Calculate mortgage payments for each property and update monthly expenses
// This will run in the browser environment where the mortgage calculator is available
if (typeof window !== 'undefined') {
  scProperties.forEach(property => {
    try {
      // Calculate mortgage payments
      const mortgagePayment = getMonthlyMortgagePayment(property.mortgage);
      const mortgageInterest = getMonthlyMortgageInterest(property.mortgage);
      const mortgagePrincipal = getMonthlyMortgagePrincipal(property.mortgage);
      
      // Update monthly expenses
      property.monthlyExpenses.mortgagePayment = mortgagePayment;
      property.monthlyExpenses.mortgageInterest = mortgageInterest;
      property.monthlyExpenses.mortgagePrincipal = mortgagePrincipal;
      
      // Use standardized financial calculations
      const annualOperatingExpenses = calculateAnnualOperatingExpenses(property);
      const noi = calculateNOI(property);
      const capRate = calculateCapRate(property);
      const monthlyCashFlow = calculateMonthlyCashFlow(property);
      const annualCashFlow = calculateAnnualCashFlow(property);
      const cashOnCashReturn = calculateCashOnCashReturn(property);
      
      // Update property with standardized calculations
      property.annualOperatingExpenses = annualOperatingExpenses;
      property.netOperatingIncome = noi;
      property.capRate = capRate;
      property.monthlyCashFlow = monthlyCashFlow;
      property.annualCashFlow = annualCashFlow;
      property.cashOnCashReturn = cashOnCashReturn;
      
      // Recalculate total monthly expenses (including mortgage for cash flow calculation)
      const monthlyOperatingExpenses = annualOperatingExpenses / 12;
      property.monthlyExpenses.total = monthlyOperatingExpenses + property.monthlyExpenses.mortgagePayment;
      
    } catch (error) {
      console.warn(`Error calculating mortgage payments for ${property.id}:`, error);
      // Keep default values if calculation fails
    }
  });
}

// Helper function to get property by ID
export const getSCPropertyById = (id, propertyList = scProperties) => {
  const list = Array.isArray(propertyList) ? propertyList : scProperties;
  return list.find(property => property.id === id);
};

// Helper function to get all SC properties
export const getAllSCProperties = () => {
  return scProperties;
};
