# 💾 Saved Scenarios Feature - Documentation

## Overview

Users can now save, load, compare, and manage multiple scenario configurations for each property. This allows for easy comparison of different market conditions and investment strategies over time.

## Features Implemented

### 1. **Save Scenario Button** 💾
Located in the Assumptions Panel, users can click "Save Scenario" to save their current assumptions.

**Features:**
- Prominent blue button at the bottom of the Assumptions Panel
- Only appears when a property is selected
- Opens a modal for naming the scenario

### 2. **Save Scenario Modal** 📝
A clean, user-friendly modal for naming and saving scenarios.

**Features:**
- **Property Display** - Shows which property the scenario is for
- **Name Input** - Required field with validation
- **Assumptions Summary** - Preview of all current assumptions being saved
- **Validation:**
  - Name must be at least 3 characters
  - Name must be less than 50 characters
  - Name must be unique per property
  - Cannot save without a name
- **Error Handling** - Clear error messages for validation failures
- **Keyboard Support** - Enter to save, Escape to cancel
- **Loading State** - Shows spinner while saving

### 3. **Saved Scenarios Panel** 📚
Displays all saved scenarios for the selected property in a scrollable list.

**Features:**
- **Scenario Cards** - Each scenario shows:
  - Name with "Current" badge if currently loaded
  - Save date
  - All 5 assumptions at a glance
  - Load and Delete buttons
- **Load Scenario** - Click "Load" to apply saved assumptions
- **Delete Scenario** - Two-step delete with confirmation
- **Current Indicator** - Highlights the scenario that matches current assumptions
- **Empty State** - Helpful message when no scenarios are saved
- **Refresh Button** - Manual refresh capability
- **Auto-scroll** - Max height with scrolling for many scenarios

### 4. **LocalStorage Management** 🗄️
Efficient browser storage system for persisting scenarios.

**Storage Features:**
- Uses browser localStorage for persistence
- Data survives browser refresh and restart
- Organized by property ID
- Includes metadata (created date, updated date)
- Safe error handling for storage failures

## User Flow

### Saving a Scenario

1. **Adjust Assumptions** in the Assumptions Panel
2. **Click "Save Scenario"** button
3. **Enter a Name** (e.g., "Bull Market 2025", "Conservative Forecast")
4. **Review Summary** of assumptions being saved
5. **Click "Save Scenario"** in modal
6. **Success!** Scenario appears in Saved Scenarios Panel

### Loading a Scenario

1. **Scroll** through Saved Scenarios Panel
2. **Find** the scenario you want to analyze
3. **Click "Load"** button
4. **Instantly** see all assumptions update
5. **Observe** how metrics change in the dashboard

### Deleting a Scenario

1. **Find** scenario in Saved Scenarios Panel
2. **Click "Delete"** button
3. **Click "Confirm"** to finalize deletion
4. **Click "Cancel"** to abort

## Visual Design

### Saved Scenarios Panel Layout

