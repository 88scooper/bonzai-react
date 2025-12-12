# My Properties Page UX Reorganization Prompt

## Critical Principle: Data Preservation

**ALL existing data and calculations MUST be preserved.** This is a UX reorganization only - reorganizing how the existing information is presented, not adding new features or removing data.

## Current Data Inventory (ALL must be preserved)

### Property Card Currently Displays:
1. **Property Image** - Full-width aspect-square image at top
2. **Property Name** - `property.nickname || property.name`
3. **Property Address** - `property.address`
4. **Purchase Price** - `property.purchasePrice`
5. **Units** - `property.units || 1`
6. **Monthly Rent** - `property.rent.monthlyRent`
7. **Monthly Expenses** - `property.monthlyExpenses?.total || 0`
8. **Monthly Cash Flow** - `property.monthlyCashFlow` (already calculated)
9. **Annual Cash Flow** - `property.annualCashFlow || (monthlyCashFlow * 12)`
10. **Rent Per Sq Ft** - Calculated from `property.size || property.squareFootage` and monthly rent
11. **Current Value** - `property.currentMarketValue || property.currentValue || 0`
12. **Cap Rate** - `property.capRate`
13. **Cash on Cash Return** - Calculated from annual cash flow and total initial cash invested
14. **DSCR** - Calculated from NOI and annual debt service
15. **IRR** - Calculated with adjustable years (3Y, 5Y, 10Y, 15Y, 20Y)

### Existing Calculations (ALL must be maintained):
- `monthlyCashFlow` from property
- `annualCashFlow` calculation
- `capRate` from property
- `rentPerSqFt` calculation
- `totalInitialCashInvested` (down payment + closing costs + initial renovations)
- `cashOnCashReturn` percentage calculation
- `dscr` calculation (NOI / annual debt service)
- `irr` calculation with adjustable years selector
- `currentValue` and gain calculation
- `annualRevenue` (monthly rent × 12)
- `annualDebtService` calculation
- `noi` (Net Operating Income) calculation

### Existing Functions (Preserve):
- `calculateYoYChange()` - exists but not currently displayed
- `getRevenueForPeriod()` - exists but not currently displayed
- `getExpensesForPeriod()` - exists but not currently displayed
- `calculateYoYChanges()` - exists but not currently displayed
- `KeyMetricCard` component with tooltips and status indicators

## UX Reorganization Goals

Reorganize the existing data presentation to improve:
1. **Visual Hierarchy** - Most important metrics stand out
2. **Scannability** - Users can quickly assess property performance
3. **Information Clarity** - Clear grouping and relationships between metrics
4. **Progressive Disclosure** - Primary info prominent, secondary info accessible

## Reorganization Requirements

### 1. Property Card Layout Reorganization

**Current Layout Issues:**
- Image at top takes significant space
- Property details (Purchase Price, Units, Monthly Rent, Monthly Expenses, Cash Flow, Rent/Sq Ft) are in a flat 2×3 grid
- Key metrics (Cap Rate, Cash on Cash, DSCR, IRR) are separated at bottom
- No clear visual hierarchy between primary and secondary metrics

**Proposed Reorganization:**

**Section 1: Header (Property Identity)**
- Property name (keep as-is)
- Property address (keep as-is)
- Property image - consider making it smaller or moving to side, OR keep but reduce prominence

**Section 2: Primary Financial Metrics (Hero Section - Most Prominent)**
Reorganize these existing metrics for maximum impact:
- **Monthly Cash Flow** - Largest display, color-coded (green/red)
- **Annual Cash Flow** - Secondary but prominent (showing "Annual: $X" below monthly)
- **Current Value** - Show with gain/loss indicator (using existing `currentValue - property.purchasePrice`)
- Consider horizontal layout for these three primary metrics

**Section 3: Income & Expense Summary (Quick Overview)**
Group related metrics together:
- **Monthly Rent** - `property.rent.monthlyRent`
- **Monthly Expenses** - `property.monthlyExpenses?.total`
- **Rent/Sq Ft** - Keep existing calculation

**Section 4: Performance Metrics (Key ROI Indicators)**
Keep existing 2×2 grid but improve visual treatment:
- **Cap Rate** - Keep existing tooltip and status
- **Cash on Cash** - Keep existing tooltip and status  
- **DSCR** - Keep existing tooltip and status
- **IRR** - Keep existing adjustable years selector and status

**Section 5: Property Details (Secondary Information)**
- **Purchase Price** - `property.purchasePrice`
- **Units** - `property.units || 1`
- Consider smaller text or less prominent placement

### 2. Visual Hierarchy Improvements

**Size & Emphasis:**
- Primary metrics (Cash Flow, Current Value): Larger text, bold, color-coded
- Secondary metrics (Income/Expenses): Medium text
- Performance metrics: Keep current size but improve grouping
- Property details: Smaller text, less prominent

