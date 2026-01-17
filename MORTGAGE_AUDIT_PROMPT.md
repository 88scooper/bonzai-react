# 🔍 Mortgage Feature Audit Prompt - Bonzai Real Estate App

## Context & Objective

You are auditing the mortgage functionality in the Bonzai Real Estate App, a Canadian real estate investment platform. Your expertise in **Canadian mortgage calculations and amortization schedules** is critical to this audit.

**Primary Goal:** Ensure the app correctly collects all necessary mortgage information from users (lender, rates, loan amount, etc.) and accurately processes/displays this data, including precise amortization schedules that follow Canadian mortgage calculation standards. **Data accuracy is CRITICAL** - the conclusions drawn from mortgage data throughout the app depend on 100% accurate calculations.

**Why This Matters:** Mortgage data drives critical financial calculations throughout the app (cash flow, NOI, portfolio metrics). Inaccurate mortgage data or calculations will cascade errors across all property and portfolio analytics.

### Real-World Test Data

Use the actual mortgages associated with **cooper.stuartc@gmail.com** (SC Properties account) as your primary test cases:

**Mortgage 1: Richmond St E (403-311)**
- Lender: **RMG**
- Original Amount: **$492,000**
- Interest Rate: **2.69%** (stored as 0.0269 decimal)
- Rate Type: **Fixed**
- Term: **60 months** (5 years)
- Amortization: **25 years** (300 months)
- Payment Frequency: **Bi-Weekly**
- Start Date: **2019-02-04**
- Payment Amount: **$1,102.28** (from lender statement - verify this matches calculations)
- Mortgage Number: **8963064.1**
- Current Balance (as of 2025-12-16): **$375,080.02**
- Renewal Date: **2027-01-28**
- **Note:** This mortgage has a lender-provided amortization schedule in the codebase (Richmond St E mortgage data)

**Mortgage 2: Tretti Way (30-317)**
- Lender: **TD Bank**
- Original Amount: **$358,800**
- Interest Rate: **5.49%** (stored as 0.0549 decimal)
- Rate Type: **Fixed**
- Term: **48 months** (4 years)
- Amortization: **30 years** (360 months)
- Payment Frequency: **Monthly**
- Start Date: **2023-08-01**

**Mortgage 3: Wilson Ave (500-415)**
- Lender: **RBC**
- Original Amount: **$426,382.10**
- Interest Rate: **4.45%** (stored as 0.0445 decimal)
- Rate Type: **Fixed**
- Term: **36 months** (3 years)
- Amortization: **30 years** (360 months)
- Payment Frequency: **Monthly**
- Start Date: **2025-01-22**

**Location of Test Data:** 
- Properties data: `src/data/scProperties.js`
- Richmond mortgage schedule: `src/utils/mortgageCalculator.ts` (contains lender CSV data)

### Professional Calculator Comparison

**CRITICAL:** All calculations must be verified against **professional-grade Canadian mortgage calculators**:
- RBC Mortgage Calculator
- TD Bank Mortgage Calculator
- CIBC Mortgage Calculator
- BMO Mortgage Calculator
- Scotiabank Mortgage Calculator

**Comparison Requirement:** For each mortgage test case, compare Bonzai's calculations against at least 2-3 professional calculator results and document any discrepancies.

---

## 🎯 Audit Scope

### Phase 1: Data Collection Audit

**Task:** Verify that the Bonzai app is collecting all necessary mortgage information from users, and **assess whether the current inputs are sufficient to accurately calculate mortgage details and amortization schedules**.

**Key Question:** Are the current inputs requested by Bonzai sufficient to accurately calculate mortgage details for the account?

#### Required Information Checklist:

1. **Lender Information**
   - [ ] Lender name is collected and stored
   - [ ] Lender name is required (not optional) in mortgage forms
   - [ ] Validation prevents empty/whitespace-only lender names

2. **Loan Amount**
   - [ ] Original loan amount is collected
   - [ ] Loan amount is required (not optional)
   - [ ] Validation ensures amount > 0
   - [ ] Format accepts Canadian dollar amounts ($500,000 vs 500000)

