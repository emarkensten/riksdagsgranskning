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

### Phase 6: New Analysis Types (February 2025)
1. Party Discipline Analysis
2. Motion Effectiveness (SQL only - free)
3. Riksdag Questions Topic Analysis

**Timeline**: 2-4 weeks
**Cost**: ~$2.00

### Phase 7: 2025/26 Data Import & Automation
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

### Phase 8: Launch (April 2025)
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
