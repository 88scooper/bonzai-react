# 🔍 Mortgage Feature Audit Report - Bonzai Real Estate App

**Audit Date:** 2025-01-17  
**Auditor:** AI Assistant (Canadian Mortgage Expert)  
**Audit Scope:** Complete mortgage functionality audit per MORTGAGE_AUDIT_PROMPT.md

---

## Executive Summary

### Overall Assessment: ⚠️ **PASS WITH CRITICAL ISSUES**

The Bonzai mortgage feature has a solid foundation with correct Canadian mortgage calculation formulas for semi-annual compounding. However, **several critical issues** were identified that impact accuracy and data integrity:

### Critical Issues Found:
1. **CRITICAL:** Payment date calculations use approximate intervals instead of actual calendar dates
2. **HIGH:** API schema validation allows required fields to be optional
3. **HIGH:** Two conflicting calculation systems exist (mortgageCalculator.ts vs mortgage-calculations.js)
4. **MEDIUM:** Semi-monthly payment date calculation uses 15-day intervals instead of 1st/15th of month
5. **MEDIUM:** Term vs amortization validation present in form but inconsistent in API schema

### Key Recommendations:
1. **Immediate:** Fix payment date calculations to use actual calendar dates
2. **Immediate:** Align API schema validation with form validation requirements
3. **High Priority:** Standardize on single calculation system (mortgageCalculator.ts)
4. **High Priority:** Add comprehensive calculation accuracy tests against Canadian lender calculators

### Assessment of Input Sufficiency: ✅ **SUFFICIENT**
The current inputs collected are **sufficient** for accurate mortgage calculations and amortization schedules. All required fields are present in the forms, though validation needs strengthening at the API level.

---

## Phase 1: Data Collection Audit Results

### ✅ Required Information Checklist

#### 1. Lender Information
- ✅ **Lender name is collected** - Field: `lenderName` in forms
- ✅ **Lender name is required** - Validated in `mortgageSchema` (mortgage-validation.js line 5-8)
- ✅ **Validation prevents empty/whitespace** - Uses `.trim()` and `.min(1)`
- ⚠️ **API schema issue** - `createMortgageSchema` (mortgage.schema.ts line 8) marks lender as `.optional()` when it should be required

**Files Affected:**
- `src/lib/mortgage-validation.js` (lines 5-8) ✅
- `src/lib/validations/mortgage.schema.ts` (line 8) ⚠️

#### 2. Loan Amount
- ✅ **Original loan amount is collected** - Field: `originalAmount`
- ✅ **Loan amount is required** - Validated in mortgageSchema (line 14-16)
- ✅ **Validation ensures amount > 0** - `.min(1)` validation
- ✅ **Format accepts Canadian dollar amounts** - Number input with step="0.01"
- ⚠️ **API schema issue** - API schema allows `.optional()` (mortgage.schema.ts line 9)

#### 3. Interest Rate
- ✅ **Interest rate collected as percentage** - Forms accept percentage, converted to decimal for storage
- ✅ **Interest rate is required** - Validated in mortgageSchema (line 18-20)
- ✅ **Validation ensures rate >= 0** - `.min(0)` validation
- ✅ **Realistic bounds check** - `.max(50)` (50%) and `.max(1)` (100%) in API schema
- ✅ **Rate stored consistently as decimal** - Converted in `transformMortgageFormData()` (line 263)

**Note:** Forms collect as percentage (e.g., 5.25%), but storage/calculations use decimal (0.0525). This is correct.

#### 4. Rate Type
- ✅ **Fixed vs Variable rate type captured** - Enum: `['FIXED', 'VARIABLE']`
- ✅ **Variable rate spread collected** - Field: `variableRateSpread` (optional, nullable)
- ✅ **Prime rate integration** - Field: `primeRate` (optional, nullable, defaults to CANADIAN_PRIME_RATE)

#### 5. Term & Amortization
- ✅ **Term length collected** - Fields: `termValue` and `termUnit` (years/months)
- ✅ **Amortization period collected** - Fields: `amortizationValue` and `amortizationUnit` (years/months)
- ✅ **CRITICAL: Validation ensures Term ≤ Amortization** - Custom refinement in mortgageSchema (lines 112-130)
- ✅ **Both term and amortization are required** - Validated in mortgageSchema

