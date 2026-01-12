# Database Setup Guide

This guide will help you set up the Neon Database for the Bonzai application.

**Note:** This is the Bonzai project (formerly Proplytics).

## Prerequisites

1. A Neon Database account (https://neon.tech)
2. Node.js and npm installed
3. Access to your Vercel project

## Step 1: Create Neon Database

1. Sign up or log in to Neon (https://neon.tech)
2. Create a new project
3. Copy your connection string (it will look like: `postgresql://user:password@host/database?sslmode=require`)

## Step 2: Run Database Migrations

The database schema is defined in the `migrations/` folder. You need to run these SQL scripts in your Neon database.

### Option A: Using Neon Dashboard

1. Go to your Neon project dashboard
2. Click on "SQL Editor"
3. Copy and paste the contents of `migrations/001_initial_schema.sql`
4. Run the script
5. Repeat for `migrations/002_add_indexes.sql`

### Option B: Using psql (Command Line)

```bash
# Install psql if you don't have it
# On macOS: brew install postgresql
# On Ubuntu: sudo apt-get install postgresql-client

# Run migrations
psql "your-connection-string" -f migrations/001_initial_schema.sql
psql "your-connection-string" -f migrations/002_add_indexes.sql
```

## Step 3: Configure Environment Variables

### Local Development

Create a `.env.local` file in the `proplytics-app` directory:

```env
# Database Configuration
POSTGRES_URL=postgresql://user:password@host/database?sslmode=require

# JWT Authentication
# Generate a strong secret key (use: openssl rand -base64 32)
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Environment
NODE_ENV=development
```

### Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

   - **POSTGRES_URL**: Your Neon database connection string
   - **JWT_SECRET**: A strong random string (generate with `openssl rand -base64 32`)
   - **JWT_EXPIRES_IN**: Token expiration (e.g., `7d` for 7 days)
   - **NODE_ENV**: `production` for production, `staging` for staging

4. For each environment (Production, Preview, Development), set the appropriate values

## Step 4: Install Dependencies

```bash
cd proplytics-app
npm install
```

This will install the new dependencies:
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation
- `@types/bcryptjs` - TypeScript types
- `@types/jsonwebtoken` - TypeScript types

## Step 5: Verify Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test the database connection by making a request to `/api/bonzai-test` (if that endpoint exists)

3. Test authentication by registering a new user:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpassword123","name":"Test User"}'
   ```

## Database Schema Overview

The database includes the following tables:

- **users** - User authentication and profiles
- **accounts** - User accounts (replaces localStorage accounts)
- **properties** - Property data
- **mortgages** - Mortgage information linked to properties
- **expenses** - Property expenses
- **sessions** - JWT session management

All tables include `created_at` and `updated_at` timestamps that are automatically managed.

## Troubleshooting

### Connection Errors

- Verify your `POSTGRES_URL` is correct
- Check that your Neon database is running
- Ensure SSL mode is enabled (`?sslmode=require`)

### Migration Errors

- Make sure you run migrations in order (001 before 002)
- Check that the UUID extension is enabled in Neon
- Verify you have the necessary permissions

### Authentication Errors

- Ensure `JWT_SECRET` is set and is a strong random string
- Check that the token expiration format is correct (e.g., `7d`, `24h`)

## Next Steps

After setting up the database:

1. Migrate existing localStorage data using the migration script (when available)
2. Update your frontend to use the new API client
3. Test all CRUD operations
4. Deploy to staging for testing
5. Deploy to production

## Security Notes

- **Never commit** `.env.local` or `.env` files to git
- Use strong, randomly generated `JWT_SECRET` values
- Rotate secrets regularly in production
- Use different databases for development, staging, and production
- Enable SSL for all database connections






