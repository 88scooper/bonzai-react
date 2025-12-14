// Utility to parse CSV files and convert them to property objects
// Supports both the template format and the simpler format

export function parseCSVToProperty(csvText, propertyId) {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
  
  // Try to detect format - template format has "Section,Field" header
  const isTemplateFormat = lines[0]?.includes('Section,Field');
  
  if (isTemplateFormat) {
    return parseTemplateFormatCSV(csvText, propertyId);
  } else {
    return parseSimpleFormatCSV(csvText, propertyId);
  }
}

function parseTemplateFormatCSV(csvText, propertyId) {
  // Parse the template format CSV
  const lines = csvText.split('\n');
  const data = {};
  
  // Skip header row and parse data
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const parts = parseCSVLine(line);
    if (parts.length < 6) continue;
    
    const section = parts[0];
    const field = parts[1];
    const value = parts[5]; // Property 1 column
    
    if (!value || value.trim() === '') continue;
    
    // Store the value with section and field as key
    const key = `${section}_${field}`;
    data[key] = value.trim();
  }
  
  return buildPropertyFromTemplateData(data, propertyId);
}

function parseSimpleFormatCSV(csvText, propertyId) {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
  const data = {};
  let currentSection = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = parseCSVLine(line);
    
    if (parts.length === 0) continue;
    
    // Detect section headers
    if (parts[0] && parts[1] === '') {
      currentSection = parts[0].toLowerCase().replace(/\s+/g, '_');
      continue;
    }
    
    // Parse data rows
    if (parts.length >= 2) {
      const key = parts[0].toLowerCase().replace(/\s+/g, '_');
      const value = parts[1];
      
      if (value && value.trim() !== '') {
        data[`${currentSection}_${key}`] = value.trim();
      }
    }
  }
  
  // Parse annual income/expense tables
  parseAnnualTables(lines, data);
  
  return buildPropertyFromSimpleData(data, propertyId);
}

function parseAnnualTables(lines, data) {
  let inIncomeTable = false;
  let inExpenseTable = false;
  let yearHeaders = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = parseCSVLine(line);
    
    if (parts[0] === 'Annual Income') {
      inIncomeTable = true;
      inExpenseTable = false;
      yearHeaders = parts.slice(1).filter(h => h && h.trim());
      continue;
    }
    
    if (parts[0] === 'Annual Expenses') {
      inIncomeTable = false;
      inExpenseTable = true;
      yearHeaders = parts.slice(1).filter(h => h && h.trim());
      continue;
    }
    
    if (inIncomeTable || inExpenseTable) {
      if (parts.length < 2) {
        inIncomeTable = false;
        inExpenseTable = false;
        continue;
      }
      
      const category = parts[0].toLowerCase().replace(/\s+/g, '_');
      const values = parts.slice(1);
      
      const annualData = {};
      yearHeaders.forEach((year, idx) => {
        if (values[idx] && values[idx].trim()) {
          annualData[year] = parseNumber(values[idx]);
        }
      });
      
      if (inIncomeTable) {
        data[`annual_income_${category}`] = annualData;
      } else {
        data[`annual_expenses_${category}`] = annualData;
      }
    }
  }
}

function parseCSVLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  parts.push(current.trim());
  return parts;
}

