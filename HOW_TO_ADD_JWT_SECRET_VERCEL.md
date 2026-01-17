# How to Add JWT_SECRET in Vercel Dashboard

## Step-by-Step Instructions

### Step 1: Generate a JWT_SECRET Value

First, you need to generate a secure random value. Run this command in your terminal:

```bash
openssl rand -base64 32
```

This will output something like:
```
//PkFO82VgONGhigqfstfikn71zl+v81w8St1BxpSa8=
```

**Copy this value** - you'll need it in the next step.

---

### Step 2: Open Vercel Dashboard

1. Open your web browser
2. Go to: **https://vercel.com**
3. **Log in** to your Vercel account (if not already logged in)

---

### Step 3: Find Your Project

1. In the Vercel Dashboard, you'll see a list of your projects
2. **Click on your project** named `bonzai-react-app` (or whatever your project is called)

---

### Step 4: Open Project Settings

1. Once you're in your project, look at the **top navigation menu**
2. Click on the **"Settings"** tab
   - It's usually next to "Deployments", "Analytics", etc.

---

### Step 5: Navigate to Environment Variables

1. In the Settings page, look at the **left sidebar menu**
2. Click on **"Environment Variables"**
   - This is usually near the bottom of the sidebar
   - It might be under a "General" or "Configuration" section

---

### Step 6: Add the JWT_SECRET Variable

1. You'll see a button that says **"Add New"** or **"Create"**
   - It's usually near the top right of the Environment Variables section

2. **Click "Add New"**

3. A form will appear with these fields:

   **Name (Key):**
   - Type: `JWT_SECRET`
   - This must be exactly `JWT_SECRET` (case-sensitive)

   **Value:**
   - Paste the value you generated in Step 1
   - Example: `//PkFO82VgONGhigqfstfikn71zl+v81w8St1BxpSa8=`

   **Environment:**
   - Select which environments this applies to
   - **Important:** Check at least these boxes:
     - ✅ **Production**
     - ✅ **Preview** 
     - ✅ **Development**
   - (You can check all three, or just Production if you only want it for production)

4. **Click "Save"** or **"Add"**

---

### Step 7: Verify It Was Added

1. After saving, you should see `JWT_SECRET` in the list of environment variables
2. The value will be hidden (shown as dots: `••••••••`)
3. You should see checkmarks showing which environments it's enabled for

---

### Step 8: Redeploy Your Application

**Important:** Environment variables don't take effect until you redeploy!

You have two options:

**Option A: Redeploy the Latest Deployment**
1. Go to the **"Deployments"** tab (top navigation)
2. Find your **latest deployment** in the list
3. Click the **three dots (⋯)** next to it
4. Click **"Redeploy"**
5. Confirm by clicking **"Redeploy"** again in the popup
6. Wait for deployment to complete (usually 1-2 minutes)

**Option B: Push a New Commit** (Automatically redeploys)
1. Make any small change (like adding a comment to a file)
2. Commit and push:
   ```bash
   git commit --allow-empty -m "Redeploy with JWT_SECRET"
   git push
   ```
3. Vercel will automatically redeploy

---

### Step 9: Verify It's Working

1. Wait for the redeployment to finish
2. Open your app: `bonzai-react-app-git-main-stu-coopers-projects.vercel.app/login`
3. The JWT_SECRET error should be **gone**!
4. You should now be able to log in successfully

---

## Visual Guide (What You'll See)

```
Vercel Dashboard
└── Your Project (bonzai-react-app)
    └── Settings (tab at top)
        └── Environment Variables (left sidebar)
            └── Add New (button)
                └── Form:
                    - Name: JWT_SECRET
                    - Value: [paste your generated secret]
                    - Environment: ☑ Production ☑ Preview ☑ Development
                    └── Save
```

---

## Troubleshooting

### "I don't see Environment Variables in Settings"
- Make sure you clicked on the **"Settings"** tab first
- Look in the **left sidebar** - it might be collapsed
- Try scrolling down - it might be lower in the list

### "The variable isn't showing up after saving"
- Refresh the page
- Make sure you clicked "Save" - sometimes forms require clicking twice
- Check that the name is exactly `JWT_SECRET` (no typos)

### "The error is still showing after redeploy"
- Make sure you redeployed AFTER adding the variable
- Check that you enabled it for the right environment (at least "Production")
- Wait a minute or two for the deployment to fully complete
- Hard refresh your browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### "I can't find my project"
- Make sure you're logged into the correct Vercel account
- Check the URL matches: `https://vercel.com/dashboard`
- Look for a project that matches your repo name

---

## Quick Reference

**JWT_SECRET Value (if you need to generate a new one):**
```bash
openssl rand -base64 32
```

**Vercel Dashboard URL:**
https://vercel.com/dashboard

**Direct Link to Environment Variables** (after selecting your project):
`https://vercel.com/[your-username]/[your-project]/settings/environment-variables`

---

## That's It!

Once you've added `JWT_SECRET` and redeployed, your authentication should work properly. The error message will disappear, and users will be able to log in successfully.

If you run into any issues, check the troubleshooting section above or verify that:
1. ✅ The variable name is exactly `JWT_SECRET`
2. ✅ The value was pasted correctly (no extra spaces)
3. ✅ You selected at least "Production" environment
4. ✅ You clicked "Save"
5. ✅ You redeployed after adding it
