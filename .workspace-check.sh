#!/bin/bash
# Quick script to verify you're in the correct workspace
# Run this before starting development: bash .workspace-check.sh

echo "=== Workspace Verification ==="
echo ""

CURRENT_DIR=$(pwd)
EXPECTED_DIR="/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React"

if [ "$CURRENT_DIR" = "$EXPECTED_DIR" ]; then
    echo "✅ Location: CORRECT"
else
    echo "❌ Location: WRONG"
    echo "   Current: $CURRENT_DIR"
    echo "   Expected: $EXPECTED_DIR"
    echo ""
    echo "⚠️  Please navigate to the correct directory!"
    exit 1
fi

if [ -f "package.json" ]; then
    PACKAGE_NAME=$(grep '"name"' package.json | head -1 | cut -d'"' -f4)
    if [ "$PACKAGE_NAME" = "bonzai-app" ]; then
        echo "✅ Package: bonzai-app (CORRECT)"
    else
        echo "❌ Package: $PACKAGE_NAME (WRONG - should be bonzai-app)"
        exit 1
    fi
else
    echo "❌ package.json not found"
    exit 1
fi

echo ""
echo "✅ All checks passed! You're in the correct Bonzai project."
echo "   You can now run: npm run dev"