3. **Interest Rate**
   - [ ] Interest rate is collected as percentage (e.g., 5.25% vs 0.0525)
   - [ ] Interest rate is required (not optional)
   - [ ] Validation ensures rate >= 0
   - [ ] Realistic bounds check (e.g., warning for rates < 0.5% or > 15%)
   - [ ] Rate is stored consistently (as decimal vs percentage) throughout the app

4. **Rate Type**
   - [ ] Fixed vs Variable rate type is captured
   - [ ] Variable rate spread (if applicable) is collected when rate type = Variable
   - [ ] Prime rate integration for variable mortgages (if applicable)

5. **Term & Amortization**
   - [ ] Term length is collected (years/months)
   - [ ] Amortization period is collected (years/months)
   - [ ] **CRITICAL:** Validation ensures Term ≤ Amortization (term cannot exceed amortization)
   - [ ] Both term and amortization are required

6. **Payment Frequency**
   - [ ] Payment frequency is collected (Monthly, Bi-weekly, Weekly, Accelerated options, Semi-monthly)
   - [ ] Payment frequency is required

7. **Start Date**
   - [ ] Mortgage start date is collected
   - [ ] Start date is required
   - [ ] Allows past dates (for existing mortgages)
   - [ ] Allows future dates (for planned mortgages)

8. **Property Association**
   - [ ] Mortgage is linked to a property (propertyId)
   - [ ] Property association is required or clearly optional

#### Additional Recommended Fields (Check if present):
- [ ] Mortgage number/account number
- [ ] Open vs Closed mortgage type
- [ ] Prepayment privileges (% annual limit, lump sum options)
- [ ] Renewal penalty type (IRD vs 3-month interest)
- [ ] CMHC/default insurance status

**Deliverable:** 
1. Checklist document showing:
   - Which required fields are properly collected
   - Which required fields are missing or optional when they shouldn't be
   - Which recommended fields are missing
   - Any validation gaps or issues
2. **Assessment of Input Sufficiency:** 
   - Are the current inputs sufficient to accurately calculate mortgage details?
   - What additional inputs (if any) are needed for accurate amortization schedules?
   - Can Bonzai calculate accurate schedules with the data currently collected?

---

### Phase 2: Calculation Accuracy Audit

**Task:** Verify that all mortgage calculations follow Canadian mortgage calculation standards and produce accurate results.

#### Canadian Mortgage Calculation Standards:

**Key Principles:**
1. **Fixed-rate mortgages:** Use **semi-annual compounding**
2. **Variable-rate mortgages:** Typically use **monthly compounding**
3. **Payment Formula:** `P = L × [c(1+c)^n] / [(1+c)^n - 1]`
   - P = Payment amount
   - L = Loan amount
   - c = Periodic interest rate
   - n = Number of payments

#### Calculation Verification Points:

1. **Periodic Rate Calculation**
   - [ ] Fixed rates: Uses semi-annual compounding correctly
     - Formula: `(1 + annualRate/2)^(1/periodsPerYear) - 1`
     - Monthly: `(1 + annualRate/2)^(1/6) - 1`
     - Bi-weekly: `(1 + annualRate/2)^(1/13) - 1`
     - Weekly: `(1 + annualRate/2)^(1/26) - 1`
   - [ ] Variable rates: Uses monthly compounding correctly
   - [ ] Semi-monthly: Verify calculation matches Canadian standards (typically Monthly Payment / 2, paid 24 times/year)

2. **Payment Amount Calculation**
   - [ ] Standard payment frequencies calculate correctly
   - [ ] Accelerated bi-weekly: Monthly Payment / 2, paid 26 times/year ✅
   - [ ] Accelerated weekly: Monthly Payment / 4, paid 52 times/year ✅
   - [ ] Payment amounts are rounded to 2 decimal places (Canadian standard)