```
┌────────────────────────────────┐
│ 🎯 Saved Scenarios    ↻       │
│ 3 scenarios saved for property │
├────────────────────────────────┤
│ ┌────────────────────────────┐ │
│ │ Bull Market Scenario       │ │
│ │ 📅 Saved Jan 15, 2025      │ │
│ │                            │ │
│ │ Rent: 4.0%  Expenses: 2.5% │ │
│ │ Appreciation: 5.0%         │ │
│ │ Vacancy: 3.0%              │ │
│ │                            │ │
│ │ [Load] [Delete]            │ │
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │ Conservative Case [Current]│ │
│ │ 📅 Saved Jan 14, 2025      │ │
│ │                            │ │
│ │ Rent: 1.5%  Expenses: 3.0% │ │
│ │ Appreciation: 2.0%         │ │
│ │ Vacancy: 8.0%              │ │
│ │                            │ │
│ │ [Delete]                   │ │
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │ Moderate Growth            │ │
│ │ 📅 Saved Jan 10, 2025      │ │
│ │                            │ │
│ │ Rent: 2.5%  Expenses: 2.5% │ │
│ │ Appreciation: 3.5%         │ │
│ │ Vacancy: 5.0%              │ │
│ │                            │ │
│ │ [Load] [Delete]            │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

### Save Scenario Modal

```
┌────────────────────────────────────┐
│ 💾 Save Scenario              [X] │
├────────────────────────────────────┤
│ Save your current assumptions as a │
│ named scenario for future          │
│ reference and comparison.          │
│                                    │
│ Property: Richmond St E            │
│                                    │
│ Scenario Name *                    │
│ [Enter scenario name...          ] │
│                                    │
│ Current Assumptions:               │
│ Rent: 2.0%    Expenses: 2.5%      │
│ Appreciation: 3.0%  Vacancy: 5.0% │
│                                    │
│ [Cancel]         [💾 Save Scenario]│
└────────────────────────────────────┘
```

## Technical Implementation

### File Structure

```
src/
├── lib/
│   └── scenario-storage.js          ✨ NEW - Storage utilities
├── components/
│   └── calculators/
│       ├── SaveScenarioModal.jsx     ✨ NEW - Save modal
│       ├── SavedScenariosPanel.jsx   ✨ NEW - Scenarios list
│       └── AssumptionsPanel.jsx      ✏️ MODIFIED - Added save button
└── app/
    └── analytics/
        └── page.jsx                   ✏️ MODIFIED - Integrated all components
```

### Data Structure

Each saved scenario contains:

```javascript
{
  id: "1705345678901",              // Unique timestamp ID
  name: "Bull Market Scenario",     // User-provided name
  propertyId: "richmond-st-e-403",  // Property this scenario is for
  propertyName: "Richmond St E",    // Property display name
  assumptions: {                     // Saved assumptions
    annualRentIncrease: 4.0,
    annualExpenseInflation: 2.5,
    annualPropertyAppreciation: 5.0,
    vacancyRate: 3.0,
    futureInterestRate: 5.0
  },
  createdAt: "2025-01-15T10:30:00Z", // ISO timestamp
  updatedAt: "2025-01-15T10:30:00Z"  // ISO timestamp
}
```

### Storage API

#### Save Scenario
```javascript
import { saveScenario } from '@/lib/scenario-storage';

const success = saveScenario({
  name: "My Scenario",
  propertyId: property.id,
  propertyName: property.nickname,
  assumptions: currentAssumptions
});
```

#### Get Scenarios
```javascript
import { getSavedScenarios, getScenariosByProperty } from '@/lib/scenario-storage';

// Get all scenarios
const allScenarios = getSavedScenarios();

// Get scenarios for specific property
const propertyScenarios = getScenariosByProperty(propertyId);
```

#### Delete Scenario
```javascript
import { deleteScenario } from '@/lib/scenario-storage';

const success = deleteScenario(scenarioId);
```

#### Check Name Exists
```javascript
import { scenarioNameExists } from '@/lib/scenario-storage';

