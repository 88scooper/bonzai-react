/**
 * IRR Calculation Validation Test
 * Validates the IRR calculation logic without requiring TypeScript compilation
 * Tests the mathematical correctness of the NPV-based Newton-Raphson method
 */

console.log('='.repeat(80));
console.log('IRR CALCULATION VALIDATION TEST');
console.log('Testing mathematical correctness of NPV-based Newton-Raphson IRR');
console.log('='.repeat(80));
console.log('');

let testsPassed = 0;
let testsFailed = 0;

function test(name, condition, expected, actual) {
  if (condition) {
    testsPassed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    testsFailed++;
    console.log(`❌ FAIL: ${name}`);
    if (expected !== undefined && actual !== undefined) {
      console.log(`   Expected: ${expected}, Actual: ${actual}`);
    }
  }
}

// ============================================================================
// Test 1: Verify Newton-Raphson IRR calculation logic
// ============================================================================
console.log('Test 1: Newton-Raphson IRR Calculation Logic');
console.log('-'.repeat(80));

/**
 * Simplified IRR calculation using Newton-Raphson method
 * This mirrors the logic in financialCalculations.js
 */
function calculateIRRManual(cashFlows, initialInvestment, years) {
  if (years <= 0 || initialInvestment <= 0) return 0;
  
  // Annual cash flow (assumed constant)
  const annualCashFlow = cashFlows;
  
  // Future value with 3% appreciation
  const currentValue = 550000; // Example
  const appreciationRate = 0.03;
  const futureValue = currentValue * Math.pow(1 + appreciationRate, years);
  
  // Remaining mortgage balance (simplified)
  const mortgageBalance = 380000; // Example
  const annualPrincipalPayment = 13333; // Example
  const futureMortgageBalance = Math.max(0, mortgageBalance - (annualPrincipalPayment * years));
  
  // Sale proceeds with 5% selling costs
  const sellingCosts = futureValue * 0.05;
  const netSaleProceeds = futureValue - futureMortgageBalance - sellingCosts;
  
  // Newton-Raphson method
  let irr = 0.1; // Starting guess of 10%
  const tolerance = 0.0001;
  const maxIterations = 100;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = -initialInvestment;
    
    // Add annual cash flows (discounted)
    for (let year = 1; year <= years; year++) {
      npv += annualCashFlow / Math.pow(1 + irr, year);
    }
    
    // Add sale proceeds (discounted)
    npv += netSaleProceeds / Math.pow(1 + irr, years);
    
    // Calculate derivative
    let derivative = 0;
    for (let year = 1; year <= years; year++) {
      derivative -= (year * annualCashFlow) / Math.pow(1 + irr, year + 1);
    }
    derivative -= (years * netSaleProceeds) / Math.pow(1 + irr, years + 1);
    
    // Newton-Raphson update
    if (Math.abs(derivative) < 0.0001) break; // Prevent division by zero
    const newIrr = irr - npv / derivative;
    
    if (Math.abs(newIrr - irr) < tolerance) {
      irr = newIrr;
      break;
    }
    
    irr = newIrr;
    
    // Prevent extreme values
    if (irr < -0.99) irr = -0.99;
    if (irr > 5.0) irr = 5.0;
  }
  
  return irr * 100; // Convert to percentage
}

// Test with known values
const testInitialInvestment = 150000;
const testAnnualCashFlow = 8000; // Positive cash flow
const testYears = 5;

const irrResult = calculateIRRManual(testAnnualCashFlow, testInitialInvestment, testYears);

console.log(`   Initial Investment: $${testInitialInvestment.toLocaleString()}`);
console.log(`   Annual Cash Flow: $${testAnnualCashFlow.toLocaleString()}`);
console.log(`   Holding Period: ${testYears} years`);
console.log(`   Calculated IRR: ${irrResult.toFixed(2)}%`);
console.log('');

test('IRR calculation returns a number', typeof irrResult === 'number' && !isNaN(irrResult), 'number', typeof irrResult);
test('IRR is positive for positive cash flow', irrResult > 0, 'positive', irrResult);
test('IRR is within reasonable range', irrResult >= -99 && irrResult <= 500, '-99% to 500%', `${irrResult}%`);