3. **Test Cases to Verify (Using Real Mortgages):**
   
   **Test Case 1: Richmond St E - RMG Bi-Weekly Fixed Mortgage** ⭐ **PRIMARY TEST**
   - Loan: $492,000
   - Rate: 2.69% (0.0269)
   - Amortization: 25 years
   - Term: 5 years (60 months)
   - Frequency: Bi-Weekly
   - Start Date: 2019-02-04
   - **Expected Payment:** $1,102.28 (from lender statement - verify this matches calculations)
   - **Expected Balance (Dec 2025):** $375,080.02 (verify current balance calculation)
   - **Compare with:** RBC, TD, CIBC calculators
   - **Verify:** Full amortization schedule matches lender-provided schedule (in codebase)
   
   **Test Case 2: Tretti Way - TD Monthly Fixed Mortgage**
   - Loan: $358,800
   - Rate: 5.49% (0.0549)
   - Amortization: 30 years
   - Term: 48 months (4 years)
   - Frequency: Monthly
   - Start Date: 2023-08-01
   - **Expected:** Monthly payment should match TD Bank calculator
   - **Compare with:** TD Bank, RBC, CIBC calculators
   - **Verify:** Balance at term end (2027-08-01) calculation
   
   **Test Case 3: Wilson Ave - RBC Monthly Fixed Mortgage**
   - Loan: $426,382.10
   - Rate: 4.45% (0.0445)
   - Amortization: 30 years
   - Term: 36 months (3 years)
   - Frequency: Monthly
   - Start Date: 2025-01-22
   - **Expected:** Monthly payment should match RBC calculator
   - **Compare with:** RBC, TD, CIBC calculators
   - **Verify:** Balance at term end (2028-01-22) calculation
   
   **Test Case 4: Edge Cases**
   - [ ] Zero interest rate mortgages (interest-free loans)
   - [ ] Very short amortization (1-5 years)
   - [ ] Very long amortization (30+ years)
   - [ ] Term = Amortization (payment fully amortizes within term)

4. **Comparison with Known Sources:**
   - [ ] Compare calculations with:
     - Canadian lender mortgage calculators (RBC, TD, CIBC, BMO, Scotiabank)
     - Government of Canada mortgage calculator (if available)
     - Third-party Canadian mortgage calculators
   - [ ] Document any discrepancies and verify which is correct

**Deliverable:** 
- Test results document showing pass/fail for each test case
- **Detailed comparison table** showing Bonzai calculations vs. **professional Canadian mortgage calculators** (RBC, TD, CIBC, BMO, Scotiabank)
  - For each test case, compare: Payment amount, Balance at term end, Total interest over term
  - Document any discrepancies (even small ones - accuracy is critical)
- List of any calculation errors or discrepancies found
- Recommendations for fixes if errors are found

---

### Phase 3: Amortization Schedule Accuracy Audit

**Task:** Verify that amortization schedules are calculated correctly and accurately reflect mortgage payments over time.

#### Amortization Schedule Verification:

1. **Schedule Structure**
   - [ ] Schedule includes all required fields:
     - Payment number
     - Payment date
     - Principal payment
     - Interest payment
     - Total payment
     - Remaining balance
   - [ ] Final payment results in $0.00 remaining balance (within rounding tolerance of $0.01)

2. **Payment Date Accuracy**
   - [ ] **CRITICAL:** Payment dates use actual calendar dates, not approximate day intervals
   - [ ] Monthly payments: Same day of month each month (or last day if month is shorter)
   - [ ] Bi-weekly payments: Exactly 14 days apart from start date
   - [ ] Weekly payments: Exactly 7 days apart from start date
   - [ ] Semi-monthly: 1st and 15th of each month (or specific dates)
   - [ ] Date calculations handle month-end boundaries correctly (e.g., payment on Jan 31, next on Feb 28/29)

3. **Principal & Interest Allocation**
   - [ ] Each payment correctly allocates between principal and interest
   - [ ] Interest = Remaining Balance × Periodic Rate (for that period)
   - [ ] Principal = Total Payment - Interest
   - [ ] Principal + Interest = Total Payment (for each payment)
   - [ ] Principal increases over time (amortization curve)
   - [ ] Interest decreases over time

4. **Balance Progression**
   - [ ] Starting balance = Original Loan Amount
   - [ ] Balance decreases by Principal Payment amount each period
   - [ ] Balance never goes negative
   - [ ] Final balance = $0.00 (within rounding tolerance)

5. **Term vs Amortization Handling**
   - [ ] Schedule can handle Term < Amortization (mortgage renews before fully amortized)
   - [ ] Balance at end of term is calculated correctly
   - [ ] Renewal date is calculated correctly (Start Date + Term)