function parseNumber(value) {
  if (!value) return 0;
  // Remove commas and parse
  const cleaned = String(value).replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function buildPropertyFromSimpleData(data, propertyId) {
  // Build address
  const street = data['address_street'] || '';
  const number = data['property_details_number'] || '';
  const unit = data['address_unit'] || '';
  const city = data['address_city'] || '';
  const postalCode = data['address_postal_code'] || '';
  
  const addressParts = [number, unit, street, city].filter(p => p);
  const address = `${addressParts.join(' ')}, ${city || 'Toronto'}, ON ${postalCode}`;
  
  // Parse purchase date
  const closingDate = data['property_details_closing_date'] || data['property_details_closing_date'] || '';
  const purchaseDate = parseDate(closingDate);
  
  // Build property object
  const property = {
    id: propertyId || `sc-property-${Date.now()}`,
    nickname: street || data['property_details_street'] || 'Property',
    address: address,
    purchasePrice: parseNumber(data['property_details_purchase_price']),
    purchaseDate: purchaseDate,
    closingCosts: parseNumber(data['property_details_closing_costs']),
    initialRenovations: 0,
    renovationCosts: parseNumber(data['property_details_renovation_costs'] || 0),
    currentMarketValue: parseNumber(data['property_details_current_estimated_market_value']),
    yearBuilt: parseInt(data['property_details_year_built'] || '0'),
    propertyType: data['property_details_property_type'] || 'Condo',
    size: parseNumber(data['property_details_size_(sf)']),
    unitConfig: data['property_details_unit_type'] || '',
    
    mortgage: {
      lender: data['mortgage_details_lender_name'] || 'Lender',
      originalAmount: parseNumber(data['mortgage_details_original_loan_amount']),
      interestRate: parseNumber(data['mortgage_details_interest_rate']) / 100, // Convert percentage to decimal
      rateType: data['mortgage_details_rate_type'] || 'Fixed',
      termMonths: parseTermMonths(data['mortgage_details_term']),
      amortizationYears: parseAmortizationYears(data['mortgage_details_amortization_period']),
      paymentFrequency: data['mortgage_details_payment_frequency'] || 'Monthly',
      startDate: parseDate(data['mortgage_details_start_date']),
    },
    
    rent: {
      monthlyRent: parseNumber(data['current_tenant_details_rent']),
      annualRent: 0, // Will be calculated
    },
    
    expenseHistory: buildExpenseHistory(data),
    
    tenant: {
      name: data['current_tenant_details_name'] || '',
      leaseStartDate: parseDate(data['current_tenant_details_lease_start']),
      leaseEndDate: data['current_tenant_details_lease_end'] || 'Active',
      rent: parseNumber(data['current_tenant_details_rent']),
      status: data['current_tenant_details_status'] || 'Active'
    },
    
    // Additional fields
    name: street || 'Property',
    type: data['property_details_property_type'] || 'Condo',
    units: 1,
    bedrooms: [2],
    bathrooms: [2],
    squareFootage: parseNumber(data['property_details_size_(sf)']),
    currentValue: parseNumber(data['property_details_current_estimated_market_value']),
    imageUrl: '',
    tenants: buildTenantHistory(data),
  };
  
  // Calculate annual rent from income data
  if (data['annual_income_rent']) {
    const rentData = data['annual_income_rent'];
    const latestYear = Math.max(...Object.keys(rentData).map(y => parseInt(y)));
    if (rentData[latestYear]) {
      property.rent.annualRent = rentData[latestYear];
      property.rent.monthlyRent = rentData[latestYear] / 12;
    }
  }
  
  // Calculate monthly expenses from annual data
  property.monthlyPropertyTax = (data['annual_expenses_property_taxes']?.['2025'] || 
                                  data['annual_expenses_property_taxes']?.['2024'] || 0) / 12;
  property.monthlyCondoFees = (data['annual_expenses_condo/maintenance_fees']?.['2025'] || 
                               data['annual_expenses_condo/maintenance_fees']?.['2024'] || 0) / 12;
  property.monthlyInsurance = (data['annual_expenses_insurance']?.['2025'] || 
                               data['annual_expenses_insurance']?.['2024'] || 0) / 12;
  property.monthlyMaintenance = (data['annual_expenses_repairs_&_maintenance']?.['2025'] || 
                                 data['annual_expenses_repairs_&_maintenance']?.['2024'] || 0) / 12;
  property.monthlyProfessionalFees = (data['annual_expenses_professional_fees']?.['2025'] || 
                                       data['annual_expenses_professional_fees']?.['2024'] || 0) / 12;
  
  property.monthlyExpenses = {
    propertyTax: property.monthlyPropertyTax,
    condoFees: property.monthlyCondoFees,
    insurance: property.monthlyInsurance,
    maintenance: property.monthlyMaintenance,
    professionalFees: property.monthlyProfessionalFees,
    mortgagePayment: 0, // Will be calculated
    mortgageInterest: 0, // Will be calculated
    mortgagePrincipal: 0, // Will be calculated
    total: 0 // Will be calculated
  };
  
  // Calculate total investment
  const downPayment = property.purchasePrice - property.mortgage.originalAmount;
  property.totalInvestment = downPayment + property.closingCosts + property.initialRenovations + property.renovationCosts;
  property.appreciation = property.currentMarketValue - property.purchasePrice;
  
  return property;
}

function buildExpenseHistory(data) {
  const expenseHistory = [];
  const categories = {
    'insurance': 'Insurance',
    'interest_&_bank_charges': 'Other',
    'professional_fees': 'Professional Fees',
    'repairs_&_maintenance': 'Maintenance',
    'property_taxes': 'Property Tax',
    'motor_vehicle_expenses': 'Other',
    'condo/maintenance_fees': 'Condo Fees',
    'other_rental_expenses': 'Other'
  };
  
  // Get years from any expense category
  let years = [];
  for (const [key, label] of Object.entries(categories)) {
    const expenseData = data[`annual_expenses_${key}`];
    if (expenseData) {
      years = Object.keys(expenseData).map(y => parseInt(y)).sort();
      break;
    }
  }
  
  // Build expense history for each year
  years.forEach(year => {
    for (const [key, category] of Object.entries(categories)) {
      const expenseData = data[`annual_expenses_${key}`];
      if (expenseData && expenseData[year]) {
        expenseHistory.push({
          id: `sc-${year}-${key}`,
          date: `${year}-01-15`,
          amount: expenseData[year],
          category: category,
          description: key.replace(/_/g, ' ')
        });
      }
    }
  });
  
  return expenseHistory;
}

function buildTenantHistory(data) {
  const tenants = [];
  
  // Current tenant
  if (data['current_tenant_details_name']) {
    tenants.push({
      name: data['current_tenant_details_name'],
      unit: 'Unit 1',
      rent: parseNumber(data['current_tenant_details_rent']),
      leaseStart: parseDate(data['current_tenant_details_lease_start']),
      leaseEnd: data['current_tenant_details_lease_end'] || 'Active',
      status: 'Active'
    });
  }
  
  // Historical tenants (if available in data)
  // This would need to be parsed from tenant history section
  
  return tenants;
}

function buildPropertyFromTemplateData(data, propertyId) {
  // Similar structure but parse from template format
  // Implementation would be similar but use different field names
  return buildPropertyFromSimpleData(data, propertyId);
}

function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Try various date formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})-(\w{3})-(\d{2})/, // DD-MMM-YY
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[1]) {
        // DD-MMM-YY format
        const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 
                        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
                        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };
        const month = months[match[2].toLowerCase()];
        const year = '20' + match[3];
        return `${year}-${month}-${match[1].padStart(2, '0')}`;
      } else {
        return dateStr; // Already in correct format
      }
    }
  }
  
  return new Date().toISOString().split('T')[0];
}

function parseTermMonths(termStr) {
  if (!termStr) return 60;
  const match = termStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 60;
}

function parseAmortizationYears(amortStr) {
  if (!amortStr) return 30;
  const match = amortStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 30;
}

