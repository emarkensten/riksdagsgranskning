# Week 2: Complete Data Collection & Automation

**Status**: Ready to start after Week 1 data sync verification

## Objectives

By end of Week 2:
- ✓ All historical data synced (last 2 years minimum)
- ✓ Automated daily sync configured via Vercel cron
- ✓ Admin dashboard to monitor data sync status
- ✓ Data validation and error handling complete
- ✓ Full dataset ready for LLM analysis in Week 3

## Tasks

### 1. Expand Historical Data (2-3 hours)

**Current state:** Last 2-3 riksmötes (recent months)
**Target:** Last 2+ years of complete data

**Actions:**
- [ ] Modify `scripts/sync-data.ts` to accept date range parameter
- [ ] Add support for syncing 2024/24, 2023/24, 2022/23, etc.
- [ ] Test with subset before full historical sync
- [ ] Monitor data completeness for each year

**Expected new records:**
- Voteringar: +20,000-30,000
- Motioner: +3,000-5,000
- Anföranden: +10,000-20,000

**SQL check after:**
```sql
SELECT
  EXTRACT(YEAR FROM datum) as year,
  COUNT(*) as votes
FROM voteringar
GROUP BY EXTRACT(YEAR FROM datum)
ORDER BY year DESC;
```

### 2. Set up Vercel Cron Job (1-2 hours)

**Goal:** Automated daily sync at 02:00 CET

**Actions:**
- [ ] Create `/api/cron/sync-data.ts` API route
- [ ] Implement sync logic using serverless function
- [ ] Add `cronSchedule` to `vercel.json`
- [ ] Test manually before deploying
- [ ] Monitor first run after deployment

**Files to create:**

**`api/cron/sync-data.ts`:**
```typescript
import { NextRequest } from 'next/server'

export const config = {
  maxDuration: 300, // 5 minutes timeout
}

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET matches Vercel env var
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run sync logic here
    // (import from scripts/sync-data.ts refactored as function)
    return Response.json({ message: 'Sync completed' })
  } catch (error) {
    return Response.json(
      { error: 'Sync failed' },
      { status: 500 }
    )
  }
}
```

**`vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-data",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### 3. Build Admin Dashboard (2-3 hours)

**Goal:** Monitor data sync status and health

**Create `/app/admin/dashboard.tsx`:**
- [ ] Display last sync timestamp
- [ ] Show record counts per table
- [ ] Display growth trend (records per week)
- [ ] Show last errors (if any)
- [ ] Button to manually trigger sync
- [ ] Data quality warnings

**Protected with simple auth:**
- Query parameter: `?token=ADMIN_SECRET`
- Check against env var

**Metrics to display:**
```sql
SELECT
  (SELECT COUNT(*) FROM ledamoter) as ledamoter_count,
  (SELECT COUNT(*) FROM voteringar) as voteringar_count,
  (SELECT COUNT(*) FROM motioner) as motioner_count,
  (SELECT COUNT(*) FROM anforanden) as anforanden_count,
  (SELECT MAX(created_at) FROM voteringar) as last_voting_sync,
  (SELECT MAX(created_at) FROM motioner) as last_motion_sync;
```

### 4. Add Data Validation (1-2 hours)

**Validation rules:**
- [ ] Check for NULL values in critical fields
- [ ] Verify referential integrity (ledamot_id exists)
- [ ] Check for duplicate records
- [ ] Validate date ranges (no future dates)
- [ ] Check for empty text fields

**Create `lib/data-validation.ts`:**
```typescript
export interface ValidationResult {
  valid: boolean
  errors: Array<{ table: string; message: string; count?: number }>
  warnings: string[]
}

export async function validateData(): Promise<ValidationResult> {
  // Check each table
  // Return detailed results
}
```

**Add to dashboard:**
- Run validation on each sync
- Display any warnings/errors
- Prevent week 3 LLM analysis if validation fails

### 5. Error Handling & Retry Logic (1 hour)

**Current:** Script fails on first error
**Target:** Graceful degradation with retries

**Improvements:**
- [ ] Wrap API calls in try-catch
- [ ] Retry failed API requests (exponential backoff)
- [ ] Log errors to database (new `sync_logs` table)
- [ ] Continue with partial data on non-critical errors
- [ ] Send admin notification on critical failures

**Create `sync_logs` table:**
```sql
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  sync_run_id UUID,
  status VARCHAR(20), -- 'started', 'completed', 'failed'
  table_name VARCHAR(50),
  records_processed INTEGER,
  records_failed INTEGER,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### 6. Documentation & Testing (30 mins)

**Tasks:**
- [ ] Document how to run manual sync
- [ ] Create troubleshooting guide
- [ ] Write test queries for common issues
- [ ] Document API rate limits
- [ ] Add monitoring/alerting setup guide

## Testing Checklist

Before moving to Week 3:

- [ ] Run sync with all historical data - no errors
- [ ] Verify record counts are reasonable
- [ ] Check data validation passes
- [ ] Manual sync trigger works
- [ ] Admin dashboard loads correctly
- [ ] All queries complete in <1 second
- [ ] No duplicate records
- [ ] No NULL values in critical fields

## Success Criteria

✓ **Week 2 complete when:**
1. All data for last 2+ years is in database
2. Automated daily cron job configured
3. Admin dashboard deployed and working
4. All validation checks passing
5. No errors in recent sync logs
6. Ready to proceed with LLM analysis in Week 3

## Estimated Time

- Historical data sync: 3 hours (including troubleshooting)
- Vercel cron setup: 2 hours
- Admin dashboard: 3 hours
- Data validation: 2 hours
- Error handling: 1 hour
- Testing: 1 hour

**Total: ~12 hours** (can be compressed to 2-3 days of focused work)

## Dependencies

From Week 1:
- ✓ Database schema initialized
- ✓ Initial data synced
- ✓ Riksdagen API wrapper working
- ✓ .env.local configured

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Data sync takes too long | Use date range, sync incrementally |
| Vercel cron fails silently | Add monitoring, test manually first |
| Admin dashboard gets hacked | Use strong secret, limit to localhost in production |
| Data validation too strict | Start permissive, tighten rules gradually |
| Memory usage on full sync | Process in batches, pagination |

## Next Phase (Week 3)

After Week 2 completion:
- All data ready for LLM analysis
- Database contains: ~350 members, ~50k votings, ~10k motions, ~20k anföranden
- Can proceed with designing and testing LLM prompts
- OpenAI Batch API setup
- First analysis results in database by end of Week 3
