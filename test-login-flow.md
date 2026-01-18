# Login Flow Debugging Guide

## Quick Test Steps

1. **Open Browser Console** (F12 or Cmd+Option+I)
2. **Clear Console** 
3. **Enter credentials**: `admin@bonzai.io` / `testpass`
4. **Click "Continue"**
5. **Watch for console messages**

## Expected Console Logs

You should see these in order:
1. `"LoginPage: Attempting login with email: admin@bonzai.io"`
2. `"AuthContext: Attempting login for: admin@bonzai.io"`
3. `"API Client: Token saved successfully to localStorage"`
4. `"AuthContext: Fetching user profile..."`
5. Either:
   - `"AuthContext: User profile loaded successfully: ..."` (success)
   - `"AuthContext: getUserProfile failed, using login response data: ..."` (fallback)
6. `"AuthContext: Setting user data: ..."`
7. `"LoginPage: Login successful, userData: ..."`
8. `"LoginPage: Token saved successfully"`
9. `"LoginPage: Redirecting to: /admin"` or `/portfolio-summary`

## If Login "Doesn't Work" - Check:

### Issue 1: No console logs appear
- **Problem**: Form submission isn't working
- **Check**: Is the "Continue" button clickable? Is there a JavaScript error?

### Issue 2: Logs stop at "Fetching user profile"
- **Problem**: `getUserProfile` is hanging/failing
- **Check**: Network tab - is the `/api/auth/user` request failing?
- **Solution**: Check Vercel environment variables (JWT_SECRET, POSTGRES_URL)

### Issue 3: Token not saved
- **Problem**: localStorage write failed
- **Check**: Browser storage settings, incognito mode, third-party cookies blocked?

### Issue 4: Redirect doesn't happen
- **Problem**: `window.location.replace` blocked or error after redirect
- **Check**: Check if redirect path exists, any JavaScript errors after redirect

### Issue 5: Redirects but comes back to login
- **Problem**: `RequireAuth` redirecting back because user state not loaded
- **Check**: Does the token exist in localStorage after redirect?

## Manual Verification

Run in browser console after attempting login:
```javascript
// Check token
console.log('Token:', localStorage.getItem('auth_token'));

// Decode token (if exists)
const token = localStorage.getItem('auth_token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
}
```