**Validation Logic:**
```typescript
// mortgage-validation.js lines 112-130
.refine((data) => {
  const amortizationInMonths = data.amortizationUnit === 'years' 
    ? data.amortizationValue * 12 
    : data.amortizationValue;
  const termInMonths = data.termUnit === 'years' 
    ? data.termValue * 12 
    : data.termValue;
  
  if (termInMonths > amortizationInMonths) {
    return false; // Validation fails
  }
  return true;
}, {
  message: 'Term cannot exceed amortization period',
  path: ['termValue']
});
```

#### 6. Payment Frequency
- ✅ **Payment frequency collected** - Enum with 6 options:
  - MONTHLY, SEMI_MONTHLY, BI_WEEKLY, ACCELERATED_BI_WEEKLY, WEEKLY, ACCELERATED_WEEKLY
- ✅ **Payment frequency is required** - Validated in mortgageSchema (line 62-71)

#### 7. Start Date
- ✅ **Mortgage start date collected** - Field: `startDate` (Date type)
- ✅ **Start date is required** - Validated in mortgageSchema (line 58-60)
- ✅ **Allows past dates** - No restriction on past dates
- ✅ **Allows future dates** - No restriction on future dates

#### 8. Property Association
- ✅ **Mortgage linked to property** - Field: `propertyId`
- ⚠️ **Property association validation** - Form requires property selection (line 10-12), but validation transforms empty string to null
- ⚠️ **API schema allows null** - PropertyId not enforced as required in API schema

### Additional Recommended Fields

| Field | Status | Notes |
|-------|--------|-------|
| Mortgage number/account number | ⚠️ Partial | Stored in `mortgageData` JSONB field for Richmond mortgage, not captured in standard form |
| Open vs Closed mortgage type | ✅ Collected | Field: `mortgageType` (enum: OPEN, CLOSED) - optional |
| Prepayment privileges | ❌ Missing | Not collected |
| Renewal penalty type | ❌ Missing | Not collected |
| CMHC/default insurance status | ❌ Missing | Not collected |

### Phase 1 Summary

**Strengths:**
- ✅ All critical required fields are collected in forms
- ✅ Comprehensive validation in form schema (mortgage-validation.js)
- ✅ Term ≤ Amortization validation correctly implemented
- ✅ Payment frequency options comprehensive

**Issues Found:**
- ⚠️ **HIGH:** API schema (`mortgage.schema.ts`) marks required fields as optional
- ⚠️ **MEDIUM:** Mortgage number not collected in standard form (only used for Richmond special case)
- ⚠️ **LOW:** Prepayment and renewal penalty fields not collected (nice-to-have)

**Impact:**
- API schema validation gaps could allow invalid mortgages to be saved if API is called directly
- Missing optional fields don't impact core calculations but limit functionality

---

## Phase 2: Calculation Accuracy Audit Results

### ✅ Canadian Mortgage Calculation Standards

#### Periodic Rate Calculation Verification

**Fixed-Rate Mortgages - Semi-Annual Compounding:**
- ✅ **Formula correct** - Uses `(1 + annualRate/2)^(1/periodsPerYear) - 1`
- ✅ **Monthly:** `(1 + semiAnnualRate)^(1/6) - 1` ✅
- ✅ **Bi-weekly:** `(1 + semiAnnualRate)^(1/13) - 1` ✅
- ✅ **Weekly:** `(1 + semiAnnualRate)^(1/26) - 1` ✅

**Implementation Location:** `src/utils/mortgageCalculator.ts` lines 212-235

**Variable-Rate Mortgages:**
- ⚠️ **Not fully tested** - Variable rate logic present but requires testing against Canadian standards
- **Note:** Canadian variable rates typically use monthly compounding, not semi-annual