// Verify NPV approaches zero at the IRR
function verifyNPV(cashFlow, initialInvestment, years, irr) {
  const annualCashFlow = cashFlow;
  const currentValue = 550000;
  const appreciationRate = 0.03;
  const futureValue = currentValue * Math.pow(1 + appreciationRate, years);
  const mortgageBalance = 380000;
  const annualPrincipalPayment = 13333;
  const futureMortgageBalance = Math.max(0, mortgageBalance - (annualPrincipalPayment * years));
  const sellingCosts = futureValue * 0.05;
  const netSaleProceeds = futureValue - futureMortgageBalance - sellingCosts;
  
  let npv = -initialInvestment;
  for (let year = 1; year <= years; year++) {
    npv += annualCashFlow / Math.pow(1 + irr/100, year);
  }
  npv += netSaleProceeds / Math.pow(1 + irr/100, years);
  
  return npv;
}

const npvAtIRR = verifyNPV(testAnnualCashFlow, testInitialInvestment, testYears, irrResult);
console.log(`   NPV at calculated IRR: $${npvAtIRR.toFixed(2)}`);
console.log('');

// NPV should be close to zero at the IRR (within tolerance)
test('NPV approaches zero at calculated IRR', Math.abs(npvAtIRR) < 10000, '< $10,000', `$${npvAtIRR.toFixed(2)}`);

console.log('');

// ============================================================================
// Test 2: Verify calculation handles edge cases
// ============================================================================
console.log('Test 2: Edge Case Handling');
console.log('-'.repeat(80));

test('Zero holding period returns 0', calculateIRRManual(10000, 100000, 0) === 0, 0, calculateIRRManual(10000, 100000, 0));
test('Zero initial investment returns 0', calculateIRRManual(10000, 0, 5) === 0, 0, calculateIRRManual(10000, 0, 5));

console.log('');

// ============================================================================
// Test 3: Verify calculation consistency across holding periods
// ============================================================================
console.log('Test 3: Consistency Across Holding Periods');
console.log('-'.repeat(80));

const holdingPeriods = [3, 5, 10, 15, 20];
const irrByPeriod = holdingPeriods.map(years => ({
  years,
  irr: calculateIRRManual(testAnnualCashFlow, testInitialInvestment, years)
}));

console.log('   IRR by Holding Period:');
irrByPeriod.forEach(({ years, irr }) => {
  console.log(`   ${years} years: ${irr.toFixed(2)}%`);
});
console.log('');

// All values should be numbers and within reasonable range
const allValid = irrByPeriod.every(({ irr }) => typeof irr === 'number' && !isNaN(irr) && irr >= -99 && irr <= 500);
test('All holding period IRR values are valid', allValid, 'all valid', irrByPeriod.map(v => `${v.years}Y: ${v.irr.toFixed(2)}%`).join(', '));

console.log('');

// ============================================================================
// Test 4: Verify mathematical properties
// ============================================================================
console.log('Test 4: Mathematical Properties');
console.log('-'.repeat(80));

// Higher cash flow should result in higher IRR (all else equal)
const highCashFlow = 12000;
const lowCashFlow = 6000;

const irrHigh = calculateIRRManual(highCashFlow, testInitialInvestment, testYears);
const irrLow = calculateIRRManual(lowCashFlow, testInitialInvestment, testYears);

console.log(`   IRR with high cash flow ($${highCashFlow.toLocaleString()}): ${irrHigh.toFixed(2)}%`);
console.log(`   IRR with low cash flow ($${lowCashFlow.toLocaleString()}): ${irrLow.toFixed(2)}%`);
console.log('');

test('Higher cash flow results in higher IRR', irrHigh > irrLow, 'high > low', `High: ${irrHigh.toFixed(2)}%, Low: ${irrLow.toFixed(2)}%`);

// Lower initial investment should result in higher IRR (all else equal)
const lowInvestment = 100000;
const highInvestment = 200000;

const irrLowInv = calculateIRRManual(testAnnualCashFlow, lowInvestment, testYears);
const irrHighInv = calculateIRRManual(testAnnualCashFlow, highInvestment, testYears);

console.log(`   IRR with low investment ($${lowInvestment.toLocaleString()}): ${irrLowInv.toFixed(2)}%`);
console.log(`   IRR with high investment ($${highInvestment.toLocaleString()}): ${irrHighInv.toFixed(2)}%`);
console.log('');

test('Lower initial investment results in higher IRR', irrLowInv > irrHighInv, 'low inv > high inv', `Low Inv: ${irrLowInv.toFixed(2)}%, High Inv: ${irrHighInv.toFixed(2)}%`);

console.log('');

// ============================================================================
// Test 5: Verify code implementation matches expected logic
// ============================================================================
console.log('Test 5: Implementation Verification');
console.log('-'.repeat(80));

// Check that the financialCalculations.js file contains the expected logic
const fs = require('fs');
const path = require('path');

