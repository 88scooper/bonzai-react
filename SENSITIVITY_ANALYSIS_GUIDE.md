# Sensitivity Analysis Tool - Implementation Guide

## Overview

We've built a world-class sensitivity analysis tool for the `/analytics` page that allows users to model different investment scenarios and understand how various assumptions impact their real estate returns over a 10-year period.

## Features Implemented

### 1. **Assumptions Panel** 📊
Located in: `/src/components/calculators/AssumptionsPanel.jsx`

A user-friendly control panel featuring:
- **Annual Rent Increase (%)** - Expected yearly growth in rental income
- **Annual Expense Inflation (%)** - Expected yearly growth in operating expenses
- **Annual Property Value Appreciation (%)** - Expected yearly property value growth
- **Vacancy Rate (%)** - Expected percentage of vacant time
- **Future Interest Rate (%)** - Expected mortgage rate for renewals

**Key Features:**
- Interactive number inputs with % suffixes
- Helpful tooltips (?) explaining each parameter
- "Reset to Defaults" button
- Clean, responsive design matching existing app styles

### 2. **Baseline Forecast Chart** 📈
Located in: `/src/components/calculators/BaselineForecast.jsx`

A 10-year projection chart showing:
- **Net Cash Flow** (green line) - Annual cash flow after all expenses
- **Mortgage Balance** (red line) - Declining mortgage debt
- **Total Equity** (blue line) - Growing equity position

**Key Features:**
- Interactive chart with hover tooltips showing exact values
- Static baseline using default assumptions
- Summary cards showing Year 10 metrics
- Responsive design with Recharts library

### 3. **Sensitivity Analysis Dashboard** 🎯
Located in: `/src/components/calculators/SensitivityDashboard.jsx`

Side-by-side comparison of scenarios featuring:

**Three Key Return Metrics:**
1. **10-Year IRR (Internal Rate of Return)**
   - Annualized return considering all cash flows and appreciation
   - Most comprehensive measure of investment performance

2. **Average Annual Cash Flow**
   - Mean net cash flow per year over 10 years
   - Indicates ongoing income potential

3. **Total Profit at Sale (Year 10)**
   - Total profit if property sold at end of year 10
   - Includes equity + cumulative cash flow - initial investment

**Key Features:**
- Three-column comparison: Baseline | New Scenario | % Change
- Conditional styling:
  - 🟢 **Green** for better performance
  - 🔴 **Red** for worse performance
  - ⚪ **Gray** for no significant change
- Visual indicators (arrows) showing direction of change
- "Key Insights" section with actionable intelligence
- Real-time updates as user adjusts assumptions

### 4. **Core Calculation Library** 🧮
Located in: `/src/lib/sensitivity-analysis.js`

Utility functions for:
- **IRR Calculation** - Newton-Raphson method for accurate IRR
- **NPV Calculation** - Net Present Value calculations
- **10-Year Forecast Generation** - Projects all financial metrics
- **Scenario Comparison** - Calculates differences and percentage changes
- **Chart Data Formatting** - Prepares data for visualization

**Calculation Features:**
- Accounts for:
  - Rent growth with vacancy allowance
  - Expense inflation
  - Property appreciation
  - Mortgage amortization
  - Compound interest effects
  - Current mortgage balance using actual amortization schedules

### 5. **Integrated Analytics Page** 🎨
Located in: `/src/app/analytics/page.jsx`

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Property Selector Dropdown                     │
├───────────────┬─────────────────────────────────┤
│               │                                 │
│  Assumptions  │  Baseline Forecast Chart        │
│  Panel        │                                 │
│               ├─────────────────────────────────┤
│  (Left        │  Sensitivity Dashboard          │
│   Sidebar)    │  (Side-by-side comparison)      │
│               │                                 │
└───────────────┴─────────────────────────────────┘
```

**Key Features:**
- Property selector dropdown at the top
- Responsive grid layout (mobile: stacked, desktop: side-by-side)
- New "Sensitivity Analysis" tab added to existing tabs
- Seamless integration with existing Portfolio Analytics and Insights tabs

## Technical Implementation

### Technology Stack
- **React** - Component framework
- **Next.js** - App framework with server/client rendering
- **Recharts** - Chart visualization library
- **Tailwind CSS** - Styling (using existing app classes)
- **Lucide React** - Icons

### Styling Consistency
All components use the existing app's design system:
- Colors: blue-600, emerald-600, red-600 for primary actions
- Dark mode support with `dark:` classes
- Consistent border radius (rounded-lg)
- Standard padding and spacing
- Existing font families and weights

### Data Flow
```
Properties (from PropertyContext)
         ↓
