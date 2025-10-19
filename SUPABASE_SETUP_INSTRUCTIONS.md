# Supabase Database Setup - Riksdagsgranskning

## Quick Setup (5 minutes)

### Method 1: Supabase Dashboard SQL Editor (Recommended)

**Automated via MCP would require direct database access which isn't available through REST API.**
**Please follow these manual steps:**

#### Step 1: Open Supabase SQL Editor
Open this URL in your browser:
```
https://supabase.com/dashboard/project/kdwfiuzbnidukyywmflx/sql/new
```

#### Step 2: Copy SQL Schema
The complete SQL schema is in:
```
scripts/create-riksdagen-schema.sql
```

Or copy directly from here:

```sql
-- ================================================================
-- RIKSDAGSGRANSKNING - DATABASE SCHEMA
-- ================================================================

CREATE TABLE IF NOT EXISTS ledamoter (
  id VARCHAR(50) PRIMARY KEY,
  namn TEXT NOT NULL,
  parti VARCHAR(10),
  valkrets TEXT,
  kon VARCHAR(10),
  fodd_ar INTEGER,
  bild_url TEXT,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voteringar (
  id SERIAL PRIMARY KEY,
  votering_id VARCHAR(50),
  dokument_id VARCHAR(50),
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  datum DATE,
  titel TEXT,
  rost VARCHAR(20),
  riksmote VARCHAR(20),
  beteckning TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS motioner (
  id VARCHAR(50) PRIMARY KEY,
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  titel TEXT,
  datum DATE,
  riksmote VARCHAR(20),
  organ TEXT,
  dokument_typ VARCHAR(10),
  fulltext TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anforanden (
  id SERIAL PRIMARY KEY,
  anforande_id VARCHAR(50),
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  debatt_id VARCHAR(50),
  titel TEXT,
  text TEXT,
  datum DATE,
  taltid INTEGER,
  parti VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS franvaro_analys (
  id SERIAL PRIMARY KEY,
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  kategorier JSONB,
  total_voteringar INTEGER,
  total_franvaro INTEGER,
  franvaro_procent DECIMAL,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ledamot_id, analyzed_at)
);

CREATE TABLE IF NOT EXISTS retorik_analys (
  id SERIAL PRIMARY KEY,
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  parti VARCHAR(10),
  amne TEXT,
  anforanden_count INTEGER,
  mentions_count INTEGER,
  positiv_sentiment BOOLEAN,
  relevanta_voteringar INTEGER,
  positiva_roster INTEGER,
  negativa_roster INTEGER,
  franvarande_roster INTEGER,
  gap_score DECIMAL,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ledamot_id, amne, analyzed_at)
);

CREATE TABLE IF NOT EXISTS motion_kvalitet (
  id SERIAL PRIMARY KEY,
  motion_id VARCHAR(50) REFERENCES motioner(id),
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  har_konkreta_forslag INTEGER,
  har_kostnader INTEGER,
  har_specifika_mal INTEGER,
  har_lagtext INTEGER,
  har_implementation INTEGER,
  substantiell_score INTEGER,
  kategori VARCHAR(20),
  sammanfattning TEXT,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(motion_id, analyzed_at)
);

CREATE INDEX IF NOT EXISTS idx_voteringar_ledamot ON voteringar(ledamot_id);
CREATE INDEX IF NOT EXISTS idx_voteringar_franvarande ON voteringar(rost) WHERE rost = 'Frånvarande';
CREATE INDEX IF NOT EXISTS idx_voteringar_datum ON voteringar(datum DESC);
CREATE INDEX IF NOT EXISTS idx_motioner_ledamot ON motioner(ledamot_id);
CREATE INDEX IF NOT EXISTS idx_motioner_datum ON motioner(datum DESC);
CREATE INDEX IF NOT EXISTS idx_anforanden_ledamot ON anforanden(ledamot_id);
CREATE INDEX IF NOT EXISTS idx_franvaro_kategorier ON franvaro_analys USING GIN (kategorier);
```

#### Step 3: Run SQL
1. Paste the SQL into the editor
2. Click the "Run" button (or press Cmd/Ctrl + Enter)
3. Wait for success message

#### Step 4: Verify Tables Created
Run this verification query in the SQL editor:

```sql
SELECT
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'ledamoter',
  'voteringar',
  'motioner',
  'anforanden',
  'franvaro_analys',
  'retorik_analys',
  'motion_kvalitet'
)
ORDER BY tablename;
```

You should see 7 tables:
- ledamoter
- voteringar
- motioner
- anforanden
- franvaro_analys
- retorik_analys
- motion_kvalitet

### Method 2: Using psql (Alternative)

If you have PostgreSQL client installed:

```bash
# Get your database password from Supabase Dashboard:
# https://supabase.com/dashboard/project/kdwfiuzbnidukyywmflx/settings/database

psql "postgresql://postgres.kdwfiuzbnidukyywmflx:[YOUR_PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres" \
  -f scripts/create-riksdagen-schema.sql
```

## Database Schema Overview

### Tables Created

1. **ledamoter** - Members of Parliament
   - Stores basic info: name, party, constituency, etc.
   - Primary data source for all analysis

2. **voteringar** - Voting records
   - Individual votes by each member
   - Links to ledamoter

3. **motioner** - Motions/Proposals
   - Full text of motions submitted by members
   - Links to ledamoter

4. **anforanden** - Speeches
   - Speech transcripts from parliament debates
   - Links to ledamoter

5. **franvaro_analys** - Absence Analysis (LLM-generated)
   - Categorized absence patterns
   - Statistics on voting participation

6. **retorik_analys** - Rhetoric Analysis (LLM-generated)
   - Gap between speech and voting behavior
   - Topic-based sentiment analysis

7. **motion_kvalitet** - Motion Quality (LLM-generated)
   - Quality scores for motions
   - Substantive content analysis

### Indexes Created

Performance indexes for common queries:
- voteringar: ledamot_id, datum, absence filter
- motioner: ledamot_id, datum
- anforanden: ledamot_id
- franvaro_analys: JSONB categories (GIN index)

## Verification

After running the SQL, verify setup with:

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

Tables found: 7/7
Database ready: YES ✓
```

## Next Steps

Once database is set up:

1. **Sync data from Riksdagen API**
   ```bash
   npm run sync
   ```

2. **Verify data import**
   ```bash
   node scripts/check-tables.js
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## Troubleshooting

### "Table does not exist" errors
- Make sure you ran the SQL in the correct Supabase project
- Check that you're using the public schema
- Verify project ID matches: kdwfiuzbnidukyywmflx

### "Permission denied" errors
- Ensure you're logged into Supabase Dashboard
- Check that you have admin access to the project

### "Foreign key constraint" errors
- Make sure you run the full SQL script
- Tables must be created in order (ledamoter first)

## Database Configuration

Current Supabase Project:
- **Project ID**: kdwfiuzbnidukyywmflx
- **Region**: eu-north-1
- **URL**: https://kdwfiuzbnidukyywmflx.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/kdwfiuzbnidukyywmflx

## Support

If you encounter issues:
1. Check Supabase Dashboard logs
2. Verify environment variables in .env.local
3. Review error messages in console
4. Check Supabase project status: https://status.supabase.com/
