# Frontend Data Entry Locations

This document maps where users enter data in the frontend and how it currently works vs. how it needs to work with the API.

## Current Data Entry Points

### 1. **Account Creation**
**Location:** `src/components/AccountSwitcher.jsx` (lines 211-256)

**Current Implementation:**
- User clicks "Create New Account" button
- Input field appears inline
- Calls `createNewAccount()` from AccountContext
- **Currently:** Uses localStorage via `accountStorage.js`
- **After API migration:** Already updated! Uses `apiClient.createAccount()`

**Status:** ✅ **Already using API** (via updated AccountContext)

---

### 2. **Property Creation**
**Location:** `src/app/my-properties/page.jsx` (line 242)

**Current Implementation:**
- "Add New Property" button exists
- **BUT:** Currently just logs to console: `console.log("Add new property")`
- **No form/modal exists yet!**

**Status:** ⚠️ **Needs Implementation** - Button exists but no functionality

**What needs to happen:**
- Create a "Create Property" modal/form
- Form should collect: nickname, address, purchasePrice, purchaseDate, etc.
- On submit, call `apiClient.createProperty()` or use PropertyContext

---

### 3. **Property Editing**
**Location:** `src/app/my-properties/[propertyId]/page.jsx` (lines 2270-2606)

**Current Implementation:**
- "Edit Property" button on property detail page (line 739)
- Opens `EditPropertyModal` component
- Form collects: name, address, type, units, squareFootage, purchasePrice, etc.
- Calls `onSave(formData)` callback
- **Currently:** Saves via PropertyContext's `updateProperty()`
- **After API migration:** PropertyContext uses AccountContext's `saveProperties()` which now uses API

**Status:** ✅ **Already using API** (indirectly via PropertyContext → AccountContext)

**File:** `src/app/my-properties/[propertyId]/page.jsx`
- Edit button: Line 739
- Modal component: Lines 2270-2606
- Form fields: Lines 2308-2450

---

### 4. **Expense Creation**
**Location:** `src/app/my-properties/[propertyId]/page.jsx` (lines 2470-2606)

**Current Implementation:**
- "Add Expense" button on property detail page (line 740)
- Opens `AddExpenseModal` component
- Form collects: category, amount, date, description
- **Currently:** Just logs to console: `console.log('Expense added:', expenseData)`
- **Does NOT save to database yet!**

**Status:** ⚠️ **Needs Implementation** - Form exists but doesn't save

**What needs to happen:**
- On submit, call `apiClient.createExpense(propertyId, expenseData)`
- Or add expense saving to PropertyContext

**File:** `src/app/my-properties/[propertyId]/page.jsx`
- Add Expense button: Line 740
- Modal component: Lines 2470-2606
- Form fields: Lines 2502-2606

---

### 5. **Mortgage Entry**
**Location:** `src/components/mortgages/MortgageFormUpgraded.jsx`

**Current Implementation:**
- Comprehensive mortgage form with validation
- Uses `useCreateMortgage` and `useUpdateMortgage` hooks
- **Currently:** Uses Firebase/mock data via `useMortgages` hook
- **Needs:** Update to use `apiClient.saveMortgage()`

**Status:** ⚠️ **Needs Update** - Form exists but uses old hooks

**File:** `src/components/mortgages/MortgageFormUpgraded.jsx`
- Form component: Lines 1-230+
- Uses: `@/hooks/useMortgages` (needs to be updated)

---

### 6. **User Registration/Login**
**Location:** 
- `src/app/signup/page.jsx` - Registration form
- `src/app/login/page.jsx` - Login form
- `src/app/page.jsx` - Modal versions (lines 181-224)

**Current Implementation:**
- Uses Firebase Auth via `useAuth()` hook
- **Needs:** Update to use `apiClient.register()` and `apiClient.login()`

**Status:** ⚠️ **Needs Update** - Currently uses Firebase, should use new API

---

## Summary: What Needs to Be Updated

### ✅ Already Working (Using API)
1. **Account Creation** - AccountSwitcher → AccountContext → API ✅
2. **Account Updates** - AccountSwitcher → AccountContext → API ✅
3. **Property Updates** - Property detail page → PropertyContext → AccountContext → API ✅

### ⚠️ Needs Implementation/Update

1. **Property Creation** 
   - **Location:** `src/app/my-properties/page.jsx` line 242
   - **Issue:** Button exists but no form/modal
   - **Action:** Create "Create Property" modal component
   - **Use:** `apiClient.createProperty()` or PropertyContext

2. **Expense Creation**
   - **Location:** `src/app/my-properties/[propertyId]/page.jsx` line 2195
   - **Issue:** Form exists but only logs to console
   - **Action:** Update `onSave` handler to call API
   - **Use:** `apiClient.createExpense(propertyId, expenseData)`

3. **Mortgage Entry**
   - **Location:** `src/components/mortgages/MortgageFormUpgraded.jsx`
   - **Issue:** Uses old `useMortgages` hook (Firebase/mock)
   - **Action:** Update to use `apiClient.saveMortgage(propertyId, mortgageData)`

4. **User Authentication**
   - **Location:** `src/app/login/page.jsx`, `src/app/signup/page.jsx`
   - **Issue:** Uses Firebase Auth
   - **Action:** Update to use `apiClient.login()` and `apiClient.register()`

---

## Data Flow Diagram

```
User Action → Component → Context/Hook → API Client → API Endpoint → Database
```

**Current Flow (Some Places):**
```
User Action → Component → localStorage (accountStorage.js)
```

**New Flow (After Updates):**
```
User Action → Component → Context → apiClient → /api/* → Neon DB
```

---

## Quick Reference: File Locations

| Data Entry Type | File Location | Line Numbers | Status |
|----------------|---------------|--------------|--------|
| Account Creation | `src/components/AccountSwitcher.jsx` | 211-256 | ✅ Using API |
| Property Creation | `src/app/my-properties/page.jsx` | 242 | ⚠️ Needs form |
| Property Edit | `src/app/my-properties/[propertyId]/page.jsx` | 2270-2606 | ✅ Using API |
| Expense Creation | `src/app/my-properties/[propertyId]/page.jsx` | 2470-2606 | ⚠️ Needs API call |
| Mortgage Entry | `src/components/mortgages/MortgageFormUpgraded.jsx` | 1-230+ | ⚠️ Needs update |
| User Registration | `src/app/signup/page.jsx` | 42-81 | ⚠️ Needs update |
| User Login | `src/app/login/page.jsx` | 1-49 | ⚠️ Needs update |

---

## Next Steps

1. **Update Expense Creation** - Add API call in AddExpenseModal's onSave
2. **Create Property Creation Form** - Build modal for "Add New Property"
3. **Update Mortgage Form** - Replace useMortgages hook with apiClient
4. **Update Auth Forms** - Replace Firebase with new API endpoints

