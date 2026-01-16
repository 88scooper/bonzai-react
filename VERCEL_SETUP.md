# Vercel Environment Variables Setup Guide

This guide helps you configure the required environment variables for your Bonzai app on Vercel.

## Quick Setup (Using Script)

If you have Vercel CLI installed:

```bash
# Make the script executable
chmod +x scripts/setup-vercel-env.sh

# Run the setup script
./scripts/setup-vercel-env.sh
```

The script will:
- ✅ Check if Vercel CLI is installed
- 🔐 Generate a secure JWT_SECRET
- 🔧 Set environment variables in Vercel
- 📝 Provide next steps

## Manual Setup (Vercel Dashboard)

If you prefer to set up manually or don't have Vercel CLI:

### Step 1: Generate JWT_SECRET

```bash
openssl rand -base64 32
```

This will output something like:
```
oRKcu3N98lwg2JDhU7EeQ1tt+plRNcDFN6DNQ6Djpqs=
```

**Save this value** - you'll need it in the next step.

### Step 2: Add Environment Variables in Vercel

1. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/dashboard
   - Select your project (`bonzai-react-app`)

2. **Navigate to Settings:**
   - Click on "Settings" tab
   - Click on "Environment Variables" in the left sidebar

3. **Add Each Variable:**
   
   **JWT_SECRET:**
   - Click "Add New"
   - Name: `JWT_SECRET`
   - Value: `[paste the value you generated above]`
   - Select environments: ✅ Production, ✅ Preview, ✅ Development
   - Click "Save"

   **POSTGRES_URL:**
   - Click "Add New"
   - Name: `POSTGRES_URL`
   - Value: `[your Neon database connection string]`
   - Select environments: ✅ Production, ✅ Preview, ✅ Development
   - Click "Save"

   **JWT_EXPIRES_IN** (Optional - defaults to `7d`):
   - Click "Add New"
   - Name: `JWT_EXPIRES_IN`
   - Value: `7d`
   - Select environments: ✅ Production, ✅ Preview, ✅ Development
   - Click "Save"

### Step 3: Redeploy

After adding the environment variables:

1. Go to the "Deployments" tab
2. Find your latest deployment
3. Click the three dots menu (⋯) next to it
4. Click "Redeploy"
5. Or simply push a new commit to trigger a new deployment

## Required Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JWT_SECRET` | ✅ Yes | Secret key for JWT token signing | Generated with `openssl rand -base64 32` |
| `POSTGRES_URL` | ✅ Yes | Neon database connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_EXPIRES_IN` | ❌ No | JWT token expiration time | `7d` (default) |

## Verifying Setup

After deploying, you can verify the setup by:

1. **Check the login page** - The JWT_SECRET error should be gone
2. **Test authentication** - Try logging in or signing up
3. **Check Vercel logs** - If there are errors, check the deployment logs

## Troubleshooting

### Error: "JWT_SECRET environment variable must be set"

**Cause:** The environment variable is not set or not accessible at runtime.

**Solutions:**
1. Verify the variable is set in Vercel Dashboard
2. Make sure it's enabled for the correct environment (Production/Preview/Development)
3. Redeploy the application after adding the variable
4. Check that the variable name is exactly `JWT_SECRET` (case-sensitive)

### Error: "Failed to collect page data"

**Cause:** Usually related to missing environment variables or database connection issues.

**Solutions:**
1. Ensure `POSTGRES_URL` is set correctly
2. Verify your Neon database is accessible
3. Check database migrations are run
4. Review Vercel build logs for specific errors

### Environment variables not appearing in build

**Cause:** Variables need to be set before building, or need a redeploy.

**Solutions:**
1. Add variables first, then trigger a new deployment
2. Use "Redeploy" after adding variables
3. Ensure variables are enabled for the environment you're deploying to

## Security Notes

⚠️ **Important:**
- Never commit `JWT_SECRET` to git (it's in `.gitignore`)
- Use different `JWT_SECRET` values for different environments if needed
- Keep your `POSTGRES_URL` secure - it contains database credentials
- Rotate `JWT_SECRET` periodically for better security

## Local Development Setup

For local development, create a `.env.local` file:

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Create .env.local
cat > .env.local << EOF
JWT_SECRET=your-generated-secret-here
POSTGRES_URL=your-neon-connection-string-here
JWT_EXPIRES_IN=7d
NODE_ENV=development
EOF
```

Verify with:
```bash
./scripts/verify-env.sh
```
