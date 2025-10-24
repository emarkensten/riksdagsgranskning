# Project State

**Last Updated**: 2025-10-24 (Session 5 - Paused due to cost concerns)

---

## 📋 Quick Status (for next session)

**PROJECT PAUSED**: Critical prompt design issue discovered - need to rethink analysis approach before continuing.

**Current Coverage** (2025-10-24):
- **Motion Quality**: 3,215/8,706 (36.9%) - 2024/25 only
- **Absence Detection**: 480/2,086 (23.0%)
- **Rhetoric Analysis**: 406/2,086 (19.5%)

**Critical Issue**: Current prompt scores 94% of motions as "empty" (1-4/10) even with full text. Need to redesign what we're measuring.

---

## 🚨 BLOCKER: Prompt Design Problem

### What We Discovered

After fixing the technical issue (sending full text instead of 1500 chars), results are still poor:

**2024/25 Motions WITH Full Text (3,215 analyzed):**
- 94.3% "empty" (1-4/10)
- 5.7% "medium" (4-6/10)
- 0% "substantial" (7-10/10)
- Average: 1.8/10
- Max: 6/10

### Root Cause

The current prompt measures **juridical/technical quality**:
- Has concrete proposals?
- Has cost analysis?
- Has legal text?
- Has implementation plan?

**Problem**: Most Swedish riksdag motions are "tillkännagivanden" (notifications) - they ask the government to investigate something, not provide complete legislative packages. This is how the Swedish parliamentary system works.

### Example

**Motion HC023343** (5,741 chars):
- GPT received ALL text ✅
- Scored 1/10 ("empty") ❌
- Reason: "requests only a government evaluation...no concrete policy measures, no cost estimates, no defined targets, no proposed legal amendments"

**But this is a NORMAL Swedish motion!** It's not meant to be a complete legislative package.

### What Needs to Happen Next

**⚠️ STOP AND THINK BEFORE SPENDING MORE MONEY**

After burning $22 in 2 days, we MUST answer these questions FIRST:

1. **What are we actually trying to measure?**
   - Political impact potential?
   - PR/symbolism vs substance?
   - Contradiction with voting behavior?
   - Party quality differences?
   - **Pick ONE specific goal**

2. **What's the right metric for Swedish motions?**
   - Not "does it have legal text" (opposition rarely writes that)
   - Maybe "does it identify a real problem with clear solution?"
   - Or "is it genuine policy or just PR?"
   - **Design metric that matches Swedish parliamentary system**

3. **Is batch analysis even the right approach?**
   - Different motion types (budget, policy, investigation requests)
   - Different purposes (actual change vs political positioning)
   - Maybe need different prompts for different motion types?
   - **Consider: Manual review of samples first to understand patterns**

4. **MANDATORY: Test before batch processing**
   - Pick 20 diverse motions manually
   - Test prompt on them
   - Verify results make sense
   - Calculate if it's worth the cost
   - **ONLY THEN submit batches**

### Cost So Far

**TOTAL SPENT (last 2 days): ~$22.00**

Breakdown:
- **Round 1-3** (Sessions 1-4): ~$6.00 (37,428 analyses retrieved, mixed quality)
- **Fulltext sync attempts**: ~$15.00 (multiple failed attempts, wrong endpoints, truncation issues)
- **Round 4** (current): ~$0.63 (3,420 motions with full text, wrong prompt)
- **Failed/deleted analyses**: ~$0.37 (wrong riksmöten, no fulltext)

**What we got for $22:**
- 3,215 technically correct but conceptually wrong analyses (2024/25)
- Working technical infrastructure (batch system, fulltext sync, retrieval)
- Hard lesson: Test prompts before batch processing

**What we wasted:**
- ~$21.37 on analyses that don't measure what we actually want to know

---

## Technical Status

### What We Fixed This Session

✅ **Motion fulltext issue** - Changed from XML (760 chars) to HTML (6,000-80,000 chars)
✅ **Prompt truncation** - Now sends FULL text instead of 1500 char sample
✅ **Riksmöte filtering** - Removed analyses from wrong years (2025/26, 2023/24, 2022/23)
✅ **Database cleanup** - Deleted 1,456 incorrect analyses

### Current Data Quality

**Motioner table (2024/25):**
- Total: 3,420 motions
- With fulltext: 3,420 (100%) ✅
- Fulltext source: HTML from riksdagen.se
- Average length: 6,492 chars
- Max length: ~80,000 chars

**Motion_kvalitet table:**
- Total: 3,215 analyses
- All from: 2024/25 riksmöte
- All have: Fulltext in source
- All analyzed: 2025-10-24

### Files Changed

**Modified:**
- `lib/riksdagen-api.ts` - Changed `fetchMotionFulltext()` from XML to HTML
- `lib/llm-prompts.ts` - Removed 1500 char truncation (now sends full text)

**Created:**
- `scripts/retrieve_specific_batches.js` - Fast retrieval for specific batch IDs

**Test files (can be deleted):**
- `test_html_fulltext.js`
- `test_html2.js`
- `test_fulltext.js`

---

## Next Steps (When Resuming)

### Phase 1: Redesign Analysis Approach

**Before submitting any new batches:**