**Color Coding (Use Existing Patterns):**
- Positive cash flow: Emerald green (`text-emerald-600 dark:text-emerald-400`)
- Negative cash flow: Red (`text-red-600 dark:text-red-400`)
- Rent/Income: Blue tones (keep existing)
- Expenses: Red tones (keep existing)
- Performance status: Use existing `statusTone` system (positive/neutral/warning)

**Spacing & Grouping:**
- Group related metrics with visual separation (borders, backgrounds)
- Increase spacing between major sections
- Reduce visual clutter in dense information areas

### 3. Card Structure Reorganization Options

**Option A: Vertical Stack with Clear Sections**
```
[Image - smaller or side panel]
[Property Name & Address]
[PRIMARY METRICS BAR - Cash Flow, Value, Annual Flow - horizontal]
[Income/Expense Summary - 2-3 column grid]
[Performance Metrics - 2×2 grid with existing styling]
[Property Details - smaller text at bottom]
```

**Option B: Horizontal Layout**
```
[Image - left column, 30% width]
[Content - right column, 70% width]
  [Name & Address]
  [PRIMARY METRICS - large, horizontal]
  [Secondary metrics in organized groups below]
```

**Option C: Progressive Disclosure**
```
[Compact View - Image, Name, Primary Metrics only]
[Expandable Section - "View Details" toggles secondary metrics]
```

### 4. Maintain Existing Functionality

**Critical - Must Keep:**
- ✅ Property card click-through to detail page (`/my-properties/${property.id}`)
- ✅ All tooltips on KeyMetricCard components
- ✅ Status indicators (Strong/Moderate/Low, Healthy/Adequate/Risk)
- ✅ IRR years selector dropdown (keep `onClick={(e) => e.stopPropagation()}`)
- ✅ Hover effects and transitions
- ✅ Dark mode support
- ✅ Responsive grid (2 columns on desktop, 1 on mobile)
- ✅ Empty state message and "Add First Property" button
- ✅ Loading state
- ✅ "Add New Property" button in header

### 5. Page-Level Organization

**Keep Existing:**
- Page header with title and description
- "Add New Property" button placement
- Empty state handling
- Loading state

**Consider (Optional - No New Data):**
- Aggregate summary at top showing totals (calculated from existing properties array):
  - Total properties count: `properties.length`
  - Total monthly cash flow: Sum of all `property.monthlyCashFlow`
  - Total annual cash flow: Sum of all annual cash flows
  - Average cap rate: Average of all `property.capRate`

### 6. Design System Consistency

**Match Portfolio Summary Patterns:**
- Use same gradient backgrounds for metric cards
- Use same status tone system (positive/neutral/warning)
- Use same border styles: `border-black/10 dark:border-white/10`
- Use same tooltip patterns with info icons
- Use same spacing scale (gap-4, gap-6, p-4, p-5)
- Use same color palette:
  - Primary: #205A3E (emerald)
  - Positive: emerald tones
  - Warning: amber tones
  - Negative: red tones

## Implementation Constraints

**DO NOT:**
- ❌ Remove any existing data points
- ❌ Remove any existing calculations
- ❌ Change calculation logic
- ❌ Add new data requirements or API calls
- ❌ Remove existing functionality (tooltips, status indicators, IRR selector)
- ❌ Change navigation behavior
- ❌ Break existing responsive behavior

**DO:**
- ✅ Reorganize visual layout and hierarchy
- ✅ Improve spacing and grouping
- ✅ Enhance visual prominence of key metrics
- ✅ Maintain all existing calculations and data display
- ✅ Keep all interactive elements functional
- ✅ Preserve dark mode compatibility

## Success Criteria

After reorganization, users should:
1. **Quickly identify** the most important metric (cash flow) for each property
2. **Easily compare** primary financial metrics across properties
3. **Understand** the relationship between rent, expenses, and cash flow
4. **Access** all existing information without scrolling/expanding on desktop
5. **Maintain** all current functionality (tooltips, status indicators, navigation)

## Technical Implementation Notes

- Maintain all existing hooks: `useProperties()`, `usePropertyContext()`
- Keep all existing formatting: `formatCurrency()`, `formatPercentage()`
- Preserve all state management (e.g., `irrYears` state)
- Keep existing component structure, just reorganize JSX layout
- Maintain all existing className patterns and Tailwind utilities
- Keep existing Image component usage and unoptimized flag

---

**Brand Colors Reference:**
- Primary: #205A3E (emerald green)
- Positive: `text-emerald-600 dark:text-emerald-400`
- Warning: `text-amber-700 dark:text-amber-300`
- Negative: `text-red-600 dark:text-red-400`
- Neutral: gray tones

**Typography:**
- Primary metrics: `text-2xl` or `text-3xl`, `font-bold`
- Secondary metrics: `text-lg`, `font-semibold`
- Labels: `text-xs`, `text-gray-500 dark:text-gray-400`
- Body: `text-sm`, `text-gray-900 dark:text-white`

