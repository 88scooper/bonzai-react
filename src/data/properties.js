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

// Centralized property data source parsed from CSV files
// Updated with realistic Toronto investment property data
export const properties = [
  {
    id: 'first-st-1',
    nickname: 'King West Condo',
    address: '245 King Street West, Unit 1205, Toronto, ON M5V 1J4',
    purchasePrice: 550000,
    purchaseDate: '2021-01-01',
    closingCosts: 22000, // 4% of purchase price
    initialRenovations: 0,
    renovationCosts: 0,
    currentMarketValue: 625000,
    yearBuilt: 2019,
    propertyType: 'Condo',
    size: 800, // square feet
    unitConfig: '2 Bed, 2 Bath',
    
    mortgage: {
      lender: 'TD Canada Trust',
      originalAmount: 440000, // 80% LTV
      interestRate: 0.025, // 2.5% as decimal (realistic for 2021)
      rateType: 'Fixed',
      termMonths: 60, // 5 years
      amortizationYears: 30, // 360 months
      paymentFrequency: 'Monthly',
      startDate: '2021-01-01',
    },

    rent: {
      monthlyRent: 3200, // Realistic for downtown 2 bed, 2 bath
      annualRent: 38400, // 3200 * 12
    },

    expenseHistory: [
      // 2021 Expenses
      { id: 'first-2021-insurance', date: '2021-01-15', amount: 450, category: 'Insurance', description: 'Property insurance' },
      { id: 'first-2021-interest', date: '2021-06-01', amount: 11000, category: 'Other', description: 'Interest & bank charges' },
      { id: 'first-2021-professional', date: '2021-03-15', amount: 2500, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'first-2021-maintenance', date: '2021-08-15', amount: 300, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'first-2021-tax', date: '2021-01-15', amount: 2475, category: 'Property Tax', description: 'Property taxes' },
      { id: 'first-2021-management', date: '2021-01-15', amount: 3840, category: 'Other', description: 'Property management fees (10%)' },
      { id: 'first-2021-condo', date: '2021-01-15', amount: 5040, category: 'Condo Fees', description: 'Condo maintenance fees ($0.60/sqft)' },
      
      // 2022 Expenses
      { id: 'first-2022-insurance', date: '2022-01-15', amount: 470, category: 'Insurance', description: 'Property insurance' },
      { id: 'first-2022-interest', date: '2022-06-01', amount: 10750, category: 'Other', description: 'Interest & bank charges' },
      { id: 'first-2022-professional', date: '2022-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'first-2022-maintenance', date: '2022-08-15', amount: 350, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'first-2022-tax', date: '2022-01-15', amount: 2600, category: 'Property Tax', description: 'Property taxes' },
      { id: 'first-2022-management', date: '2022-01-15', amount: 3840, category: 'Other', description: 'Property management fees (10%)' },
      { id: 'first-2022-condo', date: '2022-01-15', amount: 5280, category: 'Condo Fees', description: 'Condo maintenance fees' },
      
      // 2023 Expenses
      { id: 'first-2023-insurance', date: '2023-01-15', amount: 490, category: 'Insurance', description: 'Property insurance' },
      { id: 'first-2023-interest', date: '2023-06-01', amount: 10500, category: 'Other', description: 'Interest & bank charges' },
      { id: 'first-2023-professional', date: '2023-03-15', amount: 2800, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'first-2023-maintenance', date: '2023-08-15', amount: 400, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'first-2023-tax', date: '2023-01-15', amount: 2725, category: 'Property Tax', description: 'Property taxes' },
      { id: 'first-2023-management', date: '2023-01-15', amount: 3840, category: 'Other', description: 'Property management fees (10%)' },
      { id: 'first-2023-condo', date: '2023-01-15', amount: 5520, category: 'Condo Fees', description: 'Condo maintenance fees' },
      
      // 2024 Expenses
      { id: 'first-2024-insurance', date: '2024-01-15', amount: 510, category: 'Insurance', description: 'Property insurance' },
      { id: 'first-2024-interest', date: '2024-06-01', amount: 10250, category: 'Other', description: 'Interest & bank charges' },
      { id: 'first-2024-professional', date: '2024-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'first-2024-maintenance', date: '2024-08-15', amount: 450, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'first-2024-tax', date: '2024-01-15', amount: 2850, category: 'Property Tax', description: 'Property taxes' },
      { id: 'first-2024-management', date: '2024-01-15', amount: 3840, category: 'Other', description: 'Property management fees (10%)' },
      { id: 'first-2024-condo', date: '2024-01-15', amount: 5760, category: 'Condo Fees', description: 'Condo maintenance fees' },
      
      // 2025 Expenses
      { id: 'first-2025-insurance', date: '2025-01-15', amount: 530, category: 'Insurance', description: 'Property insurance' },
      { id: 'first-2025-interest', date: '2025-06-01', amount: 10000, category: 'Other', description: 'Interest & bank charges' },
      { id: 'first-2025-professional', date: '2025-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'first-2025-maintenance', date: '2025-08-15', amount: 500, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'first-2025-tax', date: '2025-01-15', amount: 2800, category: 'Property Tax', description: 'Property taxes' },
      { id: 'first-2025-management', date: '2025-01-15', amount: 3840, category: 'Other', description: 'Property management fees (10%)' },
      { id: 'first-2025-condo', date: '2025-01-15', amount: 6000, category: 'Condo Fees', description: 'Condo maintenance fees' },
    ],

    tenant: {
      name: 'Sarah Chen',
      leaseStartDate: '2023-01-01',
      leaseEndDate: 'Active',
      rent: 3200,
      status: 'Active'
    },

    // Calculated fields
    totalInvestment: 132000, // down payment ($110,000) + closingCosts ($22,000) + initial renovations ($0)
    appreciation: 75000, // currentMarketValue - purchasePrice
    monthlyPropertyTax: 233.33, // 2800 / 12
    monthlyCondoFees: 500, // 6000 / 12
    monthlyInsurance: 44.17, // 530 / 12
    monthlyMaintenance: 41.67, // 500 / 12
    monthlyProfessionalFees: 0,
    
    monthlyExpenses: {
      propertyTax: 233.33,
      condoFees: 500,
      insurance: 44.17,
      maintenance: 41.67,
      professionalFees: 0,
      mortgagePayment: 0, // Will be calculated below
      mortgageInterest: 0, // Will be calculated below
      mortgagePrincipal: 0, // Will be calculated below
      total: 819.17 // Will be recalculated below
    },
    
    monthlyCashFlow: 2380.83, // monthlyRent - monthlyExpenses.total (will be recalculated)
    annualCashFlow: 28570, // monthlyCashFlow * 12
    capRate: 6.14, // (annualRent / currentMarketValue) * 100 = (38400 / 625000) * 100
    occupancy: 100,
    
    // Additional fields for compatibility
    name: 'King West Condo',
    type: 'Condo',
    units: 1,
    bedrooms: [2],
    bathrooms: [2],
    squareFootage: 800,
    currentValue: 625000,
    imageUrl: '/images/King West Condo.png',
    tenants: [
      {
        name: 'Michael Park',
        unit: 'Unit 1205',
        rent: 3000,
        leaseStart: '2021-01-01',
        leaseEnd: '2022-12-31',
        status: 'Vacant'
      },
      {
        name: 'Sarah Chen',
        unit: 'Unit 1205',
        rent: 3200,
        leaseStart: '2023-01-01',
        leaseEnd: 'Active',
        status: 'Active'
      }
    ]
  },
  
  {
    id: 'second-dr-1',
    nickname: 'Eglinton Condo',
    address: '150 Eglinton Avenue East, Unit 804, Toronto, ON M4P 1E8',
    purchasePrice: 675000,
    purchaseDate: '2021-01-01',
    closingCosts: 27000, // 4% of purchase price
    initialRenovations: 0,
    renovationCosts: 0,
    currentMarketValue: 720000,
    yearBuilt: 2012,
    propertyType: 'Condo',
    size: 650, // square feet
    unitConfig: '2 Bed, 2 Bath',
    
    mortgage: {
      lender: 'RBC Royal Bank',
      originalAmount: 540000, // 80% LTV
      interestRate: 0.025, // 2.5% as decimal
      rateType: 'Fixed',
      termMonths: 60, // 5 years
      amortizationYears: 30, // 360 months
      paymentFrequency: 'Monthly',
      startDate: '2021-01-01',
    },

    rent: {
      monthlyRent: 2800, // Realistic for midtown 2 bed, 2 bath
      annualRent: 33600, // 2800 * 12
    },

    expenseHistory: [
      // 2021 Expenses
      { id: 'second-2021-insurance', date: '2021-01-15', amount: 520, category: 'Insurance', description: 'Property insurance' },
      { id: 'second-2021-interest', date: '2021-06-01', amount: 13500, category: 'Other', description: 'Interest & bank charges' },
      { id: 'second-2021-professional', date: '2021-03-15', amount: 2500, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'second-2021-maintenance', date: '2021-08-15', amount: 250, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'second-2021-tax', date: '2021-01-15', amount: 3038, category: 'Property Tax', description: 'Property taxes' },
      { id: 'second-2021-management', date: '2021-01-15', amount: 3360, category: 'Other', description: 'Property management fees (10%)' },
      { id: 'second-2021-condo', date: '2021-01-15', amount: 4680, category: 'Condo Fees', description: 'Condo maintenance fees ($0.60/sqft)' },
      
      // 2022 Expenses
      { id: 'second-2022-insurance', date: '2022-01-15', amount: 540, category: 'Insurance', description: 'Property insurance' },
      { id: 'second-2022-interest', date: '2022-06-01', amount: 13200, category: 'Other', description: 'Interest & bank charges' },
      { id: 'second-2022-professional', date: '2022-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'second-2022-maintenance', date: '2022-08-15', amount: 300, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'second-2022-tax', date: '2022-01-15', amount: 3180, category: 'Property Tax', description: 'Property taxes' },
      { id: 'second-2022-management', date: '2022-01-15', amount: 3360, category: 'Other', description: 'Property management fees (10%)' },
      { id: 'second-2022-condo', date: '2022-01-15', amount: 4875, category: 'Condo Fees', description: 'Condo maintenance fees' },
      
      // 2023 Expenses
      { id: 'second-2023-insurance', date: '2023-01-15', amount: 560, category: 'Insurance', description: 'Property insurance' },
      { id: 'second-2023-interest', date: '2023-06-01', amount: 12900, category: 'Other', description: 'Interest & bank charges' },
      { id: 'second-2023-professional', date: '2023-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'second-2023-maintenance', date: '2023-08-15', amount: 350, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'second-2023-tax', date: '2023-01-15', amount: 3325, category: 'Property Tax', description: 'Property taxes' },
      { id: 'second-2023-management', date: '2023-01-15', amount: 3360, category: 'Other', description: 'Property management fees (10%)' },
      { id: 'second-2023-condo', date: '2023-01-15', amount: 5070, category: 'Condo Fees', description: 'Condo maintenance fees' },
      
      // 2024 Expenses
      { id: 'second-2024-insurance', date: '2024-01-15', amount: 580, category: 'Insurance', description: 'Property insurance' },
      { id: 'second-2024-interest', date: '2024-06-01', amount: 12600, category: 'Other', description: 'Interest & bank charges' },
      { id: 'second-2024-professional', date: '2024-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'second-2024-maintenance', date: '2024-08-15', amount: 400, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'second-2024-tax', date: '2024-01-15', amount: 3470, category: 'Property Tax', description: 'Property taxes' },
      { id: 'second-2024-management', date: '2024-01-15', amount: 3360, category: 'Other', description: 'Property management fees (10%)' },
      { id: 'second-2024-condo', date: '2024-01-15', amount: 5265, category: 'Condo Fees', description: 'Condo maintenance fees' },
      
      // 2025 Expenses
      { id: 'second-2025-insurance', date: '2025-01-15', amount: 600, category: 'Insurance', description: 'Property insurance' },
      { id: 'second-2025-interest', date: '2025-06-01', amount: 12300, category: 'Other', description: 'Interest & bank charges' },
      { id: 'second-2025-professional', date: '2025-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'second-2025-maintenance', date: '2025-08-15', amount: 450, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'second-2025-tax', date: '2025-01-15', amount: 3600, category: 'Property Tax', description: 'Property taxes' },
      { id: 'second-2025-management', date: '2025-01-15', amount: 3360, category: 'Other', description: 'Property management fees (10%)' },
      { id: 'second-2025-condo', date: '2025-01-15', amount: 5460, category: 'Condo Fees', description: 'Condo maintenance fees' },
    ],

    tenant: {
      name: 'David Kim',
      leaseStartDate: '2023-01-01',
      leaseEndDate: 'Active',
      rent: 2800,
      status: 'Active'
    },

    // Calculated fields
    totalInvestment: 162000, // down payment ($135,000) + closingCosts ($27,000) + initial renovations ($0)
    appreciation: 45000, // currentMarketValue - purchasePrice
    monthlyPropertyTax: 300, // 3600 / 12
    monthlyCondoFees: 455, // 5460 / 12
    monthlyInsurance: 50, // 600 / 12
    monthlyMaintenance: 37.50, // 450 / 12
    monthlyProfessionalFees: 0,
    
    monthlyExpenses: {
      propertyTax: 300,
      condoFees: 455,
      insurance: 50,
      maintenance: 37.50,
      professionalFees: 0,
      mortgagePayment: 0, // Will be calculated below
      mortgageInterest: 0, // Will be calculated below
      mortgagePrincipal: 0, // Will be calculated below
      total: 842.50 // Will be recalculated below
    },
    
    monthlyCashFlow: 1957.50, // monthlyRent - monthlyExpenses.total (will be recalculated)
    annualCashFlow: 23490, // monthlyCashFlow * 12
    capRate: 4.67, // (annualRent / currentMarketValue) * 100 = (33600 / 720000) * 100
    occupancy: 100,
    
    // Additional fields for compatibility
    name: 'Eglinton Condo',
    type: 'Condo',
    units: 1,
    bedrooms: [2],
    bathrooms: [2],
    squareFootage: 650,
    currentValue: 720000,
    imageUrl: '/images/Eglinton Condo.png',
    tenants: [
      {
        name: 'Lisa Wong',
        unit: 'Unit 804',
        rent: 2600,
        leaseStart: '2021-01-01',
        leaseEnd: '2022-12-31',
        status: 'Vacant'
      },
      {
        name: 'David Kim',
        unit: 'Unit 804',
        rent: 2800,
        leaseStart: '2023-01-01',
        leaseEnd: 'Active',
        status: 'Active'
      }
    ]
  },
  
  {
    id: 'third-ave-1',
    nickname: 'Gerrard Street Multiplex',
    address: '123 Gerrard Street East, Toronto, ON M5A 2E4',
    purchasePrice: 1350000,
    purchaseDate: '2021-01-01',
    closingCosts: 54000, // 4% of purchase price
    initialRenovations: 0,
    renovationCosts: 0,
    currentMarketValue: 1450000,
    yearBuilt: 1975,
    propertyType: 'Multiplex',
    size: 2400, // square feet total (3 units × 800 sq ft)
    unitConfig: '2 Bed, 1 Bath (3 units)',
    
    mortgage: {
      lender: 'ScotiaBank',
      originalAmount: 1080000, // 80% LTV
      interestRate: 0.03, // 3% as decimal
      rateType: 'Fixed',
      termMonths: 60, // 5 years
      amortizationYears: 25, // 25 years
      paymentFrequency: 'Monthly',
      startDate: '2021-01-01',
    },

    rent: {
      monthlyRent: 6600, // 3 units × $2,200 each
      annualRent: 79200, // 6600 * 12
    },

    expenseHistory: [
      // 2021 Expenses
      { id: 'third-2021-insurance', date: '2021-01-15', amount: 1200, category: 'Insurance', description: 'Property insurance' },
      { id: 'third-2021-interest', date: '2021-06-01', amount: 32400, category: 'Other', description: 'Interest & bank charges' },
      { id: 'third-2021-professional', date: '2021-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'third-2021-maintenance', date: '2021-08-15', amount: 1800, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'third-2021-tax', date: '2021-01-15', amount: 6075, category: 'Property Tax', description: 'Property taxes' },
      { id: 'third-2021-management', date: '2021-01-15', amount: 7920, category: 'Other', description: 'Property management fees (10%)' },
      
      // 2022 Expenses
      { id: 'third-2022-insurance', date: '2022-01-15', amount: 1260, category: 'Insurance', description: 'Property insurance' },
      { id: 'third-2022-interest', date: '2022-06-01', amount: 31500, category: 'Other', description: 'Interest & bank charges' },
      { id: 'third-2022-professional', date: '2022-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'third-2022-maintenance', date: '2022-08-15', amount: 2000, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'third-2022-tax', date: '2022-01-15', amount: 6375, category: 'Property Tax', description: 'Property taxes' },
      { id: 'third-2022-management', date: '2022-01-15', amount: 7920, category: 'Other', description: 'Property management fees (10%)' },
      
      // 2023 Expenses
      { id: 'third-2023-insurance', date: '2023-01-15', amount: 1320, category: 'Insurance', description: 'Property insurance' },
      { id: 'third-2023-interest', date: '2023-06-01', amount: 30600, category: 'Other', description: 'Interest & bank charges' },
      { id: 'third-2023-professional', date: '2023-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'third-2023-maintenance', date: '2023-08-15', amount: 2200, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'third-2023-tax', date: '2023-01-15', amount: 6675, category: 'Property Tax', description: 'Property taxes' },
      { id: 'third-2023-management', date: '2023-01-15', amount: 7920, category: 'Other', description: 'Property management fees (10%)' },
      
      // 2024 Expenses
      { id: 'third-2024-insurance', date: '2024-01-15', amount: 1380, category: 'Insurance', description: 'Property insurance' },
      { id: 'third-2024-interest', date: '2024-06-01', amount: 29700, category: 'Other', description: 'Interest & bank charges' },
      { id: 'third-2024-professional', date: '2024-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'third-2024-maintenance', date: '2024-08-15', amount: 2400, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'third-2024-tax', date: '2024-01-15', amount: 6975, category: 'Property Tax', description: 'Property taxes' },
      { id: 'third-2024-management', date: '2024-01-15', amount: 7920, category: 'Other', description: 'Property management fees (10%)' },
      
      // 2025 Expenses
      { id: 'third-2025-insurance', date: '2025-01-15', amount: 1440, category: 'Insurance', description: 'Property insurance' },
      { id: 'third-2025-interest', date: '2025-06-01', amount: 28800, category: 'Other', description: 'Interest & bank charges' },
      { id: 'third-2025-professional', date: '2025-03-15', amount: 0, category: 'Professional Fees', description: 'Legal & accounting fees' },
      { id: 'third-2025-maintenance', date: '2025-08-15', amount: 2600, category: 'Maintenance', description: 'Repairs & maintenance' },
      { id: 'third-2025-tax', date: '2025-01-15', amount: 7200, category: 'Property Tax', description: 'Property taxes' },
      { id: 'third-2025-management', date: '2025-01-15', amount: 7920, category: 'Other', description: 'Property management fees (10%)' },
    ],

    tenant: {
      name: 'Multiple Tenants',
      leaseStartDate: '2021-01-01',
      leaseEndDate: 'Active',
      rent: 6600,
      status: 'Active'
    },

    // Calculated fields
    totalInvestment: 324000, // down payment ($270,000) + closingCosts ($54,000) + initial renovations ($0)
    appreciation: 100000, // currentMarketValue - purchasePrice
    monthlyPropertyTax: 600, // 7200 / 12
    monthlyCondoFees: 0, // No condo fees for multiplex
    monthlyInsurance: 120, // 1440 / 12
    monthlyMaintenance: 216.67, // 2600 / 12
    monthlyProfessionalFees: 0,
    
    monthlyExpenses: {
      propertyTax: 600,
      condoFees: 0,
      insurance: 120,
      maintenance: 216.67,
      professionalFees: 0,
      mortgagePayment: 0, // Will be calculated below
      mortgageInterest: 0, // Will be calculated below
      mortgagePrincipal: 0, // Will be calculated below
      total: 936.67 // Will be recalculated below
    },
    
    monthlyCashFlow: 5663.33, // monthlyRent - monthlyExpenses.total (will be recalculated)
    annualCashFlow: 67960, // monthlyCashFlow * 12
    capRate: 5.46, // (annualRent / currentMarketValue) * 100 = (79200 / 1450000) * 100
    occupancy: 100,
    
    // Additional fields for compatibility
    name: 'Gerrard Street Multiplex',
    type: 'Multiplex',
    units: 3,
    bedrooms: [2, 2, 2],
    bathrooms: [1, 1, 1],
    squareFootage: 2400,
    currentValue: 1450000,
    imageUrl: '/images/Gerrard St Multiplex.png',
    tenants: [
      {
        name: 'James Rodriguez',
        unit: 'Unit 1',
        rent: 2200,
        leaseStart: '2021-01-01',
        leaseEnd: 'Active',
        status: 'Active'
      },
      {
        name: 'Maria Santos',
        unit: 'Unit 2',
        rent: 2200,
        leaseStart: '2021-01-01',
        leaseEnd: 'Active',
        status: 'Active'
      },
      {
        name: 'Ahmed Hassan',
        unit: 'Unit 3',
        rent: 2200,
        leaseStart: '2021-01-01',
        leaseEnd: 'Active',
        status: 'Active'
      }
    ]
  }
];

// Calculate mortgage payments for each property and update monthly expenses
// This will run in the browser environment where the mortgage calculator is available
if (typeof window !== 'undefined') {
  properties.forEach(property => {
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
export const getPropertyById = (id, propertyList = properties) => {
  const list = Array.isArray(propertyList) ? propertyList : properties;
  return list.find(property => property.id === id);
};

// Helper function to get all properties
export const getAllProperties = () => {
  return properties;
};

// Helper function to calculate portfolio metrics
export const getPortfolioMetrics = (propertyList = properties) => {
  const list = Array.isArray(propertyList) ? propertyList : properties;

  if (!list.length) {
    return {
      totalValue: 0,
      totalInvestment: 0,
      totalEquity: 0,
      totalMortgageBalance: 0,
      totalMonthlyRent: 0,
      totalMonthlyOperatingExpenses: 0,
      totalMonthlyDebtService: 0,
      totalMonthlyExpenses: 0,
      totalMonthlyCashFlow: 0,
      totalAnnualOperatingExpenses: 0,
      totalAnnualDebtService: 0,
      netOperatingIncome: 0,
      totalAnnualDeductibleExpenses: 0,
      totalProperties: 0,
      averageCapRate: 0,
      averageOccupancy: 0,
      totalAnnualCashFlow: 0,
      cashOnCashReturn: 0
    };
  }

  const totalValue = list.reduce((sum, property) => {
    const value = Number(property.currentMarketValue) || 0;
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
  const totalInvestment = list.reduce((sum, property) => sum + (property.totalInvestment || 0), 0);
  const totalMonthlyRent = list.reduce((sum, property) => sum + (property.rent?.monthlyRent || 0), 0);
  const totalAnnualOperatingExpenses = list.reduce((sum, property) => {
    return sum + calculateAnnualOperatingExpenses(property);
  }, 0);
  const totalMonthlyOperatingExpenses = totalAnnualOperatingExpenses / 12;
  const totalMonthlyDebtService = list.reduce((sum, property) => {
    return sum + (property.monthlyExpenses?.mortgagePayment || 0);
  }, 0);
  const totalMonthlyExpenses = totalMonthlyOperatingExpenses + totalMonthlyDebtService;
  const totalAnnualDebtService = totalMonthlyDebtService * 12;
  const totalMonthlyCashFlow = list.reduce((sum, property) => sum + (property.monthlyCashFlow || 0), 0);
  
  // Calculate current mortgage balance using accurate calculation
  let totalMortgageBalance = 0;
  
  // Use accurate calculation for browser environment
  if (typeof window !== 'undefined' && getCurrentMortgageBalance) {
    totalMortgageBalance = list.reduce((sum, property) => {
      try {
        return sum + getCurrentMortgageBalance(property.mortgage);
      } catch (error) {
        console.warn(`Error calculating mortgage balance for ${property.id}:`, error);
        return sum + (property.mortgage?.originalAmount || 0);
      }
    }, 0);
  } else {
    // Fallback: use original amount if calculation not available
    totalMortgageBalance = list.reduce((sum, property) => {
      return sum + (property.mortgage?.originalAmount || 0);
    }, 0);
  }
  
  
  const totalEquity = totalValue - totalMortgageBalance;
  
  // Calculate total annual operating expenses (excluding mortgage payments) using standardized calculation
  // Calculate Net Operating Income (NOI) = Total Annual Income - Total Annual Operating Expenses
  const netOperatingIncome = (totalMonthlyRent * 12) - totalAnnualOperatingExpenses;
  
  // Calculate total annual deductible expenses (operating expenses + mortgage interest)
  let totalAnnualDeductibleExpenses = 0;
  
  // Use accurate calculation for browser environment
  if (typeof window !== 'undefined' && getAnnualMortgageInterest && calculateAnnualOperatingExpenses) {
    totalAnnualDeductibleExpenses = list.reduce((sum, property) => {
      try {
        // Calculate annual operating expenses (excluding mortgage principal)
        const annualOperatingExpenses = calculateAnnualOperatingExpenses(property);
        
        // Calculate accurate annual mortgage interest from schedule
        const annualMortgageInterest = getAnnualMortgageInterest(property.mortgage);
        
        return sum + annualOperatingExpenses + annualMortgageInterest;
      } catch (error) {
        console.warn(`Error calculating deductible expenses for ${property.id}:`, error);
        // Fallback to simplified calculation
        const annualOperatingExpenses = 
          (property.monthlyExpenses?.propertyTax || 0) * 12 +
          (property.monthlyExpenses?.condoFees || 0) * 12 +
          (property.monthlyExpenses?.insurance || 0) * 12 +
          (property.monthlyExpenses?.maintenance || 0) * 12 +
          (property.monthlyExpenses?.professionalFees || 0) * 12 +
          (property.monthlyExpenses?.utilities || 0) * 12;
        const estimatedAnnualMortgageInterest = (property.mortgage?.originalAmount || 0) * (property.mortgage?.interestRate || 0);
        return sum + annualOperatingExpenses + estimatedAnnualMortgageInterest;
      }
    }, 0);
  } else {
    // Fallback: use simplified calculation if utilities not available
    totalAnnualDeductibleExpenses = list.reduce((sum, property) => {
      const annualOperatingExpenses = 
        (property.monthlyExpenses?.propertyTax || 0) * 12 +
        (property.monthlyExpenses?.condoFees || 0) * 12 +
        (property.monthlyExpenses?.insurance || 0) * 12 +
        (property.monthlyExpenses?.maintenance || 0) * 12 +
        (property.monthlyExpenses?.professionalFees || 0) * 12 +
        (property.monthlyExpenses?.utilities || 0) * 12;
      const estimatedAnnualMortgageInterest = (property.mortgage?.originalAmount || 0) * (property.mortgage?.interestRate || 0);
      return sum + annualOperatingExpenses + estimatedAnnualMortgageInterest;
    }, 0);
  }
  
  return {
    totalValue,
    totalInvestment,
    totalEquity,
    totalMortgageBalance,
    totalMonthlyRent,
    totalMonthlyOperatingExpenses,
    totalMonthlyDebtService,
    totalMonthlyExpenses,
    totalMonthlyCashFlow,
    totalAnnualOperatingExpenses,
    totalAnnualDebtService,
    netOperatingIncome,
    totalAnnualDeductibleExpenses,
    totalProperties: list.length,
    averageCapRate: list.length
      ? list.reduce((sum, property) => sum + (property.capRate || 0), 0) / list.length
      : 0,
    averageOccupancy: list.length
      ? list.reduce((sum, property) => sum + (property.occupancy || 0), 0) / list.length
      : 0,
    totalAnnualCashFlow: totalMonthlyCashFlow * 12,
    cashOnCashReturn: totalInvestment
      ? (totalMonthlyCashFlow * 12 / totalInvestment) * 100
      : 0
  };
};
