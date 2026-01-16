#!/bin/bash
# Run this script FIRST to verify you're in the correct workspace

echo "🔍 Verifying Workspace..."
echo ""

CURRENT_DIR=$(pwd)
EXPECTED_DIR="/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React"

echo "1. Checking location..."
if [ "$CURRENT_DIR" = "$EXPECTED_DIR" ]; then
    echo "   ✅ CORRECT: Bonzai project location"
else
    echo "   ❌ WRONG LOCATION!"
    echo "   Current: $CURRENT_DIR"
    echo "   Expected: $EXPECTED_DIR"
    echo ""
    if echo "$CURRENT_DIR" | grep -q "Proplytics"; then
        echo "   ⚠️  WARNING: You're in the OLD PROPLYTICS directory!"
        echo "   Please navigate to the Bonzai project location."
    fi
    exit 1
fi

echo ""
echo "2. Checking package name..."
if [ -f package.json ]; then
    PACKAGE_NAME=$(grep '"name"' package.json | head -1 | cut -d'"' -f4)
    if [ "$PACKAGE_NAME" = "bonzai-app" ]; then
        echo "   ✅ CORRECT: bonzai-app"
    else
        echo "   ❌ WRONG PACKAGE: $PACKAGE_NAME (should be bonzai-app)"
        exit 1
    fi
else
    echo "   ❌ package.json not found"
    exit 1
fi

echo ""
echo "✅ VERIFICATION PASSED - You're in the correct Bonzai project!"
echo "   You can now proceed with your work."
