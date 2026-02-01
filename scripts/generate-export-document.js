/**
 * Generate a readable Markdown document from the JSON export
 * 
 * Usage: node scripts/generate-export-document.js [json-file-path]
 */

const fs = require('fs');
const path = require('path');

// Helper to format currency
function formatCurrency(value) {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Helper to format percentage
function formatPercent(value) {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

// Helper to format date
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-CA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Main function
function generateDocument(jsonPath) {
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(jsonContent);

  let markdown = `# Demo Account Properties Export\n\n`;
  markdown += `**Export Date:** ${formatDate(data.exportInfo.exportedAt)}\n`;
  markdown += `**User:** ${data.user.email}\n`;
  markdown += `**User ID:** ${data.user.id}\n\n`;
  markdown += `---\n\n`;

  // Summary
  markdown += `## Summary\n\n`;
  markdown += `- **Total Accounts:** ${data.summary.totalAccounts}\n`;
  markdown += `- **Total Properties:** ${data.summary.totalProperties}\n`;
  markdown += `- **Total Mortgages:** ${data.summary.totalMortgages}\n`;
  markdown += `- **Total Expenses:** ${data.summary.totalExpenses}\n`;
  markdown += `- **Total Expense Amount:** ${formatCurrency(data.summary.totalExpenseAmount)}\n\n`;
  markdown += `---\n\n`;

  // Accounts
  markdown += `## Accounts\n\n`;
  data.accounts.forEach((account, index) => {
    markdown += `### Account ${index + 1}: ${account.name}\n\n`;
    markdown += `- **ID:** ${account.id}\n`;
    markdown += `- **Email:** ${account.email || 'N/A'}\n`;
    markdown += `- **Is Demo:** ${account.isDemo ? 'Yes' : 'No'}\n`;
    markdown += `- **Created:** ${formatDate(account.createdAt)}\n`;
    markdown += `- **Updated:** ${formatDate(account.updatedAt)}\n\n`;
  });
  markdown += `---\n\n`;

  // Properties
  markdown += `## Properties\n\n`;
  data.properties.forEach((property, index) => {
    markdown += `### Property ${index + 1}: ${property.nickname || 'Unnamed Property'}\n\n`;
    
    // Basic Information
    markdown += `#### Basic Information\n\n`;
    markdown += `- **ID:** ${property.id}\n`;
    markdown += `- **Address:** ${property.address || 'N/A'}\n`;
    markdown += `- **Property Type:** ${property.propertyType || 'N/A'}\n`;
    markdown += `- **Year Built:** ${property.yearBuilt || 'N/A'}\n`;
    markdown += `- **Size:** ${property.size ? `${property.size.toLocaleString()} sq ft` : 'N/A'}\n`;
    markdown += `- **Unit Config:** ${property.unitConfig || 'N/A'}\n\n`;

    // Financial Information
    markdown += `#### Financial Information\n\n`;
    markdown += `- **Purchase Price:** ${formatCurrency(property.purchasePrice)}\n`;
    markdown += `- **Purchase Date:** ${formatDate(property.purchaseDate)}\n`;
    markdown += `- **Closing Costs:** ${formatCurrency(property.closingCosts)}\n`;
    markdown += `- **Renovation Costs:** ${formatCurrency(property.renovationCosts)}\n`;
    markdown += `- **Initial Renovations:** ${formatCurrency(property.initialRenovations)}\n`;
    markdown += `- **Current Market Value:** ${formatCurrency(property.currentMarketValue)}\n\n`;

    // Calculate total investment
    const totalInvestment = (property.purchasePrice || 0) + 
                           (property.closingCosts || 0) + 
                           (property.renovationCosts || 0) + 
                           (property.initialRenovations || 0);
    const appreciation = (property.currentMarketValue || 0) - (property.purchasePrice || 0);
    const appreciationPercent = property.purchasePrice ? (appreciation / property.purchasePrice) : 0;
    
    markdown += `- **Total Investment:** ${formatCurrency(totalInvestment)}\n`;
    markdown += `- **Appreciation:** ${formatCurrency(appreciation)} (${formatPercent(appreciationPercent)})\n\n`;

    // Property Data (if available)
    if (property.propertyData) {
      const pd = property.propertyData;
      if (pd.rent) {
        markdown += `#### Rental Information\n\n`;
        markdown += `- **Monthly Rent:** ${formatCurrency(pd.rent.monthlyRent)}\n`;
        markdown += `- **Annual Rent:** ${formatCurrency(pd.rent.annualRent)}\n\n`;
      }

      if (pd.tenants && pd.tenants.length > 0) {
        markdown += `#### Tenants\n\n`;
        pd.tenants.forEach((tenant, tIndex) => {
          markdown += `**Tenant ${tIndex + 1}:**\n`;
          markdown += `- Name: ${tenant.name || 'N/A'}\n`;
          markdown += `- Unit: ${tenant.unit || 'N/A'}\n`;
          markdown += `- Rent: ${formatCurrency(tenant.rent)}\n`;
          markdown += `- Status: ${tenant.status || 'N/A'}\n`;
          markdown += `- Lease Start: ${formatDate(tenant.leaseStart)}\n`;
          markdown += `- Lease End: ${formatDate(tenant.leaseEnd)}\n\n`;
        });
      }
    }

    // Mortgages
    if (property.mortgages && property.mortgages.length > 0) {
      markdown += `#### Mortgages\n\n`;
      property.mortgages.forEach((mortgage, mIndex) => {
        markdown += `**Mortgage ${mIndex + 1}:**\n`;
        markdown += `- **Lender:** ${mortgage.lender || 'N/A'}\n`;
        markdown += `- **Original Amount:** ${formatCurrency(mortgage.originalAmount)}\n`;
        markdown += `- **Current Balance:** ${mortgage.mortgageData?.currentBalance ? formatCurrency(mortgage.mortgageData.currentBalance) : 'N/A'}\n`;
        markdown += `- **Interest Rate:** ${formatPercent(mortgage.interestRate)}\n`;
        markdown += `- **Rate Type:** ${mortgage.rateType || 'N/A'}\n`;
        markdown += `- **Term:** ${mortgage.termMonths} months\n`;
        markdown += `- **Amortization:** ${mortgage.amortizationYears} years\n`;
        markdown += `- **Payment Frequency:** ${mortgage.paymentFrequency || 'N/A'}\n`;
        markdown += `- **Start Date:** ${formatDate(mortgage.startDate)}\n`;
        if (mortgage.mortgageData?.paymentAmount) {
          markdown += `- **Payment Amount:** ${formatCurrency(mortgage.mortgageData.paymentAmount)}\n`;
        }
        markdown += `\n`;
      });
    } else {
      markdown += `#### Mortgages\n\n`;
      markdown += `No mortgages recorded for this property.\n\n`;
    }

    // Expenses
    if (property.expenses && property.expenses.length > 0) {
      markdown += `#### Expenses (${property.expenses.length} total)\n\n`;
      
      // Group expenses by category
      const expensesByCategory = {};
      property.expenses.forEach(exp => {
        const category = exp.category || 'Uncategorized';
        if (!expensesByCategory[category]) {
          expensesByCategory[category] = [];
        }
        expensesByCategory[category].push(exp);
      });

      Object.keys(expensesByCategory).sort().forEach(category => {
        const categoryExpenses = expensesByCategory[category];
        const categoryTotal = categoryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        
        markdown += `**${category}** (${categoryExpenses.length} expenses, Total: ${formatCurrency(categoryTotal)})\n\n`;
        
        // Show first 10 expenses per category, then summarize
        const displayExpenses = categoryExpenses.slice(0, 10);
        displayExpenses.forEach(exp => {
          markdown += `- ${formatDate(exp.date)}: ${formatCurrency(exp.amount)}`;
          if (exp.description) {
            markdown += ` - ${exp.description}`;
          }
          markdown += `\n`;
        });
        
        if (categoryExpenses.length > 10) {
          markdown += `- ... and ${categoryExpenses.length - 10} more expenses\n`;
        }
        markdown += `\n`;
      });

      const totalExpenses = property.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      markdown += `**Total Expenses for this Property:** ${formatCurrency(totalExpenses)}\n\n`;
    } else {
      markdown += `#### Expenses\n\n`;
      markdown += `No expenses recorded for this property.\n\n`;
    }

    // Timestamps
    markdown += `#### Record Information\n\n`;
    markdown += `- **Created:** ${formatDate(property.createdAt)}\n`;
    markdown += `- **Last Updated:** ${formatDate(property.updatedAt)}\n\n`;

    markdown += `---\n\n`;
  });

  // Footer
  markdown += `\n---\n\n`;
  markdown += `*Document generated on ${new Date().toLocaleString('en-CA')}*\n`;
  markdown += `*Source: ${data.exportInfo.exportedBy}*\n`;

  return markdown;
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
    const markdown = generateDocument(jsonPath);
    
    // Write to file
    const outputDir = path.dirname(jsonPath);
    const baseName = path.basename(jsonPath, '.json');
    const outputPath = path.join(outputDir, `${baseName}.md`);
    
    fs.writeFileSync(outputPath, markdown, 'utf8');
    
    console.log(`✅ Markdown document generated successfully!`);
    console.log(`📄 Output: ${outputPath}\n`);
  } catch (error) {
    console.error('❌ Error generating document:', error.message);
    console.error(error);
    process.exit(1);
  }
}

module.exports = { generateDocument };
