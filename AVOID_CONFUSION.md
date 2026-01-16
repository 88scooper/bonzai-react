# Avoiding Confusion Between Projects

## ✅ DO THIS

1. **Always open the Bonzai project in Cursor:**
   - Use: `/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React`
   - Package name: `bonzai-app`
   - Check: `package.json` should show `"name": "bonzai-app"`

2. **Before running commands, verify location:**
   ```bash
   pwd  # Should show: .../Bonzai Real Estate App/.../Bonzai-React
   grep '"name"' package.json  # Should show: "bonzai-app"
   ```

3. **Start dev server only from Bonzai directory:**
   ```bash
   cd "/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React"
   npm run dev
   ```

4. **Check which dev server is running:**
   ```bash
   ps aux | grep "next dev" | grep -v grep
   ```
   Should show path to `Bonzai-React`, NOT `Proplytics-React`

## ❌ DON'T DO THIS

1. **Don't open the old Proplytics directory:**
   - ❌ `/Users/stu/Documents/Proplytics/Active Project/Proplytics-React`
   - This is the OLD project - do not use it

2. **Don't run dev servers from multiple locations**
   - Only one dev server should run at a time
   - Always stop old servers before starting new ones

3. **Don't work in the `proplytics-app/` subdirectory**
   - This is a legacy/backup copy inside Bonzai project
   - All active development happens in `src/` directory

## 🔍 Quick Checks

Before starting work, verify:
- ✅ You're in the Bonzai directory
- ✅ `package.json` shows `"bonzai-app"`
- ✅ No old dev servers running
- ✅ Files show "Bonzai" not "Proplytics" (except migration utilities)

## 📝 Recommendation

**Rename the old project directory** to make it clear it's not active:
```bash
mv "/Users/stu/Documents/Proplytics/Active Project/Proplytics-React" \
   "/Users/stu/Documents/Proplytics/Active Project/Proplytics-React-ARCHIVED"
```

Or delete it if you're certain you don't need it:
```bash
# Be careful - this is permanent!
# rm -rf "/Users/stu/Documents/Proplytics/Active Project/Proplytics-React"
```

## ✅ UPDATE - Old Project Archived

The old Proplytics project has been archived:
- **Archived location:** `/Users/stu/Documents/Proplytics/Active Project/Proplytics-React-ARCHIVED-DO-NOT-USE`
- **This location should NOT be opened or used**
- **DO NOT** run any commands from the archived directory
