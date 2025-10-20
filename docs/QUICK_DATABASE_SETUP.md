# Quick Database Setup - 2 Minutes

## 🎯 Goal
Create 7 tables + 7 indexes in your Supabase database for Riksdagsgranskning.

## ⚡ Steps

### 1. Open Supabase SQL Editor
Click this link:
```
https://supabase.com/dashboard/project/kdwfiuzbnidukyywmflx/sql/new
```

### 2. Copy SQL
Open this file in your project:
```
scripts/create-riksdagen-schema.sql
```

OR use this command to copy to clipboard:
```bash
cat scripts/create-riksdagen-schema.sql | pbcopy
```

### 3. Paste & Run
1. Paste SQL into Supabase SQL Editor
2. Click "Run" button
3. Wait for success message (~ 5 seconds)

### 4. Verify
Run this command to check tables were created:
```bash
node scripts/check-tables.js
```

Expected output:
```
✓ Table 'ledamoter' exists (0 rows)
✓ Table 'voteringar' exists (0 rows)
✓ Table 'motioner' exists (0 rows)
✓ Table 'anforanden' exists (0 rows)
✓ Table 'franvaro_analys' exists (0 rows)
✓ Table 'retorik_analys' exists (0 rows)
✓ Table 'motion_kvalitet' exists (0 rows)

Database ready: YES ✓
```

## ✅ Done!

Your database is ready. Next steps:

```bash
# Sync data from Riksdagen API
npm run sync

# Start development server
npm run dev
```

## 📚 Tables Created

1. **ledamoter** - Parliament members (349 members)
2. **voteringar** - Voting records (~100k+ votes)
3. **motioner** - Motions/proposals (~10k+ motions)
4. **anforanden** - Speech transcripts (~50k+ speeches)
5. **franvaro_analys** - LLM absence analysis
6. **retorik_analys** - LLM rhetoric analysis
7. **motion_kvalitet** - LLM motion quality scores

## 🔍 Need Help?

See detailed instructions:
```
SUPABASE_SETUP_INSTRUCTIONS.md
```
