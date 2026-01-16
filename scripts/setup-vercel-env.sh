#!/bin/bash

# Script to set up environment variables in Vercel
# This script helps configure JWT_SECRET and other required environment variables

set -e

echo "🚀 Vercel Environment Variables Setup"
echo "======================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI is not installed."
  echo ""
  echo "Please install it first:"
  echo "   npm i -g vercel"
  echo ""
  echo "Or add variables manually in Vercel Dashboard:"
  echo "   https://vercel.com/dashboard -> Your Project -> Settings -> Environment Variables"
  exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Generate JWT_SECRET if not provided
if [ -z "$JWT_SECRET" ]; then
  echo "🔐 Generating JWT_SECRET..."
  JWT_SECRET=$(openssl rand -base64 32)
  echo "   Generated: ${JWT_SECRET:0:20}..."
  echo ""
fi

# Check if POSTGRES_URL is set
if [ -z "$POSTGRES_URL" ]; then
  echo "⚠️  POSTGRES_URL is not set in your environment."
  echo "   You'll need to provide your Neon database connection string."
  echo ""
  read -p "Enter your POSTGRES_URL (or press Enter to skip): " POSTGRES_URL_INPUT
  if [ ! -z "$POSTGRES_URL_INPUT" ]; then
    POSTGRES_URL="$POSTGRES_URL_INPUT"
  fi
fi

# Confirm before proceeding
echo "📋 Environment variables to set:"
echo ""
echo "   JWT_SECRET: ${JWT_SECRET:0:20}..."
if [ ! -z "$POSTGRES_URL" ]; then
  echo "   POSTGRES_URL: ${POSTGRES_URL:0:40}..."
else
  echo "   POSTGRES_URL: (not set - you'll need to add this manually)"
fi
echo ""
read -p "Add these to Vercel? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
  echo "❌ Cancelled."
  exit 0
fi

echo ""
echo "🔧 Setting environment variables in Vercel..."
echo ""

# Set JWT_SECRET
echo "Setting JWT_SECRET..."
echo "$JWT_SECRET" | vercel env add JWT_SECRET production
echo "$JWT_SECRET" | vercel env add JWT_SECRET preview
echo "$JWT_SECRET" | vercel env add JWT_SECRET development

# Set POSTGRES_URL if provided
if [ ! -z "$POSTGRES_URL" ]; then
  echo "Setting POSTGRES_URL..."
  echo "$POSTGRES_URL" | vercel env add POSTGRES_URL production
  echo "$POSTGRES_URL" | vercel env add POSTGRES_URL preview
  echo "$POSTGRES_URL" | vercel env add POSTGRES_URL development
fi

# Set JWT_EXPIRES_IN (optional, has default)
if [ -z "$JWT_EXPIRES_IN" ]; then
  JWT_EXPIRES_IN="7d"
fi
echo "Setting JWT_EXPIRES_IN..."
echo "$JWT_EXPIRES_IN" | vercel env add JWT_EXPIRES_IN production 2>/dev/null || true
echo "$JWT_EXPIRES_IN" | vercel env add JWT_EXPIRES_IN preview 2>/dev/null || true
echo "$JWT_EXPIRES_IN" | vercel env add JWT_EXPIRES_IN development 2>/dev/null || true

echo ""
echo "✅ Environment variables configured!"
echo ""
echo "📝 Next steps:"
echo "   1. Go to Vercel Dashboard and verify the variables are set"
echo "   2. Redeploy your application (or push a new commit)"
echo "   3. The JWT_SECRET error should now be resolved"
echo ""
echo "💾 Save this JWT_SECRET for your local .env.local file:"
echo "   JWT_SECRET=$JWT_SECRET"
