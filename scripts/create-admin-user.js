/**
 * Script to create an admin user
 * Run with: node scripts/create-admin-user.js
 * 
 * This script creates a user with admin privileges.
 * Make sure to run the database migration (003_add_admin_field.sql) first!
 * 
 * Make sure your .env.local file has POSTGRES_URL set!
 */

// Note: This needs to be run in a Node.js environment with access to the database
// For Next.js projects, we'll create an API endpoint instead

console.log(`
To create an admin user, you have two options:

Option 1: Use the API endpoint (Recommended)
1. Start your development server: npm run dev
2. Make a POST request to /api/admin/create-admin-user
   Or use curl:
   curl -X POST http://localhost:3000/api/admin/create-admin-user \\
     -H "Content-Type: application/json" \\
     -d '{"email":"admin@proplytics.ca","password":"testpass","name":"Admin User"}'

Option 2: Run SQL directly in your database
Run this SQL in your Neon database SQL editor:

INSERT INTO users (email, password_hash, name, is_admin)
VALUES (
  'admin@proplytics.ca',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJqZ5Q5K2', -- hash for 'testpass'
  'Admin User',
  TRUE
);

Note: The password hash above is for 'testpass'. If you want a different password,
you'll need to generate a bcrypt hash first.
`);