**Legacy Calculator Issue:**
- ⚠️ **HIGH:** `src/lib/mortgage-calculations.js` uses different formula for fixed rates:
  ```javascript
  // mortgage-calculations.js line 18
  const effectiveAnnualRate = Math.pow(1 + semiAnnualRate, 2) - 1;
  // Then converts using effective annual rate
  return Math.pow(1 + effectiveAnnualRate, 1/periodsPerYear) - 1;
  ```
  This is mathematically equivalent but different approach. Both should produce same results, but having two systems creates maintenance risk.

#### Payment Amount Calculation

**Formula:** `P = L × [c(1+c)^n] / [(1+c)^n - 1]`
- ✅ **Implementation correct** - `calculatePaymentAmount()` in mortgageCalculator.ts (lines 152-167)

**Payment Frequency Handling:**
- ✅ **Monthly:** Standard amortization calculation
- ✅ **Bi-weekly:** Uses bi-weekly periodic rate (26 payments/year)
- ✅ **Weekly:** Uses weekly periodic rate (52 payments/year)
- ✅ **Accelerated Bi-weekly:** Monthly Payment / 2, paid 26 times/year ✅
- ✅ **Accelerated Weekly:** Monthly Payment / 4, paid 52 times/year ✅
- ⚠️ **Semi-monthly:** Uses monthly periodic rate but needs verification

**Payment Rounding:**
- ✅ **Rounded to 2 decimal places** - Canadian standard
- ⚠️ **Implementation:** Uses `Math.round()` in legacy calculator (line 151), but new calculator may not round explicitly

### Test Case Results

#### Test Case 1: Richmond St E - RMG Bi-Weekly Fixed Mortgage ⭐ PRIMARY TEST

**Test Parameters:**
- Loan: $492,000
- Rate: 2.69% (0.0269 decimal)
- Amortization: 25 years (300 months)
- Term: 5 years (60 months)
- Frequency: Bi-Weekly
- Start Date: 2019-02-04
- Expected Payment: $1,102.28 (from lender statement)

**Status:** ✅ **PASS (Using Lender Schedule)**
- Mortgage uses lender-provided amortization schedule (hardcoded CSV data)
- Payment amount matches: $1,102.28
- **Note:** This is not a calculated result - uses pre-validated lender data

**Calculation Verification Needed:**
- To fully test calculation accuracy, need to test with mortgages that don't have lender schedules
- Richmond mortgage bypasses calculation engine (lines 261-276 in mortgageCalculator.ts)

#### Test Case 2: Tretti Way - TD Monthly Fixed Mortgage

**Test Parameters:**
- Loan: $358,800
- Rate: 5.49% (0.0549 decimal)
- Amortization: 30 years
- Term: 48 months
- Frequency: Monthly
- Start Date: 2023-08-01

**Manual Calculation (Canadian Semi-Annual Compounding):**
```
Semi-annual rate = 0.0549 / 2 = 0.02745
Monthly rate = (1 + 0.02745)^(1/6) - 1 = 0.0045308
Total payments = 30 * 12 = 360
Payment = $358,800 * [0.0045308 * (1.0045308^360)] / [(1.0045308^360) - 1]
Expected Payment ≈ $2,037.00 (approximate)
```

**Status:** ⚠️ **NEEDS VERIFICATION**
- Automated test needed to compare against TD Bank calculator
- Calculation formula appears correct based on code review

#### Test Case 3: Wilson Ave - RBC Monthly Fixed Mortgage

**Test Parameters:**
- Loan: $426,382.10
- Rate: 4.45% (0.0445 decimal)
- Amortization: 30 years
- Term: 36 months
- Frequency: Monthly
- Start Date: 2025-01-22

**Status:** ⚠️ **NEEDS VERIFICATION**
- Automated test needed to compare against RBC calculator
- Calculation formula appears correct based on code review

### Comparison with Canadian Lender Calculators

**Status:** ❌ **NOT PERFORMED**
- Manual comparison against RBC, TD, CIBC calculators needed
- This requires web search or manual testing

**Recommendation:**
- Create automated test suite that compares calculations against known good values
- Test with multiple scenarios from each major lender's calculator

### Phase 2 Summary

**Strengths:**
- ✅ Canadian semi-annual compounding formula correctly implemented
- ✅ Payment frequency calculations appear correct
- ✅ Accelerated payment logic correct