6. **Total Interest Calculation**
   - [ ] Sum of all interest payments matches total interest over amortization period
   - [ ] Total Interest + Principal Paid = Total Payments Made

7. **Test Cases:**

   **Test Case 1: Richmond St E - Full Amortization Schedule** ⭐ **PRIMARY TEST**
   - Loan: $492,000, Rate: 2.69%, Amortization: 25 years, Term: 5 years, Bi-weekly
   - Start Date: 2019-02-04
   - **Expected:** 650 bi-weekly payments total (25 years × 26), final balance = $0.00
   - **Verify:** 
     - Payment amounts match lender-provided schedule (in codebase)
     - Payment dates are every 14 days from start date
     - Balance progression matches lender schedule
     - Balance at renewal (2027-01-28) is correct
     - Compare payment #1, payment #150, payment #260 (end of term), final payment against lender data
   - **Compare:** Full schedule vs. lender CSV data in `src/utils/mortgageCalculator.ts`

   **Test Case 2: Tretti Way - Term Schedule (48 months)**
   - Loan: $358,800, Rate: 5.49%, Amortization: 30 years, Term: 48 months, Monthly
   - Start Date: 2023-08-01
   - **Expected:** 48 monthly payments during term, remaining balance at term end (2027-08-01)
   - **Verify:** 
     - Payment #1, #24 (mid-term), #48 (end of term) amounts
     - Balance at term end matches calculator projections
     - Compare with TD Bank calculator

   **Test Case 3: Wilson Ave - Term Schedule (36 months)**
   - Loan: $426,382.10, Rate: 4.45%, Amortization: 30 years, Term: 36 months, Monthly
   - Start Date: 2025-01-22
   - **Expected:** 36 monthly payments during term, remaining balance at term end (2028-01-22)
   - **Verify:**
     - Payment #1, #18 (mid-term), #36 (end of term) amounts
     - Balance at term end matches calculator projections
     - Compare with RBC calculator

   **Test Case 4: Payment Date Boundary Cases**
   - Richmond St E: Start Date: 2019-02-04, Bi-weekly
     - Expected: Payments every 14 days from Feb 4, 2019
     - Verify: Dates are exactly 14 days apart (not approximate)
   - Wilson Ave: Start Date: 2025-01-22, Monthly
     - Expected: Payments on 22nd of each month
     - Verify: Dates handle month-end correctly (e.g., Jan 22, Feb 22, Mar 22, etc.)

**Deliverable:**
- Amortization schedule verification report
- Sample schedules with actual vs. expected values
- List of any date calculation or balance calculation errors
- Screenshots or data exports showing problematic schedules (if found)

---

### Phase 4: Data Processing & Storage Audit

**Task:** Verify that mortgage data is correctly processed, stored, and retrieved throughout the app.

1. **Database Schema**
   - [ ] Mortgage table schema includes all required fields
   - [ ] Data types are correct (DECIMAL for amounts, DATE for dates, etc.)
   - [ ] Foreign key relationships are correct (mortgage → property)
   - [ ] Indexes exist for performance (property_id, etc.)

2. **Data Transformation**
   - [ ] Interest rate is stored consistently (as decimal or percentage - verify which)
   - [ ] Rate conversion (percentage ↔ decimal) is handled correctly when storing/retrieving
   - [ ] Date formats are consistent (ISO format, timezone handling)
   - [ ] Amount values are stored with proper precision (not losing cents)

3. **API Endpoints**
   - [ ] GET mortgage endpoint returns all necessary fields
   - [ ] POST/PUT mortgage endpoints accept and validate all required fields
   - [ ] Validation schemas match form validation requirements
   - [ ] Error handling returns clear messages for validation failures

4. **Data Integrity**
   - [ ] No data loss when creating/updating mortgages
   - [ ] Mortgage updates reflect immediately in calculations
   - [ ] Historical mortgage data is preserved (if applicable)

**Deliverable:**
- Data flow diagram showing mortgage data from form → API → database → calculations
- List of any data transformation issues
- Verification that data stored matches data entered

---

### Phase 5: Integration & Display Audit

