# Batch Analysis System - How It Works

**Last Updated**: 2025-10-22
**Status**: System is working correctly, but reporting was misleading

## Overview

This system analyzes Riksdag data (motions, members, speeches, votes) using OpenAI's Batch API to get 50% cost savings.

## System Components

### 1. Submit Batch (`/api/admin/analysis/submit-batch`)

**Location**: `app/api/admin/analysis/submit-batch/route.ts`

**How it works**:
1. Calls SQL function `get_motions_without_analysis()` to fetch motions that DON'T have analysis yet
2. Creates OpenAI batch requests (JSONL format)
3. Uploads to OpenAI and gets batch_id back
4. Stores batch metadata in `batch_jobs` table

**Key SQL Function** (lines 50-54):
```typescript
const { data: motions, error } = await supabaseAdmin!
  .rpc('get_motions_without_analysis', {
    limit_count: limit,
    riksmote_filter: ['2022/23', '2023/24', '2024/25']
  })
```

**SQL Function Definition**:
```sql
CREATE OR REPLACE FUNCTION get_motions_without_analysis(
  limit_count INT,
  riksmote_filter TEXT[]
)
RETURNS TABLE (
  id TEXT,
  ledamot_id TEXT,
  titel TEXT,
  fulltext TEXT,
  datum DATE,
  riksmote TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.ledamot_id,
    m.titel,
    m.fulltext,
    m.datum,
    m.riksmote
  FROM motioner m
  LEFT JOIN motion_kvalitet mq ON m.id = mq.motion_id
  WHERE m.titel IS NOT NULL
    AND m.titel != ''
    AND m.riksmote = ANY(riksmote_filter)
    AND mq.motion_id IS NULL  -- KEY: Only motions WITHOUT analysis
  ORDER BY m.datum DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

**This function is CORRECT** - it filters out motions that already have analysis.

### 2. Store Results (`/api/admin/analysis/store-batch-results`)

**Location**: `app/api/admin/analysis/store-batch-results/route.ts`

**How it works**:
1. Fetches batch results from OpenAI (output file)
2. Parses JSONL results
3. Extracts motion_id from custom_id (e.g., `motion_quality_H902123_0` → motion_id: `H902123`)
4. **UPSERTS** data into `motion_kvalitet` table

**Key Code** (lines 114-128):
```typescript
const { error } = await supabaseAdmin
  .from('motion_kvalitet')
  .upsert({
    motion_id: motionId,
    har_konkreta_forslag: ...,
    har_kostnader: ...,
    // ... more fields
  }, {
    onConflict: 'motion_id'  // KEY: Update if exists, insert if new
  })
```

**What UPSERT means**:
- If `motion_id` already exists → **UPDATE** existing row (replace data)
- If `motion_id` doesn't exist → **INSERT** new row

### 3. Check Coverage (`scripts/check_coverage.js`)

Shows how many motions have analysis vs how many exist.

**Truth source**: Queries database directly to count analyzed motions.

## What Went Wrong (History)

### Round 1 (2025-01-22)
- Submitted 9 batches for ~9,000 motions
- **Problem**: Included 2025/26 riksmöte (which has no votes/speeches yet)
- **Result**: 8,007 motions analyzed (including ~1,000 from 2025/26)

### Cleanup (2025-10-22 Session 2)
- **Decision**: Focus on 2022/23-2024/25 only (consistent data)
- Deleted 1,000 motion_kvalitet entries from 2025/26 riksmöte
- **Database state**: ~7,000 motions with analysis (from 2022-2025)

### Round 2 (2025-10-22)
- Submitted 8 batches for 7,035 motions
- Batches completed successfully
- Script said "7,007 motions stored"
- **Coverage showed 2,671 total (671 from Round 1 + 2,000 from Round 2)**

### The Confusion

**Why did script say "7,007 stored" but only 2,000 were new?**

Because the script counted every successful UPSERT as "stored", even if it was just updating an existing row, not creating a new one.

**Reality**:
- Round 1 created 671 entries (after removing 2025/26 data and duplicates)
- Round 2 added 2,000 NEW entries
- ~5,000 were updates of existing entries (overlapping data between rounds)
- Total after Round 2: 2,671 unique entries

**Why so much overlap?**

Because Round 1 and Round 2 both fetched motions from 2022-2025. The SQL function `get_motions_without_analysis()` should have prevented this, but there was a timing issue where Round 2 was submitted before Round 1 results were stored. This caused ~5,000 motions to be analyzed twice (but UPSERT prevented actual duplicates in database).

## Current Status (2025-10-22)

**Coverage**:
- 2022/23: 130/2,384 (5.5%)
- 2023/24: 326/2,902 (11.2%)
- 2024/25: 2,215/3,420 (64.8%)
- **Total: 2,671/8,706 (30.7%)**

**Missing: 6,035 motions**

## How to Complete Analysis (Round 3)

### Step 1: Verify SQL function returns correct count

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_motions_without_analysis', {
    limit_count: 10000,
    riksmote_filter: ['2022/23', '2023/24', '2024/25']
  });
  console.log('Motions without analysis:', data?.length);
}
check();
"
```

**Expected**: Should return exactly 6,035 motions

### Step 2: Submit batch

```bash
curl -X POST 'http://localhost:3001/api/admin/analysis/submit-batch?type=motion_quality&limit=6035&confirm=yes' \
  -H "Authorization: Bearer dev-secret-key-2025"
```

