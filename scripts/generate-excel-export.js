/**
 * Generate an Excel file from the JSON export
 * 
 * Usage: node scripts/generate-excel-export.js [json-file-path]
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Helper to format currency (returns number for Excel)
function formatCurrencyValue(value) {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? parseFloat(value) : value;
}

// Helper to format date for Excel
function formatDateForExcel(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date;
}

/**
 * Main function to generate Excel workbook
 */
function generateExcel(jsonPath) {
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(jsonContent);

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // ===== SUMMARY SHEET =====
  const summaryData = [
    ['Demo Account Properties Export'],
    [],
    ['Export Information'],
    ['Export Date', formatDateForExcel(data.exportInfo.exportedAt)],
    ['User Email', data.user.email],
    ['User ID', data.user.id],
    [],
    ['Summary Statistics'],
    ['Total Accounts', data.summary.totalAccounts],
    ['Total Properties', data.summary.totalProperties],
    ['Total Mortgages', data.summary.totalMortgages],
    ['Total Expenses', data.summary.totalExpenses],
    ['Total Expense Amount', formatCurrencyValue(data.summary.totalExpenseAmount)],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Set column widths for summary
  summarySheet['!cols'] = [
    { wch: 25 },
    { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // ===== ACCOUNTS SHEET =====
  const accountsData = [
    ['ID', 'Name', 'Email', 'Is Demo', 'User ID', 'Created At', 'Updated At']
  ];

  data.accounts.forEach(account => {
    accountsData.push([
      account.id,
      account.name,
      account.email || '',
      account.isDemo ? 'Yes' : 'No',
      account.userId,
      formatDateForExcel(account.createdAt),
      formatDateForExcel(account.updatedAt),
    ]);
  });

  const accountsSheet = XLSX.utils.aoa_to_sheet(accountsData);
  accountsSheet['!cols'] = [
    { wch: 36 }, // ID
    { wch: 20 }, // Name
    { wch: 30 }, // Email
    { wch: 10 }, // Is Demo
    { wch: 36 }, // User ID
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
  ];
  XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Accounts');

  // ===== PROPERTIES SHEET =====
  const propertiesData = [
    [
      'ID', 'Account ID', 'Nickname', 'Address', 'Property Type',
      'Year Built', 'Size (sq ft)', 'Unit Config',
      'Purchase Price', 'Purchase Date', 'Closing Costs',
      'Renovation Costs', 'Initial Renovations', 'Current Market Value',
      'Total Investment', 'Appreciation', 'Appreciation %',
      'Monthly Rent', 'Annual Rent', 'Units',
      'Created At', 'Updated At'
    ]
  ];

  data.properties.forEach(property => {
    const totalInvestment = (formatCurrencyValue(property.purchasePrice) || 0) +
                           (formatCurrencyValue(property.closingCosts) || 0) +
                           (formatCurrencyValue(property.renovationCosts) || 0) +
                           (formatCurrencyValue(property.initialRenovations) || 0);
    
    const purchasePrice = formatCurrencyValue(property.purchasePrice) || 0;
    const marketValue = formatCurrencyValue(property.currentMarketValue) || 0;
    const appreciation = marketValue - purchasePrice;
    const appreciationPercent = purchasePrice > 0 ? (appreciation / purchasePrice) : 0;

    const monthlyRent = property.propertyData?.rent?.monthlyRent || null;
    const annualRent = property.propertyData?.rent?.annualRent || null;
    const units = property.propertyData?.units || null;

    propertiesData.push([
      property.id,
      property.accountId,
      property.nickname || '',
      property.address || '',
      property.propertyType || '',
      property.yearBuilt,
      formatCurrencyValue(property.size),
      property.unitConfig || '',
      formatCurrencyValue(property.purchasePrice),
      formatDateForExcel(property.purchaseDate),
      formatCurrencyValue(property.closingCosts),
      formatCurrencyValue(property.renovationCosts),
      formatCurrencyValue(property.initialRenovations),
      formatCurrencyValue(property.currentMarketValue),
      totalInvestment,
      appreciation,
      appreciationPercent,
      formatCurrencyValue(monthlyRent),
      formatCurrencyValue(annualRent),
      units,
      formatDateForExcel(property.createdAt),
      formatDateForExcel(property.updatedAt),
    ]);
  });

  const propertiesSheet = XLSX.utils.aoa_to_sheet(propertiesData);
  propertiesSheet['!cols'] = [
    { wch: 36 }, // ID
    { wch: 36 }, // Account ID
    { wch: 25 }, // Nickname
    { wch: 40 }, // Address
    { wch: 15 }, // Property Type
    { wch: 12 }, // Year Built
    { wch: 12 }, // Size
    { wch: 20 }, // Unit Config
    { wch: 15 }, // Purchase Price
    { wch: 15 }, // Purchase Date
    { wch: 15 }, // Closing Costs
    { wch: 18 }, // Renovation Costs
    { wch: 20 }, // Initial Renovations
    { wch: 18 }, // Current Market Value
    { wch: 18 }, // Total Investment
    { wch: 15 }, // Appreciation
    { wch: 15 }, // Appreciation %
    { wch: 15 }, // Monthly Rent
    { wch: 15 }, // Annual Rent
    { wch: 10 }, // Units
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
  ];
  XLSX.utils.book_append_sheet(workbook, propertiesSheet, 'Properties');

  // ===== MORTGAGES SHEET =====
  const mortgagesData = [
    [
      'ID', 'Property ID', 'Property Nickname', 'Lender',
      'Original Amount', 'Current Balance', 'Interest Rate',
      'Rate Type', 'Term (Months)', 'Amortization (Years)',
      'Payment Frequency', 'Payment Amount', 'Start Date',
      'Created At', 'Updated At'
    ]
  ];

  data.properties.forEach(property => {
    if (property.mortgages && property.mortgages.length > 0) {
      property.mortgages.forEach(mortgage => {
        mortgagesData.push([
          mortgage.id,
          mortgage.propertyId,
          property.nickname || '',
          mortgage.lender || '',
          formatCurrencyValue(mortgage.originalAmount),
          formatCurrencyValue(mortgage.mortgageData?.currentBalance),
          formatCurrencyValue(mortgage.interestRate),
          mortgage.rateType || '',
          mortgage.termMonths,
          mortgage.amortizationYears,
          mortgage.paymentFrequency || '',
          formatCurrencyValue(mortgage.mortgageData?.paymentAmount),
          formatDateForExcel(mortgage.startDate),
          formatDateForExcel(mortgage.createdAt),
          formatDateForExcel(mortgage.updatedAt),
        ]);
      });
    }
  });

  const mortgagesSheet = XLSX.utils.aoa_to_sheet(mortgagesData);
  mortgagesSheet['!cols'] = [
    { wch: 36 }, // ID
    { wch: 36 }, // Property ID
    { wch: 25 }, // Property Nickname
    { wch: 20 }, // Lender
    { wch: 18 }, // Original Amount
    { wch: 18 }, // Current Balance
    { wch: 15 }, // Interest Rate
    { wch: 12 }, // Rate Type
    { wch: 15 }, // Term (Months)
    { wch: 20 }, // Amortization (Years)
    { wch: 18 }, // Payment Frequency
    { wch: 15 }, // Payment Amount
    { wch: 15 }, // Start Date
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
  ];
  XLSX.utils.book_append_sheet(workbook, mortgagesSheet, 'Mortgages');

  // ===== EXPENSES SHEET =====
  const expensesData = [
    [
      'ID', 'Property ID', 'Property Nickname', 'Date',
      'Amount', 'Category', 'Description',
      'Created At', 'Updated At'
    ]
  ];

  data.properties.forEach(property => {
    if (property.expenses && property.expenses.length > 0) {
      property.expenses.forEach(expense => {
        expensesData.push([
          expense.id,
          expense.propertyId,
          property.nickname || '',
          formatDateForExcel(expense.date),
          formatCurrencyValue(expense.amount),
          expense.category || '',
          expense.description || '',
          formatDateForExcel(expense.createdAt),
          formatDateForExcel(expense.updatedAt),
        ]);
      });
    }
  });

  const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
  expensesSheet['!cols'] = [
    { wch: 36 }, // ID
    { wch: 36 }, // Property ID
    { wch: 25 }, // Property Nickname
    { wch: 15 }, // Date
    { wch: 15 }, // Amount
    { wch: 20 }, // Category
    { wch: 40 }, // Description
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
  ];
  XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');

  // ===== TENANTS SHEET =====
  const tenantsData = [
    [
      'Property ID', 'Property Nickname', 'Tenant Name',
      'Unit', 'Rent', 'Status',
      'Lease Start', 'Lease End'
    ]
  ];

  data.properties.forEach(property => {
    if (property.propertyData?.tenants && property.propertyData.tenants.length > 0) {
      property.propertyData.tenants.forEach(tenant => {
        tenantsData.push([
          property.id,
          property.nickname || '',
          tenant.name || '',
          tenant.unit || '',
          formatCurrencyValue(tenant.rent),
          tenant.status || '',
          formatDateForExcel(tenant.leaseStart),
          formatDateForExcel(tenant.leaseEnd),
        ]);
      });
    }
  });

  if (tenantsData.length > 1) {
    const tenantsSheet = XLSX.utils.aoa_to_sheet(tenantsData);
    tenantsSheet['!cols'] = [
      { wch: 36 }, // Property ID
      { wch: 25 }, // Property Nickname
      { wch: 20 }, // Tenant Name
      { wch: 15 }, // Unit
      { wch: 15 }, // Rent
      { wch: 15 }, // Status
      { wch: 15 }, // Lease Start
      { wch: 15 }, // Lease End
    ];
    XLSX.utils.book_append_sheet(workbook, tenantsSheet, 'Tenants');
  }

  return workbook;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  let jsonPath;

  if (args.length > 0) {
    jsonPath = args[0];
  } else {
    // Find the most recent export file
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      console.error('Error: exports directory not found');
      process.exit(1);
    }

    const files = fs.readdirSync(exportsDir)
      .filter(f => f.startsWith('demo-properties-export-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.error('Error: No export files found in exports directory');
      process.exit(1);
    }

    jsonPath = path.join(exportsDir, files[0]);
    console.log(`Using most recent export: ${files[0]}\n`);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: File not found: ${jsonPath}`);
    process.exit(1);
  }

  try {
    const workbook = generateExcel(jsonPath);
    
    // Write to file
    const outputDir = path.dirname(jsonPath);
    const baseName = path.basename(jsonPath, '.json');
    const outputPath = path.join(outputDir, `${baseName}.xlsx`);
    
    XLSX.writeFile(workbook, outputPath);
    
    console.log(`✅ Excel file generated successfully!`);
    console.log(`📊 Output: ${outputPath}\n`);
    
    // Print summary
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(jsonContent);
    console.log('Workbook contains:');
    console.log(`  - Summary sheet`);
    console.log(`  - Accounts sheet (${data.accounts.length} accounts)`);
    console.log(`  - Properties sheet (${data.properties.length} properties)`);
    console.log(`  - Mortgages sheet (${data.summary.totalMortgages} mortgages)`);
    console.log(`  - Expenses sheet (${data.summary.totalExpenses} expenses)`);
    if (data.properties.some(p => p.propertyData?.tenants?.length > 0)) {
      const totalTenants = data.properties.reduce((sum, p) => 
        sum + (p.propertyData?.tenants?.length || 0), 0);
      console.log(`  - Tenants sheet (${totalTenants} tenants)`);
    }
  } catch (error) {
    console.error('❌ Error generating Excel file:', error.message);
    console.error(error);
    process.exit(1);
  }
}

module.exports = { generateExcel };