**Issues Found:**
- ⚠️ **HIGH:** Two calculation systems exist (mortgageCalculator.ts and mortgage-calculations.js)
- ⚠️ **MEDIUM:** No automated tests against Canadian lender calculators
- ⚠️ **MEDIUM:** Variable rate compounding logic needs verification

**Impact:**
- Calculations likely accurate, but risk of divergence between two systems
- No validation against industry standards beyond Richmond lender schedule

---

## Phase 3: Amortization Schedule Accuracy Audit Results

### Schedule Structure

- ✅ **All required fields included:**
  - Payment number
  - Payment date
  - Principal payment
  - Interest payment
  - Total payment
  - Remaining balance
- ✅ **Final payment results in $0.00 balance** - Logic handles final payment (lines 313-326)

### Payment Date Accuracy

**CRITICAL ISSUE IDENTIFIED:** ⚠️ **PAYMENT DATES USE APPROXIMATE INTERVALS**

**Current Implementation:**
```typescript
// mortgageCalculator.ts lines 240-255
function getPaymentIntervalDays(paymentFrequency: string): number {
  switch (paymentFrequency.toLowerCase()) {
    case 'monthly':
      return 30; // ⚠️ APPROXIMATE - Should use calendar months
    case 'semi-monthly':
      return 15; // ⚠️ APPROXIMATE - Should use 1st and 15th of month
    case 'bi-weekly':
      return 14; // ✅ CORRECT - Exactly 14 days
    case 'weekly':
      return 7; // ✅ CORRECT - Exactly 7 days
  }
}

// Used in schedule calculation (line 321, 333):
paymentDate: new Date(startDate.getTime() + (i - 1) * paymentIntervalDays * 24 * 60 * 60 * 1000)
```

**Problems:**
1. **Monthly payments:** Uses 30-day intervals instead of same day of month each month
   - Example: Start Jan 31 → Next payment Feb 29 (correct) vs Mar 2 (wrong with 30-day interval)
2. **Semi-monthly payments:** Uses 15-day intervals instead of 1st and 15th of month
3. **Date calculation:** Simple day addition doesn't handle month boundaries correctly

**Recommended Fix:**
```typescript
// For monthly: Use setMonth() or date-fns addMonths()
// For semi-monthly: Use 1st and 15th of month
// For bi-weekly/weekly: Current 14/7 day intervals are correct
```

**Impact:** **HIGH** - Payment dates will be incorrect, affecting:
- Renewal date calculations
- Balance at specific dates
- Payment schedule accuracy
- Integration with property cash flow (payments may not align with calendar months)

### Principal & Interest Allocation

- ✅ **Allocation correct** - Interest calculated first, then principal (lines 308-309)
- ✅ **Principal = Total Payment - Interest** - Correct
- ✅ **Principal increases over time** - Amortization curve correct
- ✅ **Interest decreases over time** - Correct behavior

**Implementation:**
```typescript
const interestPayment = remainingBalance * periodicRate;
const principalPayment = Math.min(paymentAmount - interestPayment, remainingBalance);
```

### Balance Progression

- ✅ **Starting balance = Original Loan Amount** - Correct
- ✅ **Balance decreases by Principal Payment** - Correct (line 328)
- ✅ **Balance never goes negative** - Protected (line 309: `Math.min()`)
- ✅ **Final balance = $0.00** - Handled in final payment logic (lines 313-326)

### Term vs Amortization Handling

- ✅ **Schedule handles Term < Amortization** - Logic supports full amortization schedule
- ⚠️ **Balance at end of term** - Function exists but needs verification
- ✅ **Renewal date calculation** - `calculateRenewalDate()` utility exists

### Total Interest Calculation

- ✅ **Sum of interest matches total** - `totalInterest` accumulated correctly (line 305, 329)

### Phase 3 Summary

**Strengths:**
- ✅ Principal/interest allocation correct
- ✅ Balance progression correct
- ✅ Final payment handling correct

**Critical Issues:**
- ❌ **CRITICAL:** Payment dates use approximate intervals (30 days monthly, 15 days semi-monthly)
- ⚠️ **MEDIUM:** Month boundary handling incorrect for monthly payments

