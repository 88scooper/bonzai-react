# Property Assignment Plan

## Overview

This document outlines what's required to assign properties to the correct accounts.

## Property Assignment Requirements

### Demo Account
Should contain:
- **First St** (from `src/data/properties.js`, id: `first-st-1`)
- **Second Dr** (from `src/data/properties.js`, id: `second-dr-1`)
- **Third Avenue** (from `src/data/properties.js`, id: `third-ave-1`)

### SC Properties Account
Should contain:
- **403-311 Richmond St E** (from `src/data/scProperties.js`, id: `richmond-st-e-403`)
- **317-30 Tretti Way** (from `src/data/scProperties.js`, id: `tretti-way-317`)
- **415-500 Wilson Ave** (from `src/data/scProperties.js`, id: `wilson-ave-415`)

## Current Status

### Data Location
- Properties are currently stored in **code files**:
  - `src/data/properties.js` - Contains First St, Second Dr, Third Avenue
  - `src/data/scProperties.js` - Contains Richmond St E, Tretti Way, Wilson Ave

### Database Status
- ✅ User account exists: `cooper.stuartc@gmail.com`
- ✅ SC Properties account exists in database
- ⚠️ Demo account needs to be created
- ⚠️ Properties are NOT yet in the database (still in code files)

## What's Required

### Step 1: Create Demo Account
- Create a new account named "Demo Account" with `is_demo: true`
- Link it to the user account

### Step 2: Import Properties from Code
- Import properties from `src/data/properties.js` → Demo Account
- Import properties from `src/data/scProperties.js` → SC Properties Account
- For each property, also import:
  - Mortgage data (if exists)
  - Expense history (if exists)

### Step 3: Verify Assignment
- Check that properties are correctly assigned to accounts
- Verify all data (mortgages, expenses) are imported

## Implementation

### Option 1: Use Import UI (Recommended)
1. Go to `/import-properties` page
2. Ensure Demo Account exists (create if needed)
3. Select SC Properties account
4. Click "Import Properties"
5. Review results

### Option 2: Programmatic Import
Run the import script programmatically:
```typescript
import { importPropertiesFromCode } from '@/lib/import-properties-from-code';

const demoAccountId = '...'; // Demo account ID
const scAccountId = '...'; // SC Properties account ID

await importPropertiesFromCode(demoAccountId, scAccountId, (msg) => console.log(msg));
```

## Files Created

1. **`src/lib/import-properties-from-code.ts`**
   - Import logic for properties from code files
   - Maps properties to API format
   - Handles mortgages and expenses

2. **`src/app/import-properties/page.tsx`**
   - UI page at `/import-properties`
   - Account selection
   - Import progress and results

## Next Steps

1. **Create Demo Account** (if not exists)
2. **Run Import** via `/import-properties` page
3. **Verify** properties are assigned correctly
4. **Test** that properties appear in the correct accounts

## Notes

- Properties in code files will remain as reference
- After import, properties will be in the database
- The app will use database properties going forward
- Code file properties can be kept as backup/reference

