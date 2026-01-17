# JWT_SECRET Not Detected - Fix Steps

The test endpoint shows `hasJwtSecret: false`, which means the environment variable isn't being read by your deployment.

## Immediate Fix Steps

### Step 1: Verify Variable Exists in Vercel

1. Go to: https://vercel.com/dashboard
2. Click your project: `bonzai-react-app`
3. Click **Settings** → **Environment Variables**
4. **Look carefully** for `JWT_SECRET` in the list

**Check:**
- Is it there? (scroll through the list)
- What's the exact name? (copy it to check for typos)
- Which environments are checked?

### Step 2: Delete and Re-add (Most Common Fix)

Sometimes Vercel needs a fresh variable:

1. **Delete the existing variable:**
   - Find `JWT_SECRET` in the list
   - Click the three dots (⋯) next to it
   - Click **"Remove"** or **"Delete"**
   - Confirm deletion

2. **Add it again:**
   - Click **"Add New"**
   - **Name:** Type exactly: `JWT_SECRET`
     - All caps
     - Underscore, not dash
     - No spaces before or after
   - **Value:** `R22n2hsoM4xyBoSWiKscSoVd/tk79/jxwoe33zplWXI=`
   - **Environments:** 
     - ✅ **Production** (MUST be checked!)
     - ✅ Preview
     - ✅ Development
   - Click **"Save"**

3. **Verify it saved:**
   - You should see `JWT_SECRET` in the list
   - It should show checkmarks for the environments you selected

### Step 3: Redeploy After Adding

**CRITICAL:** You MUST redeploy after adding/updating environment variables!

1. Go to **Deployments** tab
2. Click the three dots (⋯) on the latest deployment
3. Click **"Redeploy"**
4. Wait for it to complete (2-3 minutes)
5. Status should show "Ready" with green dot

### Step 4: Test Again

After redeploy completes:

1. Visit: `https://bonzai-react-app-git-main-stu-coopers-projects.vercel.app/api/test-jwt-secret`
2. You should see:
   ```json
   {
     "hasJwtSecret": true,
     "secretPreview": "R22n..."
   }
   ```

## Common Issues

### Issue 1: Variable Name Typo

**Wrong:**
- `jwt_secret` (lowercase)
- `JWT-SECRET` (dash)
- `JWT_SECRET ` (trailing space)
- `JWT_SECRETS` (extra S)

**Correct:**
- `JWT_SECRET` (exact)

### Issue 2: Not Enabled for Production

If you only enabled it for "Development":
- It won't be available in Production
- Make sure **Production** is checked!

### Issue 3: Didn't Redeploy

Environment variables only apply to NEW deployments:
- If you added the variable but didn't redeploy
- The old deployment still doesn't have it
- **Solution:** Redeploy after adding variables

### Issue 4: Wrong Project

Make sure you're:
- ✅ In the correct Vercel project
- ✅ Not in a different organization
- ✅ The project name matches: `bonzai-react-app`

### Issue 5: Vercel Cache

Sometimes Vercel caches environment variables:
- Delete and re-add the variable
- Redeploy
- Wait a few minutes

## Verification Checklist

Before testing again, verify:
- [ ] JWT_SECRET exists in Environment Variables list
- [ ] Name is exactly `JWT_SECRET` (no typos)
- [ ] Value is set (shows as hidden dots)
- [ ] Production environment is checked
- [ ] You clicked "Save" after adding
- [ ] You redeployed AFTER adding the variable
- [ ] New deployment shows "Ready" status
- [ ] Waited 2-3 minutes after redeploy

## If Still Not Working

If after all these steps it still shows `hasJwtSecret: false`:

1. **Try a different variable name temporarily:**
   - Add `TEST_VAR` with value `test123`
   - Create a test endpoint that reads `process.env.TEST_VAR`
   - If that works, the issue is specific to JWT_SECRET
   - If that doesn't work, there's a broader environment variable issue

2. **Check Vercel project settings:**
   - Settings → General
   - Verify project details
   - Check if there are any restrictions

3. **Contact Vercel Support:**
   - They can check if variables are being set correctly
   - They can verify deployment has access to them
   - There might be a Vercel-specific issue

4. **Try using Vercel CLI:**
   ```bash
   npm i -g vercel
   vercel login
   vercel env add JWT_SECRET production
   # Enter value when prompted
   ```

## Quick Test After Fix

Once you've:
1. Deleted and re-added JWT_SECRET
2. Made sure Production is checked
3. Redeployed

Test again:
```
https://bonzai-react-app-git-main-stu-coopers-projects.vercel.app/api/test-jwt-secret
```

Expected result:
```json
{
  "success": true,
  "data": {
    "hasJwtSecret": true,
    "secretLength": 44,
    "isDefaultValue": false,
    "secretPreview": "R22n..."
  },
  "message": "JWT_SECRET is configured correctly"
}
```

If you see this, the login error will be fixed!
