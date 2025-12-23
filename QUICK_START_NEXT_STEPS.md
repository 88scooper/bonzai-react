# Quick Start: Your Next Steps

## 🎯 What You Need to Do (In Order)

### Step 1: Install Dependencies (2 minutes)

**What this does:** Downloads and installs the new packages we added to your project (for authentication and database).

**Where to run this:**
1. Open your terminal/command prompt
2. Navigate to your project folder:
   ```bash
   cd /Users/stu/Desktop/Proplytics-React/proplytics-app
   ```
   (Or if you're already in the Proplytics-React folder, just run: `cd proplytics-app`)

3. **Run the install command:**
   ```bash
   npm install
   ```

**What you'll see:**
- Terminal will show "Installing packages..." or similar
- It will list packages being installed
- Takes 1-2 minutes
- When done, you'll see something like "added 50 packages"

**What gets installed:**
- `bcryptjs` - For password encryption
- `jsonwebtoken` - For authentication tokens
- `@types/bcryptjs` - TypeScript definitions
- `@types/jsonwebtoken` - TypeScript definitions

**How to verify it worked:**
- Check that `node_modules` folder exists in `proplytics-app/`
- No error messages in terminal
- Command completes successfully

**If you get errors:**
- Make sure you're in the `proplytics-app` directory
- Make sure you have Node.js installed (`node --version` should work)
- Make sure you have npm installed (`npm --version` should work)

---

### Step 2: Create Neon Database (5-10 minutes)

1. **Go to https://neon.tech**
2. **Sign up or log in**
3. **Create a new project:**
   - Click "New Project"
   - Choose a name (e.g., "proplytics-dev")
   - Select a region close to you
   - Click "Create Project"
4. **Copy your connection string:**
   - In the project dashboard, find "Connection string"
   - It looks like: `postgresql://user:password@host/database?sslmode=require`
   - **Save this - you'll need it!**

---

### Step 3: Run Database Migrations (5 minutes)

**Option A: Using Neon Dashboard (Easiest)**

#### Migration 1: Initial Schema

1. In your Neon project, click **"SQL Editor"**
2. Clear any existing SQL in the editor (or click "+" for new query)
3. **Copy ALL of the SQL below** (from "CREATE EXTENSION" to the last "CREATE TRIGGER"):
   ```sql
   -- Enable UUID extension
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

   -- Users table: Stores user authentication and profile information
   CREATE TABLE IF NOT EXISTS users (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       email VARCHAR(255) UNIQUE NOT NULL,
       password_hash VARCHAR(255) NOT NULL,
       name VARCHAR(255),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   -- Accounts table: User accounts (replaces localStorage accounts)
   CREATE TABLE IF NOT EXISTS accounts (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       name VARCHAR(255) NOT NULL,
       email VARCHAR(255),
       is_demo BOOLEAN DEFAULT FALSE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   -- Properties table: Property data
   CREATE TABLE IF NOT EXISTS properties (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
       nickname VARCHAR(255),
       address TEXT,
       purchase_price DECIMAL(15, 2),
       purchase_date DATE,
       closing_costs DECIMAL(15, 2) DEFAULT 0,
       renovation_costs DECIMAL(15, 2) DEFAULT 0,
       initial_renovations DECIMAL(15, 2) DEFAULT 0,
       current_market_value DECIMAL(15, 2),
       year_built INTEGER,
       property_type VARCHAR(100),
       size DECIMAL(10, 2),
       unit_config VARCHAR(255),
       property_data JSONB,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   -- Mortgages table: Mortgage information
   CREATE TABLE IF NOT EXISTS mortgages (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
       lender VARCHAR(255),
       original_amount DECIMAL(15, 2),
       interest_rate DECIMAL(5, 4),
       rate_type VARCHAR(50),
       term_months INTEGER,
       amortization_years INTEGER,
       payment_frequency VARCHAR(50),
       start_date DATE,
       mortgage_data JSONB,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   -- Expenses table: Property expenses
   CREATE TABLE IF NOT EXISTS expenses (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
       date DATE NOT NULL,
       amount DECIMAL(15, 2) NOT NULL,
       category VARCHAR(100),
       description TEXT,
       expense_data JSONB,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   -- Sessions table: JWT session management
   CREATE TABLE IF NOT EXISTS sessions (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       token_hash VARCHAR(255) NOT NULL,
       expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   -- Create indexes for better query performance
   CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
   CREATE INDEX IF NOT EXISTS idx_properties_account_id ON properties(account_id);
   CREATE INDEX IF NOT EXISTS idx_mortgages_property_id ON mortgages(property_id);
   CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
   CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
   CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
   CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
   CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

   -- Create function to update updated_at timestamp
   CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.updated_at = CURRENT_TIMESTAMP;
       RETURN NEW;
   END;
   $$ language 'plpgsql';

   -- Create triggers to automatically update updated_at
   CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

   CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

   CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

   CREATE TRIGGER update_mortgages_updated_at BEFORE UPDATE ON mortgages
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

   CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   ```
4. Paste into Neon SQL Editor
5. Click **"Run"** button (or press `Cmd+Enter` on Mac / `Ctrl+Enter` on Windows)
6. Wait for "Success" message

#### Migration 2: Additional Indexes

1. Clear the SQL Editor (or click "+" for new query)
2. **Copy ALL of the SQL below:**
   ```sql
   -- Additional indexes for query optimization
   -- These indexes support common query patterns

   -- Index for filtering properties by type
   CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);

   -- Index for filtering expenses by category
   CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

   -- Index for searching properties by nickname
   CREATE INDEX IF NOT EXISTS idx_properties_nickname ON properties(nickname);

   -- Index for searching accounts by name
   CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);

   -- Composite index for common property queries
   CREATE INDEX IF NOT EXISTS idx_properties_account_type ON properties(account_id, property_type);

   -- Composite index for expense queries by property and date range
   CREATE INDEX IF NOT EXISTS idx_expenses_property_date ON expenses(property_id, date DESC);
   ```
3. Paste into Neon SQL Editor
4. Click **"Run"** button
5. Wait for "Success" message

**Verify:** Click "Tables" in left sidebar - you should see: users, accounts, properties, mortgages, expenses, sessions

**Option B: Using Command Line**
```bash
# If you have psql installed
psql "your-connection-string" -f migrations/001_initial_schema.sql
psql "your-connection-string" -f migrations/002_add_indexes.sql
```

---

### Step 4: Create Environment File (2 minutes)

1. **In `proplytics-app/` directory, create `.env.local`:**
   ```bash
   touch .env.local
   # or create it in your editor
   ```

2. **Add these variables:**
   ```env
   POSTGRES_URL=your-neon-connection-string-here
   JWT_SECRET=generate-a-random-string-here
   JWT_EXPIRES_IN=7d
   NODE_ENV=development
   ```

3. **Generate JWT_SECRET:**
   ```bash
   # On Mac/Linux:
   openssl rand -base64 32
   
   # Or use an online generator, or just make up a long random string
   ```

4. **Replace the placeholders:**
   - `your-neon-connection-string-here` → Your actual Neon connection string
   - `generate-a-random-string-here` → Your generated secret

**Example `.env.local`:**
```env
POSTGRES_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
JWT_SECRET=aB3xK9mP2qR7vT4wY8zN1cF6hJ0lM5sD9gH2jK4
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

---

### Step 5: Test Database Connection (1 minute)

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **In another terminal, test the connection:**
   ```bash
   curl http://localhost:3000/api/test-db
   ```

3. **Expected response:**
   ```json
   {
     "success": true,
     "message": "Database connection successful",
     "data": {
       "current_time": "2024-01-01T12:00:00.000Z",
       "postgres_version": "PostgreSQL 15.x"
     }
   }
   ```

**If you get an error:** Check your `POSTGRES_URL` in `.env.local`

---

### Step 6: Test Authentication (5 minutes)

1. **Register a test user:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "testpassword123",
       "name": "Test User"
     }'
   ```

2. **Expected response:**
   ```json
   {
     "success": true,
     "data": {
       "user": {
         "id": "uuid-here",
         "email": "test@example.com",
         "name": "Test User"
       },
       "token": "jwt-token-here"
     }
   }
   ```

3. **Save the token** - You'll need it for authenticated requests

4. **Test login:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "testpassword123"
     }'
   ```

---

### Step 7: Test Accounts API (5 minutes)

**Using the token from Step 6:**

1. **Create an account:**
   ```bash
   curl -X POST http://localhost:3000/api/accounts \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{
       "name": "My First Account",
       "email": "account@example.com"
     }'
   ```

2. **Get all accounts:**
   ```bash
   curl http://localhost:3000/api/accounts \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

