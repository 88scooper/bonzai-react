# 🚨 FIX FOR AGENT CONFUSION 🚨

## Problem
Agents are confusing Bonzai with Proplytics because there are multiple directories.

## Solution - Use These Steps

### 1. Always Open the Workspace File

**Use this file to open the project:**
- Double-click: `Bonzai.code-workspace`
- OR in Cursor: File → Open Workspace from File → Select `Bonzai.code-workspace`

**DO NOT:**
- Open a folder by browsing
- Open from "Recent" if it shows "Proplytics"

### 2. Run Verification Script

**Before starting any work, always run:**
```bash
bash VERIFY_WORKSPACE.sh
```

This will tell you if you're in the right place.

### 3. Check Terminal Path

**If you see "Proplytics" in terminal path:**
- STOP
- Close the workspace
- Open `Bonzai.code-workspace` instead

### 4. Quick Verification

**Always run first:**
```bash
pwd | grep -q "Bonzai Real Estate App" && echo "✅ CORRECT" || echo "❌ WRONG - See Proplytics in path"
```

## Root Cause

There are multiple directories:
- ✅ `/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React` (CORRECT - use this)
- ❌ `/Users/stu/Documents/Proplytics/Active Project/Proplytics-React` (OLD - do not use)
- ❌ `/Users/stu/Documents/Proplytics/Active Project/Proplytics-React-ARCHIVED-DO-NOT-USE` (ARCHIVED - do not use)

**Solution:** Always use `Bonzai.code-workspace` file to ensure correct workspace.
