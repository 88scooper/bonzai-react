# 🚨 CRITICAL: Read This Before Starting Work

## ⚠️ IMPORTANT PROJECT IDENTIFICATION

**Project Name:** Bonzai  
**Package Name:** `bonzai-app`  
**Active Project Location:** `/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React`

## ✅ ALWAYS VERIFY BEFORE STARTING

Before making ANY changes or running ANY commands, you MUST:

1. **Verify the current working directory:**
   ```bash
   pwd
   ```
   Must show: `/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React`

2. **Verify the package name:**
   ```bash
   grep '"name"' package.json
   ```
   Must show: `"name": "bonzai-app",`

3. **Check if you're in the correct location:**
   ```bash
   ls -la src/app/page.jsx
   ```
   Should exist and show the Bonzai homepage

## ❌ DO NOT USE THESE LOCATIONS

- ❌ `/Users/stu/Documents/Proplytics/Active Project/Proplytics-React` (OLD - archived)
- ❌ `/Users/stu/Documents/Proplytics/Active Project/Proplytics-React-ARCHIVED-DO-NOT-USE` (OLD - archived)
- ❌ Any directory containing "Proplytics" in the path
- ❌ The `proplytics-app/` subdirectory inside the Bonzai project (legacy/backup)

## 📋 QUICK VERIFICATION COMMAND

Run this before starting any work:
```bash
cd "/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React" && \
pwd && \
grep '"name"' package.json && \
echo "✅ Location verified: This is the Bonzai project"
```

Expected output:
```
/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React
  "name": "bonzai-app",
✅ Location verified: This is the Bonzai project
```

## 🎯 PROJECT CONTEXT

- **This is the Bonzai project** (formerly named "Proplytics")
- All branding should be "Bonzai" not "Proplytics"
- Package name is `bonzai-app` (not `proplytics-app`)
- Main source code is in `/src/` directory
- API routes use "bonzai" naming (e.g., `/api/bonzai-test`)
- The `proplytics-app/` subdirectory is a legacy backup - do NOT use it

## 🔍 KEY FILES TO CHECK

If you need to verify you're in the right project, check these files:

- `package.json` → Should show `"name": "bonzai-app"`
- `src/app/layout.js` → Should show `title: "Bonzai"`
- `src/app/page.jsx` → Should show "Bonzai" branding, NOT "Proplytics"
- `README.md` → Should identify this as the Bonzai project

## ⚡ IF YOU'RE IN THE WRONG LOCATION

If `pwd` shows a path containing "Proplytics", STOP and:

1. Navigate to the correct directory:
   ```bash
   cd "/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React"
   ```

2. Verify you're now in the correct location:
   ```bash
   pwd && grep '"name"' package.json
   ```

3. Only then proceed with your work

## 📝 WHAT TO DO IF UNCERTAIN

If you're unsure about the project location:

1. **STOP** - Don't make any changes
2. Run the verification command above
3. Check the `package.json` file
4. Ask the user to confirm before proceeding

## 🚀 STARTING DEVELOPMENT

Once verified, you can proceed:

```bash
# Navigate to correct location (if not already there)
cd "/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React"

# Verify location
pwd && grep '"name"' package.json

# Start dev server (if needed)
npm run dev
```

## 📚 ADDITIONAL RESOURCES

- `README.md` - Project overview
- `AVOID_CONFUSION.md` - Detailed guide on avoiding confusion
- `QUICK_START.md` - Quick reference guide
- `.workspace-check.sh` - Verification script (run: `bash .workspace-check.sh`)

---

## 🎯 SUMMARY FOR AI AGENTS

**Before you start ANY work:**
1. ✅ Check `pwd` - must be Bonzai project location
2. ✅ Check `package.json` - must show `"bonzai-app"`
3. ✅ Verify no "Proplytics" in the path
4. ✅ If uncertain, ASK the user before proceeding

**Remember:** This is the Bonzai project. Do NOT work on any project in a "Proplytics" directory path.
