# Roadmap

## ✅ Completed

### Phase 1: Data Import (October 2024)
- Import motioner, ledamöter, voteringar from Riksdagen API
- Setup Supabase database
- Basic frontend (Next.js + React)

### Phase 2: Initial Analysis (January 2025)
- Absence Detection: 349 ledamöter ✅
- Rhetoric Analysis: 391 ledamöter ✅
- Motion Quality: 1,671 motions ✅

### Phase 3: Fix Duplicate Bug (2025-01-22)
- Created `get_motions_without_analysis()` SQL function
- Fixed submit-batch endpoint
- Verified 0 duplicates

## 🔄 In Progress

### Phase 4: Complete Motion Quality (Current)
**Goal**: 8,706/8,706 motions (100%)
**Status**: 9 batches running (8,035 motions)
**ETA**: 2025-01-23
**Cost**: $0.21

## 📋 Next Up

### Phase 5: Improve Quality (After 100%)
1. Sync fulltext for "empty" motions (~7,000 motions)
2. Re-analyze with fulltext
3. Expected: Fewer "empty", more "medium/high"

**Timeline**: 1-2 weeks
**Cost**: ~$0.70

### Phase 6: Stable Batch Pipeline (HIGH PRIORITY)
**Goal**: Universal, stable batch processing pipeline that works for all analysis types

**Problems to solve**:
- Too many ad-hoc scripts for different batches
- No centralized way to submit, check, and store batches
- Manual tracking of batch IDs in separate files
- Port numbers hardcoded in scripts
- No automatic retry or error handling

**Solution**: Create unified batch pipeline with:

1. **Single submission interface**:
   ```bash
   node scripts/batch_pipeline.js submit --type=motion_quality --limit=1000
   ```
   - Queries database for items needing analysis
   - Submits batch to OpenAI
   - Records batch_id in batch_jobs table
   - Returns estimated completion time

2. **Single retrieval interface**:
   ```bash
   node scripts/batch_pipeline.js retrieve --status=submitted
   ```
   - Checks all submitted batches from batch_jobs table
   - Downloads completed results from OpenAI
   - Stores in appropriate table (motion_kvalitet/franvaro_analys/retorik_analys)
   - Updates batch_jobs status to 'completed'

3. **Configuration via environment variables**:
   - `API_PORT` for dev server port (default: 3000)
   - `OPENAI_API_KEY` for OpenAI credentials
   - `ADMIN_SECRET` for API authentication
   - All hardcoded values removed

4. **Features**:
   - Automatic retry on transient errors
   - Progress reporting with ETA
   - Cost estimation before submission
   - Idempotent operations (safe to re-run)
   - Comprehensive logging
   - Type-agnostic (works for motion_quality, absence_detection, rhetoric_analysis, etc.)
   - **Cron-job ready**: Can run as scheduled task (e.g., monthly data sync)
   - **Vercel-compatible**: Works in serverless environment with API routes
   - **Self-contained**: No dependency on specific port numbers or local dev server

5. **Implementation Plan**:
   - Week 1: Core pipeline (submit + retrieve)
   - Week 2: Vercel API routes + cron job setup
   - Week 3: Testing & documentation

**Timeline**: 2-3 weeks
**Benefits**:
- No more forgotten batches at OpenAI
- Consistent workflow across all analysis types
- Easy to extend with new analysis types
- Reduces human error
- **Future-proof for production deployment**
- **Enables automated monthly data updates**

### Phase 7: New Analysis Types (February 2025)
1. Party Discipline Analysis
2. Motion Effectiveness (SQL only - free)
3. Riksdag Questions Topic Analysis

**Timeline**: 2-4 weeks
**Cost**: ~$2.00

### Phase 8: 2025/26 Data Import & Automation
**Goal**: Import complete 2025/26 riksmöte data and automate updates

1. **Data Import**:
   - Voteringar for 2025/26 (when available from Riksdagen API)
   - Anföranden for 2025/26
   - Already have: 3,781 motioner

2. **Analysis for 2025/26**:
   - Motion Quality (~3,781 motions, ~$0.10)
   - Absence Detection (when voteringar available)
   - Rhetoric Analysis (when anföranden available)

3. **Automation**:
   - Scheduled data sync (monthly)
   - Automated batch jobs for new data
   - Monitoring & alerts

**Timeline**: March-April 2025
**Cost**: ~$0.15

### Phase 9: Launch (April 2025)
- Deploy to Vercel
- Custom domain
- Public announcement

## 💰 Total Cost Estimate

**Year 1**: ~$4.50
**Recurring**: ~$0.20/year

## 🎯 Success Metrics

**Month 1**: 1,000+ visitors
**Month 3**: 5,000+ visitors
**Year 1**: Referenced in news article