### Step 3: Wait 15-24 hours for OpenAI to process

### Step 4: Store results

Create script similar to `scripts/store_round2_batches.js` with new batch IDs.

### Step 5: Verify coverage

```bash
node scripts/check_coverage.js
```

**Expected**: Should show ~8,706/8,706 (100%)

## Key Learnings

### ✅ What's Working

1. **SQL function** correctly filters out analyzed motions
2. **UPSERT** correctly prevents duplicates
3. **Coverage script** shows truth (queries database directly)

### ❌ What Was Misleading

1. **Store script reporting** - counted updates as "stored"
2. **No verification** before submitting batches
3. **Overlapping batches** - Round 1 and 2 analyzed same motions

### 🎯 Best Practices Going Forward

1. **ALWAYS use Supabase MCP for verification queries** (NOT JS client):

   ✅ **Correct**:
   ```typescript
   // Use MCP tool
   mcp__supabase__execute_sql with query:
   "SELECT COUNT(*) FROM motion_kvalitet"
   ```

   ❌ **Wrong** (will cause errors):
   ```typescript
   // Supabase JS client - has 1000 row limit!
   const { data } = await supabase.from('motioner').select('*').limit(10000)
   // This will only return 1000 rows despite limit(10000)
   ```

   **Why MCP is better**:
   - No row limits (JS client maxes at 1000)
   - Direct SQL access
   - No auth/connection issues
   - Returns exact data

2. **Always verify count BEFORE submitting batch**:
   ```sql
   -- Use SQL directly (Supabase JS client has 1000 row limit by default)
   SELECT COUNT(*)
   FROM motioner m
   LEFT JOIN motion_kvalitet mq ON m.id = mq.motion_id
   WHERE m.titel IS NOT NULL
     AND m.titel != ''
     AND m.riksmote IN ('2022/23', '2023/24', '2024/25')
     AND mq.motion_id IS NULL;
   ```

   Or use MCP:
   ```bash
   # Verify using Supabase MCP
   mcp__supabase__execute_sql with above query
   ```

2. **AFTER storing results, immediately verify coverage**:
   ```bash
   node scripts/check_coverage.js
   ```

   Compare before/after counts to see how many NEW rows were added.

3. **Track each batch round** with:
   - Batch IDs submitted
   - Expected new analyses count
   - Actual new analyses count (after storage)
   - Cost

4. **Don't trust script output** that says "X stored":
   - UPSERT counts updates as "stored"
   - Use `SELECT COUNT(*)` and `analyzed_at` timestamps for truth

5. **Document each round** in PROJECT_STATE.md immediately

6. **Key insight about UPSERT**:
   - When script says "7,007 stored" but only 2,000 are new
   - This is normal! ~5,000 were updates of existing rows
   - Check `analyzed_at` timestamps to see what's truly new:
     ```sql
     SELECT DATE(analyzed_at), COUNT(*)
     FROM motion_kvalitet
     GROUP BY DATE(analyzed_at);
     ```

## Database Schema

### motion_kvalitet (Analysis Results)

```sql
CREATE TABLE motion_kvalitet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  motion_id TEXT UNIQUE NOT NULL,  -- FK to motioner.id
  ledamot_id TEXT,  -- FK to ledamoter.id (optional)
  har_konkreta_forslag INTEGER,  -- 0-10 score
  har_kostnader INTEGER,  -- 0-10 score
  har_specifika_mal INTEGER,  -- 0-10 score
  har_lagtext INTEGER,  -- 0-10 score
  har_implementation INTEGER,  -- 0-10 score
  substantiell_score INTEGER,  -- 0-100 overall score
  kategori TEXT,  -- e.g., "Substantiell", "Symbolisk"
  sammanfattning TEXT,  -- Short assessment
  analyzed_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX motion_kvalitet_motion_id_idx ON motion_kvalitet(motion_id);
```

### batch_jobs (Tracking)

```sql
CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id TEXT UNIQUE NOT NULL,  -- OpenAI batch_id
  type TEXT NOT NULL,  -- "motion_quality", "absence_detection", etc.
  status TEXT NOT NULL,  -- "submitted", "completed", "failed"
  motions_count INTEGER,
  estimated_cost_usd NUMERIC(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

## Cost Tracking

**GPT-5 Nano Batch API Pricing** (50% discount):
- Input: $0.0125 / 1M tokens
- Output: $0.10 / 1M tokens

**Estimated cost per motion**: ~$0.0001 USD

**Total cost for 8,706 motions**: ~$0.87 USD

## Troubleshooting

### Problem: "Motions already analyzed are being re-analyzed"

**Check**: SQL function is being called correctly
```sql
SELECT COUNT(*) FROM get_motions_without_analysis(100, ARRAY['2022/23']);
```

**Fix**: Function should filter `mq.motion_id IS NULL`

### Problem: "Coverage not increasing after storing results"

**Check**: UPSERT is working
```sql
SELECT COUNT(*), MAX(analyzed_at) FROM motion_kvalitet;
```

**Debug**: Check store-batch-results logs for errors

### Problem: "Script says 'X stored' but coverage shows less"

**Explanation**: UPSERT counts updates as "stored"

**Solution**: Check coverage script for truth:
```bash
node scripts/check_coverage.js
```

## Contact

If issues persist, check:
1. PROJECT_STATE.md for current status
2. Supabase logs for database errors
3. OpenAI batch status: https://platform.openai.com/batches