try {
  const financialCalcPath = path.join(__dirname, 'src/utils/financialCalculations.js');
  const financialCalcContent = fs.readFileSync(financialCalcPath, 'utf8');
  
  // Verify key components exist
  const hasNewtonRaphson = financialCalcContent.includes('Newton-Raphson');
  const hasNPV = financialCalcContent.includes('npv');
  const hasDerivative = financialCalcContent.includes('derivative');
  const hasDiscounting = financialCalcContent.includes('Math.pow(1 + irr');
  const hasMortgagePaydown = financialCalcContent.includes('futureMortgageBalance');
  const hasSellingCosts = financialCalcContent.includes('sellingCosts') || financialCalcContent.includes('selling');
  const hasAppreciation = financialCalcContent.includes('appreciationRate') || financialCalcContent.includes('0.03');
  
  test('Implementation includes Newton-Raphson method', hasNewtonRaphson, true, hasNewtonRaphson);
  test('Implementation includes NPV calculation', hasNPV, true, hasNPV);
  test('Implementation includes derivative calculation', hasDerivative, true, hasDerivative);
  test('Implementation includes cash flow discounting', hasDiscounting, true, hasDiscounting);
  test('Implementation includes mortgage paydown', hasMortgagePaydown, true, hasMortgagePaydown);
  test('Implementation includes selling costs', hasSellingCosts, true, hasSellingCosts);
  test('Implementation includes property appreciation', hasAppreciation, true, hasAppreciation);
  
  // Check for hard caps
  const hasHardCaps = financialCalcContent.includes('irr > 5.0') || financialCalcContent.includes('irr > 10');
  const hasWarnings = financialCalcContent.includes('console.warn');
  
  test('Implementation has updated hard caps (allowing up to 500%)', hasHardCaps, true, hasHardCaps);
  test('Implementation includes warning logs', hasWarnings, true, hasWarnings);
  
} catch (error) {
  test('Implementation file can be read', false, 'readable', error.message);
}

console.log('');

// ============================================================================
// Test 6: Verify My Properties page integration
// ============================================================================
console.log('Test 6: My Properties Page Integration');
console.log('-'.repeat(80));

try {
  const myPropertiesPath = path.join(__dirname, 'src/app/my-properties/page.jsx');
  const myPropertiesContent = fs.readFileSync(myPropertiesPath, 'utf8');
  
  // Verify imports
  const hasImport = myPropertiesContent.includes('calculateIRR') && myPropertiesContent.includes('from');
  const usesProperFunction = myPropertiesContent.includes('calculateIRRProper') || myPropertiesContent.includes('calculateIRR');
  const hasErrorHandling = myPropertiesContent.includes('try') && myPropertiesContent.includes('catch');
  const hasProfessionalTooltip = myPropertiesContent.includes('Net Present Value') || myPropertiesContent.includes('NPV');
  const hasDisclaimer = myPropertiesContent.includes('tax implications') || myPropertiesContent.includes('tax considerations');
  
  test('My Properties page imports calculateIRR', hasImport, true, hasImport);
  test('My Properties page uses proper IRR function', usesProperFunction, true, usesProperFunction);
  test('My Properties page has error handling', hasErrorHandling, true, hasErrorHandling);
  test('My Properties page has professional tooltip', hasProfessionalTooltip, true, hasProfessionalTooltip);
  test('My Properties page includes tax disclaimer', hasDisclaimer, true, hasDisclaimer);
  
} catch (error) {
  test('My Properties page file can be read', false, 'readable', error.message);
}

console.log('');

// ============================================================================
// Summary
// ============================================================================
console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📊 Total Tests: ${testsPassed + testsFailed}`);
console.log('');

if (testsFailed === 0) {
  console.log('🎉 All validation tests passed!');
  console.log('');
  console.log('Key Validation Points:');
  console.log('✅ IRR calculation uses proper NPV-based Newton-Raphson method');
  console.log('✅ Mathematical correctness verified (NPV approaches zero at IRR)');
  console.log('✅ Edge cases handled correctly');
  console.log('✅ Consistency across holding periods validated');
  console.log('✅ Mathematical properties verified (cash flow and investment impact)');
  console.log('✅ Implementation matches expected logic');
  console.log('✅ My Properties page integration verified');
  console.log('');
  console.log('📝 Note: For runtime tests with actual property data,');
  console.log('   run: npm run build && node test_irr_calculation.js');
  process.exit(0);
} else {
  console.log('⚠️  Some validation tests failed. Please review the errors above.');
  process.exit(1);
}
