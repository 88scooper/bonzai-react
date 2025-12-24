#!/bin/bash
# Script to import properties from code files to database

set -e

echo "🚀 Starting property import..."
echo ""

# Login
echo "📝 Logging in..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cooper.stuartc@gmail.com","password":"testpass"}' | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✅ Logged in"
echo ""

# Get or create Demo Account
echo "📋 Getting accounts..."
ACCOUNTS_JSON=$(curl -s http://localhost:3000/api/accounts -H "Authorization: Bearer $TOKEN")
DEMO_ACCOUNT_ID=$(echo "$ACCOUNTS_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
accounts = d.get('data', {}).get('data', [])
demo = [a for a in accounts if a.get('is_demo') or a.get('name') == 'Demo Account']
print(demo[0]['id'] if demo else '')
" 2>/dev/null)

if [ -z "$DEMO_ACCOUNT_ID" ]; then
  echo "➕ Creating Demo Account..."
  DEMO_RESPONSE=$(curl -s -X POST http://localhost:3000/api/accounts \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Demo Account","isDemo":true}')
  DEMO_ACCOUNT_ID=$(echo "$DEMO_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('id', ''))" 2>/dev/null)
  echo "✅ Demo Account created: $DEMO_ACCOUNT_ID"
else
  echo "✅ Demo Account found: $DEMO_ACCOUNT_ID"
fi

SC_ACCOUNT_ID=$(echo "$ACCOUNTS_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
accounts = d.get('data', {}).get('data', [])
sc = [a for a in accounts if a.get('name') == 'SC Properties']
print(sc[0]['id'] if sc else '')
" 2>/dev/null)

if [ -z "$SC_ACCOUNT_ID" ]; then
  echo "❌ SC Properties account not found"
  exit 1
fi
echo "✅ SC Properties Account: $SC_ACCOUNT_ID"
echo ""

echo "📦 Starting property imports..."
echo ""

# This script will be extended with actual property import logic
# For now, we'll use a Node.js approach instead

echo "✅ Account setup complete"
echo "Demo Account ID: $DEMO_ACCOUNT_ID"
echo "SC Properties Account ID: $SC_ACCOUNT_ID"

