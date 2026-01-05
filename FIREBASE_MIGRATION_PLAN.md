# Firebase Elimination Plan

## Current State

**Firebase is currently NOT being used** - the app is running with a mock user. However, the code still references Firebase, which creates confusion and unnecessary dependencies.

## Why Firebase Exists

Firebase was likely used as an initial solution for:
1. **Authentication** - User login/signup
2. **Database** - Firestore for storing data
3. **Quick setup** - Easy to get started

## Why We Can Eliminate It

✅ **We have a complete replacement:**
- ✅ JWT-based authentication API (`/api/auth/register`, `/api/auth/login`)
- ✅ Neon PostgreSQL database (replaces Firestore)
- ✅ All data models migrated to Neon
- ✅ API client with token management

## Current Firebase Usage

### 1. **Authentication** (`src/context/AuthContext.js`)
- **Status:** Currently using mock user (Firebase code commented out)
- **Replacement:** Use JWT API endpoints
- **Impact:** High - affects all login/signup flows

### 2. **Firestore Database** (Various files)
- **Status:** Some old API routes still reference Firestore
- **Replacement:** Use Neon database via new API routes
- **Impact:** Medium - mostly legacy code

### 3. **Mortgage Data** (`src/context/MortgageContext.jsx`)
- **Status:** References Firebase but may not be active
- **Replacement:** Use `/api/properties/[id]/mortgage` endpoints
- **Impact:** Medium - mortgage functionality

## Migration Steps

### Step 1: Update AuthContext to Use JWT API ✅

**File:** `src/context/AuthContext.js`

**Current:** Uses Firebase Auth (commented out, using mock)
**New:** Use `apiClient` to call `/api/auth/register` and `/api/auth/login`

**Changes needed:**
- Replace `signUp()` to call `apiClient.post('/auth/register', { email, password, name })`
- Replace `logIn()` to call `apiClient.post('/auth/login', { email, password })`
- Replace `logOut()` to call `apiClient.post('/auth/logout')` and clear token
- Store JWT token in localStorage/sessionStorage
- Update `useEffect` to check for existing token on mount
- Decode JWT to get user info (or call `/api/auth/me` endpoint)

### Step 2: Update Login/Signup Pages ✅

**Files:**
- `src/app/login/page.jsx`
- `src/app/signup/page.jsx`
- `src/app/page.jsx` (modal versions)

**Changes needed:**
- Already use `useAuth()` hook, so they'll automatically work after Step 1
- May need minor adjustments for error handling

### Step 3: Remove Firebase Dependencies

**Files to update:**
- `src/lib/api-utils.js` - Remove Firebase auth check
- `src/context/MortgageContext.jsx` - Remove Firebase references
- `src/app/api/mortgages/route.js` - Already using new API? Check
- `src/app/api/seed/route.js` - Update if still using Firestore
- `src/lib/firestore.js` - Can be deleted if not used

### Step 4: Remove Firebase Package

**File:** `package.json`
- Remove `"firebase": "^10"` from dependencies
- Run `npm uninstall firebase`

### Step 5: Remove Firebase Environment Variables

**File:** `.env.local`
- Remove `NEXT_PUBLIC_FIREBASE_*` variables
- Keep only Neon and JWT variables

## Benefits of Removing Firebase

1. **Simpler Architecture** - One database (Neon), one auth system (JWT)
2. **Cost Reduction** - No Firebase billing
3. **Better Control** - Full control over auth logic and data
4. **Consistency** - All data in one place (PostgreSQL)
5. **Easier Debugging** - One stack to understand
6. **Better Performance** - Direct database queries vs Firestore

## Implementation Priority

### High Priority (Blocks other work)
1. ✅ Update AuthContext to use JWT API
2. ✅ Test login/signup flows

### Medium Priority (Cleanup)
3. Remove Firebase from MortgageContext
4. Clean up old API routes
5. Remove unused Firebase files

### Low Priority (Final cleanup)
6. Remove Firebase package
7. Remove Firebase env variables
8. Update documentation

## Testing Checklist

After migration:
- [ ] User can register new account
- [ ] User can login with email/password
- [ ] User can logout
- [ ] Protected routes require authentication
- [ ] JWT token persists across page refreshes
- [ ] Token expires correctly
- [ ] Error handling works (invalid credentials, network errors)

## Rollback Plan

If issues arise:
1. Firebase code is already commented out
2. Can temporarily restore mock user
3. Firebase config still exists in `.env.local` (can be restored)

---

## Summary

**Yes, Firebase can be completely eliminated!** 

The new JWT + Neon setup is:
- ✅ More flexible
- ✅ More cost-effective
- ✅ Simpler to maintain
- ✅ Already tested and working

The migration is straightforward since Firebase isn't actively being used right now.






