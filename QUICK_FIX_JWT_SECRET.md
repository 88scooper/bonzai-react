# Quick Fix: JWT_SECRET Error

## The Problem
Your Vercel deployment shows: "JWT_SECRET environment variable must be set"

## Quick Solution (2 minutes)

### Option 1: Vercel Dashboard (Recommended - No CLI needed)

1. **Go to:** https://vercel.com/dashboard
2. **Select your project:** `bonzai-react-app`
3. **Settings** → **Environment Variables**
4. **Add New:**
   - **Name:** `JWT_SECRET`
   - **Value:** `//PkFO82VgONGhigqfstfikn71zl+v81w8St1BxpSa8=`
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development
   - **Save**
5. **Redeploy:**
   - Go to **Deployments** tab
   - Click **⋯** on latest deployment
   - Click **Redeploy**

### Option 2: Install Vercel CLI (for future use)

```bash
# Install Vercel CLI
npm i -g vercel

# Set JWT_SECRET
echo '//PkFO82VgONGhigqfstfikn71zl+v81w8St1BxpSa8=' | vercel env add JWT_SECRET production
echo '//PkFO82VgONGhigqfstfikn71zl+v81w8St1BxpSa8=' | vercel env add JWT_SECRET preview
echo '//PkFO82VgONGhigqfstfikn71zl+v81w8St1BxpSa8=' | vercel env add JWT_SECRET development

# Then redeploy from Vercel Dashboard
```

## Generated JWT_SECRET
```
//PkFO82VgONGhigqfstfikn71zl+v81w8St1BxpSa8=
```

Save this for your local `.env.local` file too!
