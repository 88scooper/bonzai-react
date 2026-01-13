#!/bin/bash

# Script to verify required environment variables are set

echo "🔍 Checking environment variables..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local file not found!"
  echo "   Create it with: touch .env.local"
  exit 1
fi

# Source the .env.local file
set -a
source .env.local
set +a

# Check required variables
MISSING_VARS=()

if [ -z "$JWT_SECRET" ]; then
  MISSING_VARS+=("JWT_SECRET")
fi

if [ -z "$POSTGRES_URL" ]; then
  MISSING_VARS+=("POSTGRES_URL")
fi

# Report results
if [ ${#MISSING_VARS[@]} -eq 0 ]; then
  echo "✅ All required environment variables are set!"
  echo ""
  echo "   JWT_SECRET: $(echo $JWT_SECRET | cut -c1-10)..."
  echo "   POSTGRES_URL: $(echo $POSTGRES_URL | cut -c1-30)..."
  echo ""
  echo "✅ Ready to run the application!"
else
  echo "❌ Missing required environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "To generate JWT_SECRET:"
  echo "   openssl rand -base64 32"
  echo ""
  exit 1
fi
