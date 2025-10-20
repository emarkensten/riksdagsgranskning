# Week 1 - Next Steps to Complete Initial Setup

## Overview

The Next.js project, dependencies, and data sync scripts are now ready. The last steps to complete Week 1 are:

1. Initialize the database schema in Supabase
2. Run the initial data sync
3. Verify data quality

## Step 1: Set Up Supabase Database Schema

### Via Supabase Web Dashboard:

1. Go to your Supabase project: `https://supabase.com/dashboard/project/kdwfiuzbnidukyywmflx`
2. Click **SQL Editor** in the left menu
3. Click **New Query** button
4. Copy the entire contents of `scripts/init-db.sql` and paste it into the editor
5. Click **Run** (or press Cmd+Enter)
6. You should see all tables created successfully

### What gets created:
- `ledamoter` - Members/politicians table (349 rows)
- `voteringar` - Individual voting records
- `motioner` - Motions/proposals table
- `anforanden` - Parliamentary statements table
- `franvaro_analys` - Absence analysis results (will be populated later)
- `retorik_analys` - Rhetoric analysis results (will be populated later)
- `motion_kvalitet` - Motion quality analysis results (will be populated later)

Plus indexes for fast querying.

## Step 2: Get Service Role Key (needed for data sync)

The data sync script needs the **Service Role Key** to write to the database.

1. In Supabase dashboard, go to **Settings** → **API**
2. Under **Project API keys**, find the key labeled **`service_role`** (it's the secret one)
3. Copy it
4. Update `.env.local` in the project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

## Step 3: Run Initial Data Sync

In the project root directory:

```bash
# Install ts-node globally if not already installed
npm install -g ts-node

# Run the data sync script
cd /Users/erikmarkensten/Documents/GitHub/riksdagsgranskning
npx ts-node scripts/sync-data.ts
```

**What it does:**
- Fetches all 349+ members from Riksdagen API
- Fetches voting records from the last 2-3 years (~10,000+ records)
- Fetches motions from the last 2-3 years
- Fetches parliamentary statements
- Stores everything in Supabase PostgreSQL

**Expected output:**
```
Starting data sync...

Syncing members...
Fetched 349 members
✓ Members synced

Syncing votings...
  Fetching votings for riksmöte 2024/25...
  [processing...]
✓ Votings synced

Syncing motions...
  Fetching motions for riksmöte 2024/25...
  Found XXX motions
✓ Motions synced

Syncing anföranden...
  Fetching anföranden for riksmöte 2024/25...
  Found XXX anföranden
✓ Anföranden synced

✓ Data sync complete!
```

## Step 4: Verify Data Quality

After data sync completes, verify the data in Supabase:

### Via Supabase SQL Editor:

```sql
-- Count members (should be ~349)
SELECT COUNT(*) as member_count FROM ledamoter;

-- Count votings (should be >10,000)
SELECT COUNT(*) as voting_count FROM voteringar;

-- Count motions
SELECT COUNT(*) as motion_count FROM motioner;

-- Count anföranden (parliamentary statements)
SELECT COUNT(*) as anforanden_count FROM anforanden;

-- Sample: Members with most absences
SELECT
  l.namn,
  l.parti,
  COUNT(*) as total_votes,
  SUM(CASE WHEN v.rost = 'Frånvarande' THEN 1 ELSE 0 END) as absences,
  ROUND(100.0 * SUM(CASE WHEN v.rost = 'Frånvarande' THEN 1 ELSE 0 END) / COUNT(*), 1) as absence_rate
FROM ledamoter l
LEFT JOIN voteringar v ON l.id = v.ledamot_id
GROUP BY l.id, l.namn, l.parti
ORDER BY absences DESC
LIMIT 10;

-- Check party distribution
SELECT
  parti,
  COUNT(*) as count
FROM ledamoter
WHERE parti IS NOT NULL
GROUP BY parti
ORDER BY count DESC;
```

## Troubleshooting

### Error: "Service role key not found"
- Make sure you added `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- Verify it's the correct key from Supabase Settings → API

### Error: "Connection timeout"
- Check your internet connection
- Riksdagen API might be temporarily down
- Try again in a few minutes

### Error: "Duplicate key value violates unique constraint"
- This is normal if you run the script multiple times
- It won't insert duplicates, only updates existing records

### Error: "Could not fetch fulltext for motion"
- Some older motions don't have fulltext available
- This is normal and won't break the import

### Script takes very long
- First run can take 5-10 minutes due to API rate limits
- It's fetching thousands of records from Riksdagen
- Let it run, don't interrupt

## What's Next (Week 1 Follow-up)

Once data is synced and verified:

1. ✅ Data collection complete
2. **Next: Start Week 2 tasks**
   - Expand to more historical data
   - Set up automated daily sync via Vercel cron jobs
   - Build admin dashboard for monitoring

## Quick Reference

```bash
# Start dev server
npm run dev
# Visit http://localhost:3000

# Run linter
npm run lint

# Build for production
npm run build

# Run data sync again (if needed)
npx ts-node scripts/sync-data.ts
```

## Support

If you run into issues:
1. Check DEVELOPMENT.md for more details
2. Check your .env.local has all 4 variables
3. Verify Supabase project is working
4. Try running individual SQL queries in Supabase SQL Editor

---

**Time estimate for Steps 1-4:** 10-15 minutes
