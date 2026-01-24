# Dark Mode Testing Guide - Ready to Execute

## ✅ Setup Complete

The development server is starting. Once it's ready, you can begin testing.

## 🚀 Quick Start Testing

### Step 1: Open the Application
1. Wait for the dev server to start (check terminal for "Ready" message)
2. Open your browser to: `http://localhost:3000`
3. Open Developer Tools (F12 or Cmd+Option+I / Ctrl+Shift+I)
4. Go to the **Console** tab

### Step 2: Run Automated Test Script
1. Open the file `test-dark-mode.js` in this project
2. Copy the entire contents
3. Paste into the browser console
4. Press Enter
5. Review the test results

### Step 3: Manual Visual Testing

#### Test A: Basic Toggle
1. Navigate to Settings:
   - Click user icon (top right) → "Settings"
   - OR go to: `http://localhost:3000/settings`
2. Find the **Appearance** section
3. Click the **Dark** button (Moon icon 🌙)
4. **Expected:** Page immediately turns dark
5. Check console for: `[SettingsContext] Applied dark mode`

#### Test B: Light Mode
1. Click the **Light** button (Sun icon ☀️)
2. **Expected:** Page immediately turns light
3. Check console for logs

#### Test C: Persistence
1. Set to Dark mode
2. Reload page (F5)
3. **Expected:** Page loads in dark mode (no flash)

#### Test D: System Preference
1. Click **System** button (Monitor icon 🖥️)
2. **Expected:** Page matches your OS theme
3. Change your OS theme (if possible)
4. **Expected:** Page updates automatically

## 🔍 Console Commands for Manual Testing

Run these in the browser console:

```javascript
// 1. Check current state
console.log('=== Dark Mode State ===');
console.log('Has dark class:', document.documentElement.classList.contains('dark'));
console.log('Settings:', localStorage.getItem('bonzai_settings'));
console.log('HTML classes:', document.documentElement.className);

// 2. Manual toggle test (CSS verification)
document.documentElement.classList.add('dark');
void document.documentElement.offsetHeight;
// If page turns dark, CSS is working!

// 3. Check for errors
// Look in console for any red messages

// 4. Verify SettingsContext
// Open React DevTools → Components → SettingsProvider
// Check: settings.darkMode value
```

## 📋 Testing Checklist

Use this checklist as you test:

- [ ] **Test 1:** Dark mode toggle works
- [ ] **Test 2:** Light mode toggle works  
- [ ] **Test 3:** System preference works
- [ ] **Test 4:** Persists after reload
- [ ] **Test 5:** Works on all pages
- [ ] **Test 6:** All components display correctly
- [ ] **Test 7:** Rapid toggling works
- [ ] **Test 8:** No console errors
- [ ] **Test 9:** Mobile testing (if available)
- [ ] **Test 10:** Edge cases handled

## 🐛 Troubleshooting

### If dark mode doesn't toggle:

1. **Check console for errors:**
   ```javascript
   // Look for red error messages
   ```

2. **Verify class is being added:**
   ```javascript
   document.documentElement.classList.contains('dark')
   // Should return true when dark mode is on
   ```

3. **Check localStorage:**
   ```javascript
   localStorage.getItem('bonzai_settings')
   // Should show {"darkMode":true} when dark mode is on
   ```

4. **Manual CSS test:**
   ```javascript
   document.documentElement.classList.add('dark');
   void document.documentElement.offsetHeight;
   // If this works, CSS is fine - issue is in application logic
   ```

5. **Check for conflicting code:**
   ```javascript
   // Look for any code that might remove the dark class
   // Check React DevTools for component state
   ```

### Common Issues:

**Issue:** Dark mode doesn't apply
- **Check:** Console logs for `[SettingsContext] Applied dark mode`
- **Fix:** Verify SettingsContext is mounting properly

**Issue:** Flash of light mode on load
- **Check:** Initial script in `layout.js` should run before React
- **Fix:** Verify script is in `<head>` and runs immediately

**Issue:** Dark mode doesn't persist
- **Check:** localStorage is being saved
- **Fix:** Verify `setSetting()` is being called

**Issue:** Some components don't respect dark mode
- **Check:** Components use `dark:` Tailwind classes
- **Fix:** Add dark mode classes to components

## 📊 Recording Test Results

Use the `DARK_MODE_TEST_RESULTS.md` file to record your findings:

1. Fill in the date, browser, OS
2. Check off each test as you complete it
3. Note any issues in the "Issues Found" section
4. Copy relevant console logs
5. Take screenshots if needed

## 🎯 Success Criteria

Dark mode is working correctly if:

✅ Toggles immediately when clicked
✅ Persists after page reload
✅ Works on all pages
✅ All components display correctly
✅ No console errors
✅ System preference option works
✅ Works on mobile devices

## 📝 Next Steps After Testing

1. **If all tests pass:**
   - Document any edge cases found
   - Note any performance observations
   - Consider user feedback

2. **If tests fail:**
   - Document specific failures
   - Note console errors
   - Check which components are affected
   - Report findings for fixes

## 🔗 Related Files

- `test-dark-mode.js` - Automated test script
- `DARK_MODE_TEST_RESULTS.md` - Results template
- `DARK_MODE_FIX_IMPLEMENTATION.md` - Implementation details
- `DARK_MODE_FIX_SUMMARY.md` - Quick reference

---

**Ready to test!** The dev server should be running at `http://localhost:3000`

Good luck! 🚀
