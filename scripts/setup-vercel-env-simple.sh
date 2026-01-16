#!/bin/bash

# Simple script to help you set Vercel environment variables
# This script generates values and provides you with Vercel CLI commands

echo "🚀 Vercel Environment Variables Setup Helper"
echo "=============================================="
echo ""

# Generate JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)
echo "✅ Generated JWT_SECRET"
echo ""

echo "📋 Copy and run these commands to set up your Vercel environment variables:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# Set JWT_SECRET (all environments):"
echo "echo '$JWT_SECRET' | vercel env add JWT_SECRET production"
echo "echo '$JWT_SECRET' | vercel env add JWT_SECRET preview"
echo "echo '$JWT_SECRET' | vercel env add JWT_SECRET development"
echo ""
echo "# Set POSTGRES_URL (replace with your actual connection string):"
echo "# echo 'your-neon-connection-string' | vercel env add POSTGRES_URL production"
echo "# echo 'your-neon-connection-string' | vercel env add POSTGRES_URL preview"
echo "# echo 'your-neon-connection-string' | vercel env add POSTGRES_URL development"
echo ""
echo "# Set JWT_EXPIRES_IN (optional, defaults to 7d):"
echo "echo '7d' | vercel env add JWT_EXPIRES_IN production"
echo "echo '7d' | vercel env add JWT_EXPIRES_IN preview"
echo "echo '7d' | vercel env add JWT_EXPIRES_IN development"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "💾 Save this JWT_SECRET for your local .env.local:"
echo "   JWT_SECRET=$JWT_SECRET"
echo ""

read -p "Would you like me to run these commands now? (y/n): " RUN_NOW

if [ "$RUN_NOW" = "y" ]; then
  if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Install with: npm i -g vercel"
    exit 1
  fi
  
  echo ""
  echo "🔧 Setting environment variables..."
  
  echo "$JWT_SECRET" | vercel env add JWT_SECRET production
  echo "$JWT_SECRET" | vercel env add JWT_SECRET preview
  echo "$JWT_SECRET" | vercel env add JWT_SECRET development
  
  echo ""
  echo "✅ JWT_SECRET configured!"
  echo "⚠️  Don't forget to set POSTGRES_URL manually in Vercel Dashboard"
  echo "   or run the commands above when you have your connection string."
else
  echo ""
  echo "📝 Manual setup instructions:"
  echo "   1. Copy the commands above"
  echo "   2. Replace 'your-neon-connection-string' with your actual Neon connection string"
  echo "   3. Run each command in your terminal"
  echo ""
  echo "   Or use the Vercel Dashboard:"
  echo "   https://vercel.com/dashboard -> Your Project -> Settings -> Environment Variables"
fi
