# Verify JWT_SECRET is Set Correctly

## Step 1: Double-Check Environment Variable in Vercel

1. Go to: https://vercel.com/dashboard
2. Click your project: `bonzai-react-app`
3. Click **Settings** → **Environment Variables**
4. Look for `JWT_SECRET` in the list

**Check these things:**
- [ ] Is `JWT_SECRET` in the list? (exact spelling, all caps)
- [ ] Does it show checkmarks for Production/Preview/Development?
- [ ] Is the value hidden (shows dots)?
- [ ] When was it added? (should be recent)

**If it's NOT there:**
- Add it again (see HOW_TO_ADD_JWT_SECRET_VERCEL.md)
- Make absolutely sure you clicked "Save"

**If it IS there:**
- Continue to Step 2

## Step 2: Check Latest Deployment

1. Go to **Deployments** tab
2. Look at the **top deployment** (most recent)
3. Check:
   - When was it deployed? (should be after you added JWT_SECRET)
   - Status: Should be "Ready" (green dot)
   - Commit: Should be `88f9ed7` or newer

**If the latest deployment is OLD:**
- The redeploy might not have completed
- Wait a few more minutes
- Or manually trigger redeploy

**If the latest deployment is NEW:**
- Continue to Step 3

## Step 3: Check Deployment Logs

1. Click on the latest deployment
2. Click **"Build Logs"** or **"Function Logs"**
3. Search for "JWT_SECRET" (Cmd+F or Ctrl+F)
4. Look for any errors

**What to look for:**
- If you see "JWT_SECRET not found" → Variable isn't being read
- If you see other errors → Those might be the real issue
- If no errors → Continue to Step 4

## Step 4: Verify Variable Name (Common Mistake!)

**The variable name MUST be exactly:**
```
JWT_SECRET
```

**Common mistakes:**
- ❌ `jwt_secret` (lowercase)
- ❌ `JWT-SECRET` (dash instead of underscore)
- ❌ `JWT_SECRET ` (trailing space)
- ❌ `JWT_SECRETS` (extra S)
- ✅ `JWT_SECRET` (correct!)

**To fix:**
1. Delete the incorrectly named variable
2. Add a new one with exact name: `JWT_SECRET`
3. Redeploy

## Step 5: Try Deleting and Re-adding

Sometimes Vercel needs a fresh variable:

1. Go to Environment Variables
2. Find `JWT_SECRET`
3. Click the three dots (⋯) next to it
4. Click **"Remove"** or **"Delete"**
5. Confirm deletion
6. Add it again:
   - Name: `JWT_SECRET`
   - Value: `R22n2hsoM4xyBoSWiKscSoVd/tk79/jxwoe33zplWXI=`
   - Environments: Production, Preview, Development
   - Click "Save"
7. Redeploy again

## Step 6: Check if Variable is Actually Available

The error happens when the API tries to generate a token. Let's verify the variable is accessible:

1. The error appears when you try to log in
2. This means the `/api/auth/login` route is being called
3. That route calls `generateToken()` which needs `JWT_SECRET`
4. If `JWT_SECRET` isn't available, you get the error

**This confirms:**
- The variable isn't being read by the serverless function
- OR the deployment doesn't have access to it

## Step 7: Verify Environment Selection

When you added JWT_SECRET, did you check:
- ✅ Production
- ✅ Preview  
- ✅ Development

**If you only checked "Development":**
- It won't be available in Production
- Go back and add it for "Production" too

## Step 8: Check for Multiple Projects

Make sure you're:
- ✅ Looking at the correct Vercel project
- ✅ Not looking at a different project or organization
- ✅ The project name matches: `bonzai-react-app`

## Step 9: Try a Different Value

Sometimes there's an issue with the specific value:

1. Generate a new JWT_SECRET:
   ```bash
   openssl rand -base64 32
   ```
2. Delete the old JWT_SECRET variable
3. Add a new one with the new value
4. Redeploy

## Step 10: Check Vercel Project Settings

1. Go to Settings → General
2. Check the project name and details
3. Make sure you're in the right project

## Still Not Working?

If after all these steps it still doesn't work:

1. **Check Vercel Status:** https://www.vercel-status.com/
   - Make sure Vercel isn't having issues

2. **Contact Vercel Support:**
   - They can check if environment variables are being set correctly
   - They can verify the deployment has access to them

3. **Try a test deployment:**
   - Create a simple API route that logs `process.env.JWT_SECRET`
   - Deploy it and check the logs
   - This will confirm if the variable is accessible