const exists = scenarioNameExists("Bull Market", propertyId);
```

## Use Cases & Examples

### Use Case 1: Compare Bull vs Bear Markets
1. Start with default assumptions
2. Save as "Baseline Scenario"
3. Adjust for optimistic market (rent +4%, appreciation +5%)
4. Save as "Bull Market"
5. Load "Baseline Scenario"
6. Adjust for pessimistic market (rent +1%, vacancy 10%)
7. Save as "Bear Market"
8. Load each scenario to compare outcomes

### Use Case 2: Model Different Interest Rate Scenarios
1. Set all assumptions except interest rate
2. Save "Rate at 4%", "Rate at 5%", "Rate at 6%", "Rate at 7%"
3. Load each to see impact on cash flow
4. Make informed decision on rate lock strategy

### Use Case 3: Plan for Different Exit Strategies
1. Save "5-Year Hold" with moderate assumptions
2. Save "10-Year Hold" with aggressive appreciation
3. Save "Quick Flip" with conservative estimates
4. Compare total profits under each scenario

### Use Case 4: Track Assumptions Over Time
1. Save "2025 Q1 Forecast" with current market data
2. Update quarterly with new data
3. Compare actual performance vs predictions
4. Refine forecasting methodology

## Benefits

### For Users
✅ **Quick Comparisons** - Switch between scenarios in one click  
✅ **Strategic Planning** - Model multiple futures  
✅ **Risk Assessment** - Understand best/worst cases  
✅ **Documentation** - Keep record of your thinking  
✅ **Time Saving** - No need to re-enter assumptions  
✅ **Learning** - See how assumptions impact returns  

### For Portfolio Management
✅ **Scenario Library** - Build collection of market conditions  
✅ **What-If Analysis** - Test various assumptions quickly  
✅ **Decision Support** - Data-driven investment decisions  
✅ **Stress Testing** - Model extreme scenarios  
✅ **Performance Tracking** - Compare predictions vs reality  

## Best Practices

### Naming Conventions
- ✅ **Descriptive**: "Moderate Growth 2025" not "Scenario 1"
- ✅ **Include Context**: "Post-Rate-Cut Optimistic"
- ✅ **Date References**: "Q1 2025 Conservative"
- ✅ **Clear Purpose**: "Best Case", "Worst Case", "Most Likely"

### Scenario Organization
- 📁 **Create Categories**: Bull/Bear/Base for each property
- 📊 **Use Consistently**: Same naming pattern across properties
- 🗑️ **Clean Up Regularly**: Delete outdated scenarios
- 📝 **Document Reasoning**: Use descriptive names that explain logic

### Analysis Workflow
1. **Start with Baseline** - Always save current market assumptions
2. **Create Variations** - Model +/- changes from baseline
3. **Test Extremes** - Save best and worst case scenarios
4. **Compare Results** - Load each and review dashboard
5. **Make Decisions** - Choose strategy based on scenario analysis

## Future Enhancements (Potential)

- 📊 **Scenario Comparison Table** - Side-by-side metrics for multiple scenarios
- 📈 **Overlay Charts** - Multiple scenario lines on one chart
- 📤 **Export Scenarios** - Download as CSV/Excel
- 📥 **Import Scenarios** - Upload scenario library
- 🔄 **Share Scenarios** - Send to colleagues/advisors
- 🏷️ **Tags/Categories** - Organize scenarios with labels
- 🔔 **Scenario Alerts** - Notify when assumptions deviate from saved scenarios
- 📊 **Probability Weighting** - Assign likelihood to each scenario
- 🎯 **Goal Tracking** - Set target metrics and see which scenarios achieve them

## Performance Considerations

- ✅ **Lightweight Storage** - LocalStorage is fast for small datasets
- ✅ **No Backend Required** - Instant save/load, no network latency
- ✅ **Efficient Rendering** - Uses React keys for optimal updates
- ✅ **Memory Efficient** - Only loads scenarios for current property
- ⚠️ **Storage Limits** - LocalStorage has ~5-10MB limit (sufficient for 1000+ scenarios)

## Browser Compatibility

- ✅ **Chrome/Edge** - Full support
- ✅ **Firefox** - Full support
- ✅ **Safari** - Full support
- ✅ **Mobile Browsers** - Full support
- ⚠️ **Private/Incognito** - Data cleared when window closed
- ⚠️ **Multiple Devices** - Scenarios not synced (device-specific)

## Troubleshooting

### Scenarios Not Saving
- Check browser storage permissions
- Ensure sufficient storage space
- Try different browser
- Check browser console for errors

### Scenarios Not Loading
- Check if localStorage is enabled
- Verify property ID matches
- Try refreshing the page
- Clear browser cache if needed

### Duplicate Names
- Each property can have scenarios with same name as other properties
- Within a property, names must be unique
- Error message guides you to choose different name

## Conclusion

The saved scenarios feature transforms the sensitivity analysis tool into a comprehensive scenario planning platform. Users can now build a library of different market conditions, quickly switch between them, and make informed investment decisions based on thorough "what-if" analysis.

**Pro Tip:** Start every property analysis by creating three scenarios: "Optimistic", "Realistic", and "Conservative". This gives you a clear range of potential outcomes and helps set realistic expectations.

---

**Built with ❤️ for Bonzai** - Making real estate investment analysis more powerful and accessible.

