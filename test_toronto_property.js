/**
 * Test Case: $1.2M Toronto Residential Property
 * 
 * Property Details:
 * - Purchase Price: $1,200,000
 * - Location: Toronto, ON
 * - Down Payment: $240,000 (20%)
 * - Mortgage: $960,000 @ 5.5% for 25 years
 * - Monthly Rent: $5,000 ($60,000 annual)
 * - Vacancy Rate: 5%
 * - Operating Expenses: $18,000/year
 * - Closing Costs: $10,000
 * - Initial Renovations: $20,000
 * - Exit Cap Rate: 5.0%
 * - Selling Costs: 5%
 * 
 * EXPECTED CALCULATIONS:
 */

// Note: This test file uses CommonJS require syntax for Node.js compatibility
// In a browser environment, you would use ES6 imports instead

// For testing in Node.js, you would need to:
// 1. Install dependencies: npm install
// 2. Run: node test_toronto_property.js

// Since this is a Next.js project, you may need to adapt this for your testing framework
// or run it in a Node.js environment with proper module resolution

console.log('=== TORONTO PROPERTY TEST CASE ===\n');

// Mock property object for testing
const testProperty = {
  purchasePrice: 1200000,
  currentMarketValue: 1200000,
  address: '123 Main St, Toronto, ON M5H 1A1',
  closingCosts: 10000,
  initialRenovations: 20000,
  renovationCosts: 0,
  rent: {
    monthlyRent: 5000,
    annualRent: 60000
  },
  monthlyExpenses: {
    propertyTax: 800,      // $9,600/year
    insurance: 150,         // $1,800/year
    maintenance: 300,       // $3,600/year
    utilities: 250,         // $3,000/year
    condoFees: 0,
    professionalFees: 0
  },
  mortgage: {
    originalAmount: 960000,
    interestRate: 0.055,    // 5.5%
    amortizationYears: 25,
    paymentFrequency: 'Monthly',
    startDate: '2024-01-01'
  },
  vacancyRate: 0.05  // 5%
};

// Manual calculations for verification
console.log('=== MANUAL CALCULATIONS ===');

// Land Transfer Tax Calculation
// Provincial LTT:
// - 0.5% on first $55,000 = $275
// - 1.0% on $55,001 - $250,000 = $1,950
// - 1.5% on $250,001 - $400,000 = $2,250
// - 2.0% on $400,001 - $1,200,000 = $16,000
// Provincial Total: $20,475
// Municipal (Toronto): Same = $20,475
// Total LTT: $40,950

const expectedLTT = 40950;
console.log(`Expected LTT: $${expectedLTT.toLocaleString()}`);

// Total Investment
const downPayment = testProperty.purchasePrice - testProperty.mortgage.originalAmount;
const expectedTotalInvestment = downPayment + 
                                testProperty.closingCosts + 
                                testProperty.initialRenovations + 
                                testProperty.renovationCosts + 
                                expectedLTT;
console.log(`Down Payment: $${downPayment.toLocaleString()}`);
console.log(`Closing Costs: $${testProperty.closingCosts.toLocaleString()}`);
console.log(`Initial Renovations: $${testProperty.initialRenovations.toLocaleString()}`);
console.log(`Land Transfer Tax: $${expectedLTT.toLocaleString()}`);
console.log(`Expected Total Investment: $${expectedTotalInvestment.toLocaleString()}`);

// NOI with Vacancy
const annualOperatingExpenses = (800 + 150 + 300 + 250) * 12; // $18,000
const potentialGrossIncome = 60000;
const effectiveGrossIncome = potentialGrossIncome * (1 - 0.05); // $57,000
const expectedNOI = effectiveGrossIncome - annualOperatingExpenses; // $39,000

console.log('\n=== NOI CALCULATION (WITH VACANCY) ===');
console.log(`Potential Gross Income: $${potentialGrossIncome.toLocaleString()}`);
console.log(`Vacancy Rate: 5%`);
console.log(`Effective Gross Income: $${effectiveGrossIncome.toLocaleString()}`);
console.log(`Operating Expenses: $${annualOperatingExpenses.toLocaleString()}`);
console.log(`Expected NOI: $${expectedNOI.toLocaleString()}`);

// Cash Flow (simplified - would need mortgage calculator for exact)
// Monthly mortgage payment ≈ $5,900 (approximate for $960k @ 5.5% over 25 years)
// Annual debt service ≈ $70,800
// Annual cash flow = $60,000 - $18,000 - $70,800 = -$28,800 (negative cash flow)

console.log('\n=== TEST INSTRUCTIONS ===');
console.log('To run this test with actual functions:');
console.log('1. Import the functions from src/utils/financialCalculations.js');
console.log('2. Call calculateLandTransferTax(1200000, "Toronto", "ON")');
console.log('3. Verify it returns $40,950');
console.log('4. Call calculateNOI(testProperty) with vacancyRate = 0.05');
console.log('5. Verify it returns $39,000');
console.log('6. Verify totalInvestment includes LTT');
console.log('7. Call calculateIRR(testProperty, 5, 5.0, 5.0) to test exit cap rate method');

console.log('\n=== EXPECTED RESULTS SUMMARY ===');
console.log(`✅ Land Transfer Tax: $${expectedLTT.toLocaleString()}`);
console.log(`✅ Total Investment: $${expectedTotalInvestment.toLocaleString()}`);
console.log(`✅ NOI (with 5% vacancy): $${expectedNOI.toLocaleString()}`);
console.log(`✅ IRR should use Exit Cap Rate method when provided`);
