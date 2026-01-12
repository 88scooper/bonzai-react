# Bonzai - Real Estate Investment Management

**Project Name:** Bonzai  
**Project Location:** `/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React`  
**Package Name:** `bonzai-app`  
**Status:** Active Development

## ⚠️ IMPORTANT - THIS IS THE ACTIVE PROJECT

This is the **Bonzai** project. The old "Proplytics" project has been renamed and rebranded to Bonzai.

- **DO NOT** use the old project location: `/Users/stu/Documents/Proplytics/Active Project/Proplytics-React`
- **ALWAYS** work from this directory: `/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React`
- **All development** should happen in this location

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/components` - React components
- `/src/lib` - Utility libraries
- `/src/context` - React contexts
- `/migrations` - Database migrations

## Notes

- The `proplytics-app/` subdirectory is a legacy/backup copy and should not be used for active development
- All API routes use "bonzai" naming (e.g., `/api/bonzai-test`)
- Database tables may still reference `proplytics_test` - this is acceptable for now but should be migrated eventually