Selected Property + Assumptions
         ↓
Sensitivity Analysis Library
         ↓
Forecast Generation + Metrics Calculation
         ↓
Components (Charts + Dashboards)
```

## Usage Instructions

### For Users:

1. **Navigate** to the `/analytics` page
2. **Select** the "Sensitivity Analysis" tab (🎯)
3. **Choose** a property from the dropdown
4. **Adjust** assumptions in the left panel
5. **Observe** real-time updates in:
   - The comparison dashboard showing how metrics change
   - The Key Insights section providing actionable feedback

### For Developers:

**To modify assumptions:**
```javascript
// Edit DEFAULT_ASSUMPTIONS in /src/lib/sensitivity-analysis.js
export const DEFAULT_ASSUMPTIONS = {
  annualRentIncrease: 2.0,
  annualExpenseInflation: 2.5,
  annualPropertyAppreciation: 3.0,
  vacancyRate: 5.0,
  futureInterestRate: 5.0,
};
```

**To add new metrics:**
1. Add calculation to `calculateReturnMetrics()` in `sensitivity-analysis.js`
2. Add metric object to `metrics` array in `SensitivityDashboard.jsx`
3. Include formatter and comparison logic

**To customize the forecast chart:**
- Edit `BaselineForecast.jsx`
- Add/remove `<Line>` components in the `<LineChart>`
- Update colors and styling

## Key Financial Formulas

### IRR (Internal Rate of Return)
Uses Newton-Raphson iterative method:
```
NPV = Σ (Cash Flow_t / (1 + IRR)^t) = 0
```

### Cash Flow Projection
```
Year N Cash Flow = 
  (Rent × (1 + Rent Growth)^N × (1 - Vacancy Rate)) -
  (Operating Expenses × (1 + Expense Inflation)^N) -
  Mortgage Payment
```

### Property Value
```
Year N Value = Current Value × (1 + Appreciation Rate)^N
```

### Total Equity
```
Equity = Property Value - Mortgage Balance
```

## Future Enhancements (Suggestions)

1. **Export to PDF** - Generate downloadable reports
2. **Save Scenarios** - Allow users to save and compare multiple scenarios
3. **Monte Carlo Simulation** - Add probabilistic modeling
4. **Tax Implications** - Include tax calculations in projections
5. **Refinancing Scenarios** - Model the impact of refinancing
6. **Multiple Properties** - Portfolio-level sensitivity analysis
7. **Custom Time Horizons** - Allow 5, 15, or 20-year projections

## Files Created/Modified

### New Files:
- `/src/lib/sensitivity-analysis.js` - Core calculation library
- `/src/components/calculators/AssumptionsPanel.jsx` - Input controls
- `/src/components/calculators/BaselineForecast.jsx` - Chart component
- `/src/components/calculators/SensitivityDashboard.jsx` - Comparison dashboard

### Modified Files:
- `/src/app/analytics/page.jsx` - Integrated all new components

## Testing Recommendations

1. **Test with different properties** - Ensure calculations work for all properties
2. **Test extreme values** - Try 0%, 100%, negative values in assumptions
3. **Test responsiveness** - Verify layout on mobile, tablet, desktop
4. **Test dark mode** - Ensure all colors/styles work in dark mode
5. **Cross-browser testing** - Test in Chrome, Firefox, Safari

## Performance Considerations

- Calculations memoized with `useMemo` to prevent unnecessary recalculations
- Chart data formatted only when property or assumptions change
- Lightweight calculation library (no heavy dependencies)
- Efficient IRR algorithm with early termination

## Conclusion

This sensitivity analysis tool provides users with powerful insights into how different market conditions and assumptions impact their real estate investments. The implementation follows React best practices, maintains design consistency with the existing application, and provides an intuitive, professional user experience.

**Built with ❤️ for Bonzai**