**Impact:** **HIGH** - Payment dates are inaccurate, which cascades to:
- Incorrect renewal dates
- Wrong balance calculations at specific dates
- Property cash flow calculations may be misaligned with actual payment dates

---

## Phase 4: Data Processing & Storage Audit Results

### Database Schema

**Mortgages Table (migrations/001_initial_schema.sql lines 50-64):**
```sql
CREATE TABLE IF NOT EXISTS mortgages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    lender VARCHAR(255),  -- ⚠️ No NOT NULL constraint
    original_amount DECIMAL(15, 2),  -- ⚠️ No NOT NULL constraint
    interest_rate DECIMAL(5, 4),  -- ✅ Correct precision
    rate_type VARCHAR(50),  -- ⚠️ No NOT NULL constraint
    term_months INTEGER,  -- ⚠️ No NOT NULL constraint
    amortization_years INTEGER,  -- ⚠️ No NOT NULL constraint
    payment_frequency VARCHAR(50),  -- ⚠️ No NOT NULL constraint
    start_date DATE,  -- ⚠️ No NOT NULL constraint
    mortgage_data JSONB,  -- ✅ Additional data storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Issues:**
- ⚠️ **HIGH:** Required fields not enforced at database level (no NOT NULL constraints)
- ⚠️ **MEDIUM:** Interest rate precision (DECIMAL(5,4)) allows 9.9999% max - should be DECIMAL(6,4) for rates > 10%
- ✅ **Index exists** - `idx_mortgages_property_id` for property lookup

### Data Transformation

**Interest Rate Storage:**
- ✅ **Consistent as decimal** - Forms convert percentage to decimal in `transformMortgageFormData()` (line 263)
- ✅ **Display as percentage** - API data converted back to percentage in `transformMortgageApiData()` (line 286)

**Date Formats:**
- ✅ **ISO format** - Dates stored and transmitted as ISO strings
- ⚠️ **Timezone handling** - Uses JavaScript Date objects which may have timezone issues

**Amount Precision:**
- ✅ **DECIMAL(15,2)** - Sufficient precision for mortgage amounts (up to $99,999,999,999.99)

### API Endpoints

**Validation Schemas:**
- ⚠️ **CRITICAL:** API schema (`mortgage.schema.ts`) marks all fields as `.optional()`
- ✅ **Form schema** (`mortgage-validation.js`) has proper required validations
- ⚠️ **Discrepancy:** API and form validations don't match

**Example:**
```typescript
// API Schema (mortgage.schema.ts line 8-10)
lender: z.string().min(1, 'Lender is required').max(255).optional(), // ⚠️ CONTRADICTION
originalAmount: z.number().min(0, 'Original amount must be positive').optional(),
```

### Phase 4 Summary

**Strengths:**
- ✅ Data types correct (DECIMAL for amounts, DATE for dates)
- ✅ JSONB field allows extensibility
- ✅ Foreign key relationships correct

**Critical Issues:**
- ❌ **HIGH:** API schema validation allows required fields to be optional
- ⚠️ **MEDIUM:** Database schema lacks NOT NULL constraints
- ⚠️ **LOW:** Interest rate precision may be insufficient for rates > 9.9999%

**Impact:**
- Invalid mortgages could be saved via API if validation is bypassed
- Data integrity not enforced at database level

---

## Phase 5: Integration & Display Audit Results

### Property-Level Integration

**Mortgage Payment Calculation:**
- ✅ **Monthly payment calculated** - `getMonthlyMortgagePayment()` converts bi-weekly/weekly to monthly equivalent
- ✅ **Interest separated from principal** - `getMonthlyMortgageInterest()` and `getMonthlyMortgagePrincipal()`
- ✅ **Cash flow includes mortgage** - Mortgage payments included in cash flow calculations

**Integration Points:**
- ✅ `src/utils/financialCalculations.js` - Uses mortgage payment functions
- ✅ `src/data/scProperties.js` - Calculates mortgage payments for properties

### Portfolio-Level Integration

**Status:** ✅ **IMPLEMENTED**
- Portfolio aggregations include mortgage data
- Total mortgage payments summed correctly
- Portfolio cash flow includes all mortgage payments

### Display Accuracy

**Formatting:**
- ✅ **Currency formatting** - Uses `Intl.NumberFormat('en-CA')` for CAD
- ✅ **Interest rates as percentages** - Displayed as percentages (e.g., "5.25%")
- ✅ **Date formatting** - User-friendly date formats

**Potential Issues:**
- ⚠️ Payment dates may display incorrectly due to date calculation issues (Phase 3)

### Real-time Updates

- ✅ **Changes reflect immediately** - React state updates propagate
- ✅ **Property metrics update** - Mortgage changes trigger recalculation

### Phase 5 Summary

**Strengths:**
- ✅ Integration with property calculations correct
- ✅ Display formatting correct
- ✅ Real-time updates working

**Issues:**
- ⚠️ **MEDIUM:** Payment date inaccuracies (from Phase 3) affect integration accuracy
- No critical issues found in integration layer

---

## Priority Action Items

### Critical Priority (Fix Immediately)

1. **Payment Date Calculation** 
   - **Issue:** Monthly and semi-monthly payments use approximate day intervals
   - **Impact:** HIGH - Payment dates incorrect, affects renewal dates and balance calculations
   - **Fix:** Implement calendar-based date calculations
   - **Files:** `src/utils/mortgageCalculator.ts` (lines 240-255, 321, 333)
   - **Effort:** 4 hours

2. **API Schema Validation**
   - **Issue:** Required fields marked as optional in API schema
   - **Impact:** HIGH - Invalid data could be saved
   - **Fix:** Remove `.optional()` from required fields in `mortgage.schema.ts`
   - **Files:** `src/lib/validations/mortgage.schema.ts`
   - **Effort:** 1 hour

### High Priority (Fix Soon)

3. **Standardize Calculation System**
   - **Issue:** Two calculation systems exist (mortgageCalculator.ts and mortgage-calculations.js)
   - **Impact:** MEDIUM - Maintenance risk, potential divergence
   - **Fix:** Deprecate legacy calculator, use mortgageCalculator.ts exclusively
   - **Files:** `src/lib/mortgage-calculations.js`
   - **Effort:** 2 hours

4. **Database Schema Constraints**
   - **Issue:** Required fields not enforced at database level
   - **Impact:** MEDIUM - Data integrity risk
   - **Fix:** Add NOT NULL constraints to required fields
   - **Files:** `migrations/001_initial_schema.sql`
   - **Effort:** 1 hour

### Medium Priority (Improve When Possible)

5. **Calculator Accuracy Verification**
   - **Issue:** No automated tests against Canadian lender calculators
   - **Impact:** MEDIUM - Calculation accuracy unverified
   - **Fix:** Create test suite comparing against known good values
   - **Effort:** 4 hours

6. **Variable Rate Compounding**
   - **Issue:** Variable rate compounding logic needs verification
   - **Impact:** LOW - Most mortgages are fixed-rate
   - **Fix:** Verify against Canadian standards (monthly compounding)
   - **Effort:** 2 hours

### Low Priority (Nice-to-Have)

7. **Additional Mortgage Fields**
   - **Issue:** Prepayment privileges, renewal penalties not collected
   - **Impact:** LOW - Doesn't affect core calculations
   - **Fix:** Add optional fields to form and database
   - **Effort:** 3 hours

---

## Recommendations Spreadsheet

See `MORTGAGE_AUDIT_RECOMMENDATIONS.csv` for detailed recommendations with priority, impact, and estimated effort.

---

## Conclusion

The Bonzai mortgage feature has a **solid foundation** with correct Canadian mortgage calculation formulas. The **primary issues** are:

1. **Payment date calculation accuracy** - Needs immediate fix
2. **API validation gaps** - Needs immediate fix
3. **Two calculation systems** - Should be consolidated

**Overall Assessment:** The feature is **functional** but needs **critical fixes** for production accuracy. With the recommended fixes, the mortgage feature will be production-ready and accurate.

**Input Sufficiency:** ✅ **Current inputs are sufficient** for accurate mortgage calculations. No additional required fields needed for core functionality.

---

**End of Audit Report**
