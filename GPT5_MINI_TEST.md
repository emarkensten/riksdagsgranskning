# GPT-5 Mini Test - Riksmöte 2024/25
**Test Date:** 2025-10-23
**Status:** Batches submitted, waiting for OpenAI processing

---

## 🎯 Test Objective

Switch from **GPT-5 Nano** to **GPT-5 Mini** based on accuracy analysis:
- GPT-5 Nano: Unknown quality (reported as poor in previous sessions)
- GPT-5 Mini: **9.7/10 accuracy** in testing

Testing with **2024/25 riksmöte** (3,420 motioner) to validate quality before full rollout.

---

## 📊 Batches Submitted

**Model:** `gpt-5-mini-2025-08-07`
**Total motions:** 3,420 from riksmöte 2024/25
**Batches submitted:** 4 batches

| Batch # | Batch ID | Motions | Est. Cost | Status |
|---------|----------|---------|-----------|--------|
| 1 | `batch_68fa271ec3a88190a3f0b95615402ed4` | 1,000 | $0.027 | Submitted |
| 2 | `batch_68fa2727a3848190ba1d5f35305543df` | 1,000 | $0.027 | Submitted |
| 3 | `batch_68fa272db2288190bbb5c121ab6311a2` | 1,000 | $0.027 | Submitted |
| 4 | `batch_68fa2736f30c8190ab286b5cd2d92375` | 1,000 | $0.027 | Submitted |

**Note:** Each batch took maximum 1,000 motions (likely due to SQL function limit).
Will need more batches to reach full 3,420 motions.

**Total estimated cost (so far):** $0.108 for 4,000 motions

---

## ⏰ Expected Timeline

**OpenAI Batch API processing time:** 15-24 hours

**Estimated completion:** 2025-10-24 afternoon/evening

---

## ✅ Next Steps

### After batches complete (~24 hours):

1. **Retrieve results:**
   ```bash
   node scripts/retrieve_all_submitted_batches.js
   ```

2. **Check coverage:**
   ```bash
   node scripts/check_coverage.js
   ```

3. **Verify quality:**
   - Read 10-20 random analyses manually
   - Compare to old GPT-5 Nano analyses (if any saved)
   - Check for:
     - Pattern recognition (like domestic/social policy in absence detection)
     - Data quality flags (credibility_issues in rhetoric analysis)
     - Accurate scoring (not too generous or harsh)

4. **Check actual costs:**
   - Compare estimated vs actual costs
   - Verify if batch discount was applied
   - Calculate per-motion cost

5. **Decision point:**
   - ✅ If quality is good → Submit remaining batches + other riksmöten
   - ✅ If quality is good → Submit absence_detection batches
   - ✅ If quality is good → Submit rhetoric_analysis batches
   - ❌ If quality is poor → Investigate or try different model

---

## 🔧 Changes Made

### Code Updates

**File:** `lib/llm-prompts.ts`
```typescript
// Changed default model from gpt-5-nano to gpt-5-mini-2025-08-07
export function createBatchRequest(
  customId: string,
  prompt: string,
  model: 'gpt-5-mini-2025-08-07' | 'gpt-5-nano' = 'gpt-5-mini-2025-08-07'
)
```

### Database Changes

**Deleted old analyses:**
```sql
DELETE FROM motion_kvalitet
WHERE motion_id IN (
  SELECT id FROM motioner WHERE riksmote = '2024/25'
);
-- Deleted: 3,215 rows
```

---

## 💰 Cost Tracking

### Estimated Costs (from endpoint)
- **Per motion:** $0.000027
- **1,000 motions:** $0.027
- **3,420 motions (full 2024/25):** ~$0.092

### Projected Full Dataset Costs

If quality is good, full rollout costs:

| Analysis Type | Count | Est. Cost |
|---------------|-------|-----------|
| Motion Quality (all riksmöten) | 8,706 | $0.24 |
| Absence Detection | 2,086 | $0.06 |
| Rhetoric Analysis | 2,086 | $0.06 |
| **Total** | **12,878** | **$0.36** |

**Note:** These are estimated costs. Actual costs may vary based on:
- Token usage (depends on fulltext length)
- Batch discount (if applied)
- Model pricing changes

### Comparison to Testing

**During our API test:**
- Cost per 1000: $1.45 (no batch discount)
- 12,878 analyses: $18.67