1. **Define the goal** - What specific political behavior are we trying to expose?
   - Symbolpolitik (PR motions)?
   - Contradiction (says X, votes Y)?
   - Quality differences between parties?
   - Something else?

2. **Design appropriate prompts** - Based on goal:
   - If measuring symbolism: Check for vague language, lack of problem definition
   - If measuring contradiction: Need to combine with voting records
   - If measuring party differences: Need comparative analysis

3. **Test on small sample** - Before batch processing:
   - Pick 20 motions manually
   - Run new prompt
   - Verify results make sense

### Phase 2: Complete 2024/25 Coverage (if prompt works)

**Remaining:** 205 motions
**Cost:** ~$0.02
**Command:**
```bash
curl -X POST 'http://localhost:3000/api/admin/analysis/submit-batch?type=motion_quality&limit=205&confirm=yes' \
  -H "Authorization: Bearer dev-secret-key-2025"
```

### Phase 3: Extend to Other Years (optional)

Only if the prompt proves useful:
- 2023/24: 2,902 motions (~$0.29)
- 2022/23: 2,384 motions (~$0.24)

---

## Cleanup Tasks

### Files to Delete

**Test files (no longer needed):**
```bash
rm test_html_fulltext.js
rm test_html2.js
rm test_fulltext.js
```

**Old round scripts (if not using):**
```bash
# Keep these for reference but document they're archived
mkdir -p scripts/archive
mv scripts/store_round2_batches.js scripts/archive/
mv scripts/store_round3_batches.js scripts/archive/
```

---

## Session History

### 2025-10-24 (Session 5) - Prompt Design Crisis 🚨
**Time**: 06:00-08:00 CET
**Issue**: Discovered current prompt doesn't measure what we want

**What happened:**
1. User noticed OpenAI credits didn't decrease → batches were done
2. Retrieved 3,420 completed analyses
3. Results still showed 94% "empty" even with full text
4. Investigated and found: GPT is correctly identifying that most Swedish motions are "tillkännagivanden" (investigation requests), not complete legislative packages
5. Realized we need to redesign what we're measuring before spending more money

**Technical fixes:**
- Fixed prompt to send full text (removed 1500 char truncation)
- Fixed riksmöte filtering (removed 2025/26, 2023/24, 2022/23 analyses)
- Verified HTML fulltext is working correctly

**Cost this session:** $0.63

**Decision:** Pause project to rethink analysis approach

### 2025-10-23 (Session 4.5) - HTML Fulltext Implementation
**Time**: 19:00-20:00 CET
**Done**:
- Discovered XML endpoint only returns `<lydelse>` summaries (~760 chars)
- Switched to HTML endpoint for complete motion text
- Synced fulltext for all 3,420 motions in 2024/25
- Submitted 4 new batches with corrected fulltext

**Issue:** Discovered 1500 char truncation in prompt - fixed but need to re-analyze

### 2025-10-22 (Session 4) - The Great Batch Retrieval 🎉
**Time**: 16:30-17:30 CET
**Done**:
- Retrieved 37,428 forgotten analyses from OpenAI
- Created universal `retrieve_all_submitted_batches.js`
- Coverage jumped to 53.6%

### 2025-10-22 (Sessions 1-3)
See previous entries in git history.

---

## Documentation

**Key Files:**
- `CLAUDE.md` - Project memory (auto-loaded)
- `PROJECT_STATE.md` - This file
- `ROADMAP.md` - Future plans
- `scripts/INDEX.txt` - Script documentation
- `docs/BATCH_ANALYSIS_SYSTEM.md` - Batch system details

**Key Scripts:**
- `scripts/retrieve_all_submitted_batches.js` - Retrieve all completed batches
- `scripts/check_coverage.js` - Check analysis coverage
- `scripts/submit_large_batch.js` - Submit new batches

---

## Database Status

**Size**: ~0.31 GB / 0.5 GB (62% used)
- Reduced from 0.35 GB after deleting incorrect analyses
- Safe margin for future work

---

## Questions to Answer Before Resuming

1. **What political behavior do we want to expose?**
   - Symbolpolitik?
   - Vote contradictions?
   - Party quality differences?

2. **What's the right metric for Swedish motions?**
   - Current: Legal/technical completeness (doesn't work)
   - Alternative: Problem clarity + solution specificity?
   - Alternative: PR detection (vague language, no substance)?

3. **Is batch analysis even the right approach?**
   - Maybe need human review of sample first?
   - Maybe need qualitative categories, not numerical scores?
   - Maybe need different analysis per motion type?

4. **What would make this project valuable?**
   - News stories about specific politicians?
   - Database for journalists to query?
   - Automated scandal detection?

---

## Instructions for User

### Resuming This Project

1. Read this file (PROJECT_STATE.md)
2. Read CLAUDE.md for context
3. Decide on analysis approach before submitting batches
4. Test new prompt on small sample first
5. Only then proceed with batch processing

### If Continuing Without Changes

The current analyses (3,215 motions, 2024/25) are **technically correct** - they just measure legal completeness rather than political substance. They could still be useful for:
- Comparing which motions are most complete
- Finding rare high-quality detailed proposals
- Baseline for comparison with other analysis types

But they won't be useful for exposing "tomma motioner" since most motions score low.
