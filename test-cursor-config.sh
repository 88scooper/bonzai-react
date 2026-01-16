#!/bin/bash
# Test script to verify Cursor configuration

echo "🧪 Testing Cursor Configuration for Bonzai Project"
echo ""

# Test 1: Location
echo "Test 1: Location Verification"
CURRENT_DIR=$(pwd)
EXPECTED_DIR="/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React"
if [ "$CURRENT_DIR" = "$EXPECTED_DIR" ]; then
    echo "  ✅ PASS: Correct location"
else
    echo "  ❌ FAIL: Wrong location"
    echo "     Current: $CURRENT_DIR"
    echo "     Expected: $EXPECTED_DIR"
    exit 1
fi

# Test 2: Package name
echo ""
echo "Test 2: Package Name Verification"
if [ -f package.json ]; then
    PACKAGE_NAME=$(grep '"name"' package.json | head -1 | cut -d'"' -f4)
    if [ "$PACKAGE_NAME" = "bonzai-app" ]; then
        echo "  ✅ PASS: Correct package name (bonzai-app)"
    else
        echo "  ❌ FAIL: Wrong package name ($PACKAGE_NAME)"
        exit 1
    fi
else
    echo "  ❌ FAIL: package.json not found"
    exit 1
fi

# Test 3: .cursorrules exists
echo ""
echo "Test 3: .cursorrules File"
if [ -f .cursorrules ]; then
    echo "  ✅ PASS: .cursorrules exists"
    if grep -q "Bonzai" .cursorrules; then
        echo "  ✅ PASS: .cursorrules contains Bonzai context"
    else
        echo "  ⚠️  WARN: .cursorrules doesn't mention Bonzai"
    fi
else
    echo "  ❌ FAIL: .cursorrules not found"
    exit 1
fi

# Test 4: .vscode/settings.json
echo ""
echo "Test 4: Workspace Settings"
if [ -f .vscode/settings.json ]; then
    echo "  ✅ PASS: .vscode/settings.json exists"
    if grep -q "proplytics-app" .vscode/settings.json; then
        echo "  ✅ PASS: Legacy directories excluded from search"
    fi
else
    echo "  ⚠️  WARN: .vscode/settings.json not found (optional)"
fi

echo ""
echo "✅ All critical tests passed!"
echo "   Cursor configuration is ready for use."