**If these work, you're ready!** 🎉

---

## ✅ Checklist

Use this to track your progress:

- [ ] Installed dependencies (`npm install`)
- [ ] Created Neon database account
- [ ] Created Neon project
- [ ] Copied connection string
- [ ] Ran `001_initial_schema.sql` migration
- [ ] Ran `002_add_indexes.sql` migration
- [ ] Created `.env.local` file
- [ ] Added `POSTGRES_URL` to `.env.local`
- [ ] Generated and added `JWT_SECRET` to `.env.local`
- [ ] Started dev server (`npm run dev`)
- [ ] Tested database connection (`/api/test-db`)
- [ ] Registered a test user
- [ ] Tested login
- [ ] Created a test account
- [ ] Retrieved accounts list

---

## 🚨 Common Issues

### "Database connection failed"
- Check `POSTGRES_URL` is correct
- Make sure it includes `?sslmode=require`
- Verify database is running in Neon dashboard

### "JWT_SECRET not set"
- Make sure `.env.local` exists
- Check the file is in `proplytics-app/` directory
- Restart dev server after creating `.env.local`

### "401 Unauthorized"
- Make sure you're including the token in Authorization header
- Token format: `Bearer YOUR_TOKEN_HERE`
- Token might have expired - try logging in again

### "Table doesn't exist"
- Make sure you ran both migration files
- Check migrations ran successfully in Neon SQL Editor
- Verify you're connected to the correct database

---

## 📚 Need More Help?

- **Detailed setup:** See `DATABASE_SETUP.md`
- **API testing:** See `API_TESTING_GUIDE.md`
- **Full roadmap:** See `NEXT_STEPS.md`
- **Status check:** See `IMPLEMENTATION_STATUS.md`

---

## 🎯 After These Steps

Once all steps above are complete:

1. ✅ Your database is set up
2. ✅ Your API is working
3. ✅ Your frontend is ready to use the API

**Then we can:**
- Create migration script for localStorage data
- Test full frontend integration
- Deploy to staging/production

---

## ⏱️ Estimated Time

- **Total:** 20-30 minutes
- **Step 1:** 2 min
- **Step 2:** 5-10 min
- **Step 3:** 5 min
- **Step 4:** 2 min
- **Step 5:** 1 min
- **Step 6:** 5 min
- **Step 7:** 5 min

**Take it one step at a time!** 🚀

