# Demo User Requirements - CRITICAL

## ⚠️ DO NOT MODIFY WITHOUT READING THIS DOCUMENT

### Demo User: demo@bonzai.io

**CRITICAL:** The user `demo@bonzai.io` is a special authenticated demo user who **MUST** be able to access their demo account and see demo properties.

## Requirements

1. **Demo Account Access**
   - `demo@bonzai.io` users **MUST** be able to see their demo account in the accounts list
   - Demo accounts should **NOT** be filtered out for `demo@bonzai.io` users
   - The demo account should be **automatically selected** when `demo@bonzai.io` logs in

2. **Properties Loading**
   - `demo@bonzai.io` **MUST** be able to load properties for their demo account
   - Demo properties should appear in portfolio summary for `demo@bonzai.io`
   - Auto-seeding logic in `/api/properties` will create demo properties if they don't exist

3. **Code Locations**
   - **AccountContext.tsx**: Contains the main logic for account filtering
     - Uses `isDemoUser()` helper function to check if user is demo@bonzai.io
     - Line ~420: Account filtering logic (DO NOT remove demo account exception)
     - Line ~442: Auto-selection of demo account for demo@bonzai.io
   - **Properties API**: Auto-seeds demo properties for demo accounts

## Filtering Rules

### DO:
- ✅ Filter out demo accounts for regular authenticated users
- ✅ Allow demo@bonzai.io to see their demo account
- ✅ Auto-select demo account for demo@bonzai.io users
- ✅ Use `isDemoUser()` helper function (defined in AccountContext.tsx)

### DO NOT:
- ❌ Filter out demo accounts for demo@bonzai.io
- ❌ Remove the exception for demo@bonzai.io in account filtering
- ❌ Change the email comparison without updating the helper function
- ❌ Hardcode email comparisons - use `isDemoUser()` helper

## Implementation

The code uses a constant `DEMO_USER_EMAIL` and helper function `isDemoUser()` to prevent regressions:

```typescript
const DEMO_USER_EMAIL = 'demo@bonzai.io';

function isDemoUser(userEmail: string | null | undefined): boolean {
  return userEmail?.toLowerCase() === DEMO_USER_EMAIL.toLowerCase();
}
```

**Always use `isDemoUser()` instead of direct email comparisons.**

## Testing

To verify this works:
1. Log in as `demo@bonzai.io`
2. Verify demo account appears in accounts list
3. Verify demo account is automatically selected
4. Verify demo properties appear in portfolio summary (First St, Second Dr, Third Avenue)

## History

- **2025-01-XX**: Fixed issue where demo@bonzai.io couldn't see demo account because demo accounts were filtered for all authenticated users
- **2025-01-XX**: Added safeguards and documentation to prevent regression

## Related Files

- `src/context/AccountContext.tsx` - Main account management logic
- `src/app/api/properties/route.ts` - Properties API with auto-seeding
- `src/app/api/demo/route.ts` - Demo API endpoint
- `src/app/api/accounts/route.ts` - Accounts API endpoint