**Task:** Verify that mortgage data is correctly integrated into property and portfolio calculations, and displayed accurately to users.

1. **Property-Level Integration**
   - [ ] Monthly mortgage payment is correctly calculated for each property
   - [ ] Mortgage interest is separated from principal (for tax deduction purposes)
   - [ ] Cash flow calculations include mortgage payments correctly
   - [ ] NOI calculations exclude mortgage payments (correct - NOI is before debt service)
   - [ ] Mortgage balance is tracked correctly over time

2. **Portfolio-Level Integration**
   - [ ] Portfolio summary aggregates mortgage debt across all properties
   - [ ] Total mortgage payments are summed correctly
   - [ ] Average mortgage rate is calculated correctly (if displayed)
   - [ ] Portfolio cash flow includes all mortgage payments

3. **Display Accuracy**
   - [ ] Mortgage information displayed to users matches stored data
   - [ ] Payment amounts are formatted correctly ($X,XXX.XX format)
   - [ ] Interest rates are displayed as percentages (e.g., 5.25%, not 0.0525)
   - [ ] Dates are displayed in user-friendly format
   - [ ] Amortization schedules display correctly (tables, charts, etc.)

4. **Real-time Updates**
   - [ ] Changes to mortgage data update calculations immediately
   - [ ] Property metrics reflect mortgage changes
   - [ ] Portfolio metrics reflect mortgage changes

**Deliverable:**
- Integration test results
- List of any integration issues (wrong calculations, missing data, etc.)
- Screenshots showing correct/incorrect displays (if issues found)

---

## 📋 Audit Execution Instructions

### Step 1: Prepare Test Environment
1. Review the codebase structure (mortgage forms, calculators, API routes)
2. Identify all mortgage-related files (forms, utilities, API routes, database schemas)
3. Set up test cases with known mortgage parameters

### Step 2: Systematic Testing
1. Follow each phase in order (Data Collection → Calculations → Schedules → Processing → Integration)
2. For each checkmark item, test and document:
   - ✅ **PASS**: Works correctly, provide evidence
   - ❌ **FAIL**: Does not work correctly, provide:
     - Description of issue
     - Steps to reproduce
     - Expected vs. actual behavior
     - Severity (Critical, High, Medium, Low)
   - ⚠️ **PARTIAL**: Works but has limitations/issues, document them

