# Dark Mode Debug Guide

## Issue: Dark mode selected but not visually applying

## Debugging Steps

If dark mode is selected in Settings but the page appears in light mode:

### 1. Check if `.dark` class is on `<html>`
Open browser console (F12) and run:
```javascript
document.documentElement.classList.contains('dark')
```
- Should return `true` if dark mode is active
- If `false`, the class is not being applied

### 2. Check localStorage
```javascript
localStorage.getItem('bonzai_settings')
```
- Should show `{"darkMode":true}` if dark mode is selected
- If `null` or `{"darkMode":false}`, dark mode won't apply

### 3. Check SettingsContext state
In React DevTools:
- Find `SettingsProvider`
- Check `settings.darkMode` value
- Should be `true` for dark mode

### 4. Manual Test
In browser console, manually add the class:
```javascript
document.documentElement.classList.add('dark')
```
- If page becomes dark, CSS is working correctly
- If page stays light, CSS/Tailwind issue

### 5. Clear localStorage
If you want to reset to default (light mode):
```javascript
localStorage.removeItem('bonzai_settings')
```
Then refresh the page - should default to light mode.

## Expected Behavior

1. **New users (no localStorage)**: Default to light mode (`darkMode: false`)
2. **Existing users with `darkMode: true`**: Should see dark mode immediately
3. **When clicking Dark button**: Should switch immediately
4. **When clicking Light button**: Should switch immediately

## Code Flow

1. Script in `<head>` reads localStorage and applies `.dark` class immediately
2. SettingsContext mounts and reads localStorage
3. SettingsContext useEffect applies `.dark` class based on state
4. When user clicks Dark/Light button, `updateSetting` is called
5. SettingsContext state updates, useEffect runs, `.dark` class is updated