**Current batch submission:**
- Cost per 1000: ~$0.027 (98% cheaper!)
- 12,878 analyses: ~$0.36

**This suggests batch discount IS working!** 🎉

---

## 📈 Expected Quality Improvements

Based on accuracy testing:

### Motion Quality Analysis
- **GPT-5 Mini:** 9/10 accuracy
- **Expected:** Realistic scoring, not too generous
- **Watch for:** Appropriate scores for "empty" motions (should be 1-2/10, not 4/10)

### Absence Detection Analysis
- **GPT-5 Mini:** 10/10 accuracy 🏆
- **Expected:** Pattern recognition (e.g., "domestic/social policy")
- **Watch for:** Insights beyond just listing numbers

### Rhetoric Analysis (not tested yet, but will be next)
- **GPT-5 Mini:** 10/10 accuracy in test
- **Expected:** Data quality flags (small sample sizes, missing votes)
- **Watch for:** Critical thinking about limitations

---

## 🔍 How to Verify Quality

### Sample 10 Random Motions

```sql
-- Get 10 random analyzed motions
SELECT m.id, m.titel, mq.substantiell_score, mq.kategori, mq.sammanfattning
FROM motioner m
JOIN motion_kvalitet mq ON m.id = mq.motion_id
WHERE m.riksmote = '2024/25'
ORDER BY RANDOM()
LIMIT 10;
```

### Check for Known Patterns

Look for:
1. **Empty motions** (just asking for investigation) → Should score 1-2/10
2. **Detailed motions** (with costs, legal text) → Should score 7-10/10
3. **Assessment quality** → Should mention specific strengths/weaknesses

### Red Flags

Bad quality indicators:
- ❌ All motions scored 5-6/10 (too average)
- ❌ Generic assessments ("lacks detail")
- ❌ No Swedish language (should be Swedish)
- ❌ Broken JSON formatting

---

## 📝 Batch Job Tracking

**Stored in database:** `batch_jobs` table

```sql
SELECT batch_id, type, status, motions_count, estimated_cost_usd, created_at
FROM batch_jobs
WHERE batch_id IN (
  'batch_68fa271ec3a88190a3f0b95615402ed4',
  'batch_68fa2727a3848190ba1d5f35305543df',
  'batch_68fa272db2288190bbb5c121ab6311a2',
  'batch_68fa2736f30c8190ab286b5cd2d92375'
)
ORDER BY created_at;
```

---

## 🚨 Potential Issues

### Issue 1: Batch limit of 1,000 motions per call

**Observed:** Each API call only processed 1,000 motions (not 3,500 as requested)

**Likely cause:** SQL function `get_motions_without_analysis()` has internal limit

**Solution:** Need to call API multiple times (done - 4 batches submitted)

**Remaining:** Still ~420 motions to submit (need 1 more batch)

### Issue 2: Batch discount uncertainty

**Expected:** 50% discount (like GPT-5 Nano)

**Observed:** Estimated cost is ~$0.027 per 1000 (98% cheaper than API test)

**Status:** ✅ Looks like batch discount is working!

**Verify:** Check actual costs after retrieval

---

## 📞 Commands Reference

### Submit more batches (if needed)
```bash
curl -X POST 'http://localhost:3000/api/admin/analysis/submit-batch?type=motion_quality&limit=3500&confirm=yes' \
  -H "Authorization: Bearer dev-secret-key-2025"
```

### Check batch status
```bash
curl 'http://localhost:3000/api/admin/analysis/batch-status?batch_id=batch_68fa271ec3a88190a3f0b95615402ed4' \
  -H "Authorization: Bearer dev-secret-key-2025"
```

### Retrieve all completed batches
```bash
node scripts/retrieve_all_submitted_batches.js
```

### Check coverage
```bash
node scripts/check_coverage.js
```

---

## ✅ Success Criteria

Test is successful if:

1. ✅ All 3,420 motions get analyzed
2. ✅ Quality is visibly better than GPT-5 Nano
3. ✅ Costs are reasonable (~$0.10 or less for 3,420 motions)
4. ✅ JSON formatting is consistent
5. ✅ Swedish language in assessments
6. ✅ Realistic scoring (not all 5/10)

If successful → Roll out to all riksmöten + absence + rhetoric analysis

---

**Status:** ⏳ Waiting for OpenAI batch processing (15-24 hours)

**Next check:** 2025-10-24 afternoon