### Step 3: Cross-Reference with Canadian Standards
1. Test calculations against Canadian lender calculators
2. Verify formulas match Canadian mortgage calculation standards
3. Document any discrepancies or areas where Bonzai differs from standards (and whether that's intentional)

### Step 4: Create Audit Report

Create a comprehensive report with:

1. **Executive Summary**
   - Overall assessment (Pass/Fail with issues)
   - Critical issues found (if any)
   - Key recommendations
   - **Assessment of Input Sufficiency:** Are current inputs sufficient for accurate calculations?

2. **Detailed Findings by Phase**
   - Phase 1: Data Collection Audit Results
   - Phase 2: Calculation Accuracy Audit Results
   - Phase 3: Amortization Schedule Accuracy Audit Results
   - Phase 4: Data Processing & Storage Audit Results
   - Phase 5: Integration & Display Audit Results

3. **Test Results**
   - Test case results (pass/fail with evidence)
   - **Detailed comparison tables** (Bonzai vs. professional Canadian calculators: RBC, TD, CIBC, BMO, Scotiabank)
   - Side-by-side comparisons showing:
     - Payment amounts
     - Balance at term end
     - Total interest over term
     - Any discrepancies (even small ones)

4. **Priority Action Items**
   - Critical issues (fix immediately)
   - High priority (fix soon)
   - Medium priority (improve when possible)
   - Low priority (nice-to-have improvements)

5. **Recommendations**
   - Specific fixes needed
   - Improvements suggested
   - Best practices to follow
   - **Input requirements:** What additional inputs (if any) are needed for 100% accuracy?

### Step 5: Create Recommendations Spreadsheet

**CRITICAL DELIVERABLE:** Create a spreadsheet summarizing all recommendations with the following columns:

| Priority | Category | Issue | Description | Impact | Recommendation | Files Affected | Estimated Effort | Status |
|----------|----------|-------|-------------|--------|----------------|----------------|------------------|--------|
| Critical | Data Collection | Missing field | [Description] | [Impact] | [Fix] | [Files] | [Hours] | [Status] |
| High | Calculations | [Issue] | [Description] | [Impact] | [Fix] | [Files] | [Hours] | [Status] |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

**Spreadsheet Format:**
- **Priority:** Critical / High / Medium / Low
- **Category:** Data Collection / Calculations / Amortization Schedule / Data Processing / Integration / Display
- **Issue:** Short title of the issue
- **Description:** Detailed description of the issue
- **Impact:** What happens if this isn't fixed (e.g., "Cascades errors to cash flow calculations")
- **Recommendation:** Specific fix or improvement needed
- **Files Affected:** List of files that need changes
- **Estimated Effort:** Time estimate (e.g., "2 hours", "1 day")
- **Status:** Open / In Progress / Resolved / Deferred

**Save as:** `MORTGAGE_AUDIT_RECOMMENDATIONS.csv` or `.xlsx`

---

## 🔑 Key Files to Review

Based on codebase analysis, focus on these files:

1. **Forms & Input:**
   - `src/components/mortgages/MortgageForm.jsx`
   - `src/components/mortgages/MortgageFormUpgraded.jsx`
   - `src/lib/validations/mortgage.schema.ts`

2. **Calculations:**
   - `src/utils/mortgageCalculator.ts` ⭐ **PRIMARY CALCULATOR**
   - `src/lib/mortgage-calculations.js` ⭐ **LEGACY CALCULATOR**

3. **Database:**
   - `migrations/001_initial_schema.sql` (mortgages table)

4. **API:**
   - `src/app/api/properties/[id]/mortgage/route.ts`

5. **Integration:**
   - `src/utils/financialCalculations.js` (cash flow, NOI)
   - `src/context/PropertyContext.tsx` (property-level integration)

6. **Documentation:**
   - `MORTGAGE_FEATURE_REVIEW.md` (previous review - use for reference)

---

## ⚠️ Critical Focus Areas

Based on previous review, pay special attention to:

1. **Term vs Amortization Validation** - Ensure term cannot exceed amortization
2. **Payment Date Accuracy** - Use actual calendar dates, not day intervals
3. **Semi-Monthly Payments** - Verify calculation method
4. **Canadian Semi-Annual Compounding** - Verify fixed-rate mortgages use this correctly
5. **Variable Rate Compounding** - Verify monthly compounding for variable rates
6. **Data Consistency** - Interest rate stored as decimal vs percentage consistently

---

## 🎓 Canadian Mortgage Calculation Resources

For reference, Canadian mortgages typically:
- Use **semi-annual compounding** for fixed-rate mortgages
- Use **monthly compounding** for variable-rate mortgages
- Allow payment frequencies: Monthly, Semi-monthly, Bi-weekly, Accelerated Bi-weekly, Weekly, Accelerated Weekly
- Round payments to the nearest cent
- Term (typically 5 years) is separate from Amortization (typically 25-30 years)

**Test Against:**
- RBC Mortgage Calculator
- TD Mortgage Calculator
- CIBC Mortgage Calculator
- Government of Canada mortgage calculators (if available)

---

## ✅ Success Criteria

The audit is successful when:

1. ✅ All required mortgage data fields are collected and validated
2. ✅ All calculations match Canadian mortgage standards (verified against industry calculators)
3. ✅ Amortization schedules are accurate (payment dates, balances, principal/interest allocation)
4. ✅ Mortgage data flows correctly through the app (forms → API → database → calculations)
5. ✅ Mortgage data integrates correctly with property and portfolio calculations
6. ✅ All critical issues are documented with clear steps to fix

---

## 📝 Notes for the Auditor

- **Be thorough but practical:** Focus on correctness over perfection
- **Document everything:** Even passing tests should have evidence
- **Prioritize critical issues:** Calculation errors are critical; UI improvements are lower priority
- **Provide actionable fixes:** When issues are found, suggest specific code changes
- **Use real test data:** Test with realistic Canadian mortgage scenarios
- **Compare with industry standards:** Validate against Canadian lender calculators

**Good luck with the audit!** 🚀
