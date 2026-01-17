# Dark Mode Testing Report

## Date: 2025-01-25

## Overview

The Bonzai app has **two separate dark mode implementations** that are **not synchronized**. This creates a conflict where changes in one system don't affect the other.

---

## Implementation Analysis

### 1. Layout Component Dark Mode (WORKING)
**Location:** `src/components/Layout.jsx`

**How it works:**
- Uses local state: `const [isDark, setIsDark] = useState(false)`
- Reads from localStorage key: `"theme"` (values: `"dark"` or `"light"`)
- Applies to document: `document.documentElement.classList.add/remove("dark")`
- Toggle function: `toggleDarkMode()` at line 63
- UI Control: Toggle switch in user dropdown menu (lines 127-145)

**Storage:**
```javascript
localStorage.getItem("theme")  // Returns "dark" or "light"
localStorage.setItem("theme", "dark" or "light")
```

**Status:** ✅ **FUNCTIONAL** - This implementation actually applies dark mode to the document.

---

### 2. SettingsContext Dark Mode (PARTIALLY IMPLEMENTED)
**Location:** `src/context/SettingsContext.jsx` and `src/components/SettingsModal.jsx`

**How it works:**
- Uses SettingsContext: `const { darkMode } = useSettings()`
- Reads from localStorage key: `"bonzai_settings"` (JSON object with `darkMode` property)
- Values: `null` (system), `true` (dark), or `false` (light)
- UI Control: Three buttons in Settings Modal (Monitor/Sun/Moon icons)

**Storage:**
```javascript
localStorage.getItem("bonzai_settings")  // Returns JSON string
// Example: {"currencyDecimals": false, "percentageDecimals": false, "darkMode": true}
```

**Status:** ⚠️ **NOT FULLY FUNCTIONAL** - The setting can be saved/loaded, but there's **NO CODE** that applies `darkMode` from SettingsContext to `document.documentElement.classList`.

---

## Critical Issues Identified

### Issue #1: SettingsContext DarkMode Not Applied
**Problem:** The `darkMode` value from `SettingsContext` is stored and can be changed via the Settings Modal, but **it's never applied to the document**.

**Evidence:**
- `SettingsContext.jsx` provides `darkMode` value but doesn't apply it
- `SettingsModal.jsx` allows changing `darkMode` but doesn't apply it
- No `useEffect` in any component watches `SettingsContext.darkMode` to apply the "dark" class

**Impact:** 
- Users can select dark mode in Settings Modal
- The setting is saved to localStorage
- **But dark mode is not actually applied to the page**

### Issue #2: Two Separate Storage Systems
**Problem:** Two different localStorage keys store dark mode preference:
- `"theme"` → Used by Layout.jsx
- `"bonzai_settings"` → Used by SettingsContext

**Impact:**
- Changing dark mode in Layout toggle doesn't update Settings Modal
- Changing dark mode in Settings Modal doesn't affect the page (see Issue #1)
- Settings can become out of sync

### Issue #3: Different Value Formats
**Problem:** The two systems use incompatible value formats:
- Layout.jsx: `"dark"` or `"light"` (strings)
- SettingsContext: `true`, `false`, or `null` (boolean/null)

**Impact:** Makes synchronization difficult without conversion logic

---

## Testing Results

### Test 1: Layout Toggle (User Dropdown Menu)
**Steps:**
1. Open user dropdown menu (UserCircle icon in header)
2. Click the Theme toggle switch
3. Observe page appearance change

**Expected:** Page switches between light and dark mode immediately
**Actual:** ✅ **PASS** - Works correctly
**Storage Check:** `localStorage.getItem("theme")` shows `"dark"` or `"light"`

---

### Test 2: Settings Modal Theme Buttons
**Steps:**
1. Open Settings modal (via Settings page or Settings link)
2. Click System/Monitor button
3. Click Light/Sun button
4. Click Dark/Moon button
5. Observe page appearance

**Expected:** Page switches theme based on selection
**Actual:** ❌ **FAIL** - No visual change occurs
**Storage Check:** `localStorage.getItem("bonzai_settings")` shows correct `darkMode` value, but document doesn't update

---

### Test 3: Synchronization Between Systems
**Steps:**
1. Use Layout toggle to switch to dark mode
2. Open Settings modal
3. Check which theme button is active

**Expected:** Settings modal should show "Dark" as active
**Actual:** ❌ **FAIL** - Settings modal doesn't reflect Layout toggle state (they read from different localStorage keys)

---

### Test 4: Persistence After Page Reload
**Steps:**
1. Use Layout toggle to set dark mode
2. Reload page
3. Check if dark mode persists

**Expected:** Dark mode should persist after reload
**Actual:** ✅ **PASS** - Layout implementation restores from `localStorage.getItem("theme")`

**Steps:**
1. Use Settings modal to set dark mode
2. Reload page
3. Check if dark mode persists

**Expected:** Dark mode should persist after reload
**Actual:** ❌ **FAIL** - Dark mode is not applied even though setting is saved

---

## Recommended Fixes

### Fix Priority 1: Apply SettingsContext DarkMode to Document

Add code to apply `SettingsContext.darkMode` to `document.documentElement`. Options:

**Option A:** Add to `SettingsContext.jsx`
```javascript
useEffect(() => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  let shouldBeDark = false;
  
  if (settings.darkMode === null) {
    // System preference
    shouldBeDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  } else {
    shouldBeDark = settings.darkMode === true;
  }
  
  if (shouldBeDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}, [settings.darkMode]);
```

**Option B:** Create a `useDarkMode` hook that watches `SettingsContext.darkMode` and applies it

**Option C:** Sync both systems - Make Layout.jsx read from SettingsContext instead of its own state

---

### Fix Priority 2: Unify Storage System

Choose one storage approach:
- **Recommendation:** Use SettingsContext as the single source of truth
- Update Layout.jsx to read from `SettingsContext.darkMode` instead of `localStorage.getItem("theme")`
- Remove duplicate `"theme"` localStorage key

---

### Fix Priority 3: Sync UI Indicators

Ensure both UI controls (Layout toggle and Settings Modal buttons) reflect the same state:
- Settings Modal already reads from `SettingsContext.darkMode` ✅
- Layout toggle should also read from `SettingsContext.darkMode` (currently uses separate state)

---

## Test Checklist for After Fixes

- [ ] Settings Modal dark mode selection actually applies dark mode
- [ ] Layout toggle and Settings Modal stay in sync
- [ ] System preference option (Monitor icon) works correctly
- [ ] Theme persists after page reload
- [ ] Theme changes work across browser tabs (if using storage events)
- [ ] No console errors related to dark mode
- [ ] All pages/components respect dark mode classes
- [ ] No flicker on initial page load (should apply before first render if possible)

---

## Files Affected

1. `src/components/Layout.jsx` - Contains working dark mode toggle (but uses separate storage)
2. `src/context/SettingsContext.jsx` - Provides darkMode but doesn't apply it
3. `src/components/SettingsModal.jsx` - UI for changing darkMode but doesn't apply it
4. `src/lib/settings-storage.js` - Storage utility for SettingsContext
5. `src/app/globals.css` - CSS with dark mode styles (appears correctly configured)

---

## Conclusion

**Current State:**
- Layout.jsx dark mode toggle: ✅ **WORKING**
- SettingsModal dark mode selection: ❌ **NOT WORKING** (saves but doesn't apply)
- Synchronization: ❌ **NOT WORKING** (two separate systems)

**Critical Fix Needed:** SettingsContext `darkMode` value must be applied to `document.documentElement.classList` for Settings Modal to function.
