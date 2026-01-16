# 🚨 AGENT INSTRUCTIONS - READ THIS FIRST 🚨

## CRITICAL: Before You Do ANYTHING

**Run these commands FIRST and verify the output:**

```bash
pwd
grep '"name"' package.json
```

**✅ CORRECT Output:**
```
/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React
  "name": "bonzai-app",
```

**❌ WRONG Output (STOP if you see this):**
- Path contains "Proplytics"
- Package shows "proplytics-app" or anything other than "bonzai-app"

## If You See "Proplytics" in Your Path

**STOP IMMEDIATELY** - You are in the ARCHIVED project!

**DO NOT:**
- Make any changes
- Run any commands
- Open any files

**DO THIS INSTEAD:**
1. Tell the user: "I see I'm in the wrong location (Proplytics directory)"
2. Ask the user to open the Bonzai project in Cursor
3. Wait until the workspace is switched to Bonzai

## Project Identification

- **Project Name:** Bonzai
- **Package Name:** bonzai-app
- **Correct Path Contains:** "Bonzai Real Estate App"
- **Wrong Path Contains:** "Proplytics"

## Quick Test

Run: `bash VERIFY_WORKSPACE.sh`

If it passes, you're good. If it fails, STOP and report the issue.
