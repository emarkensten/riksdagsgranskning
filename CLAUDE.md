# Riksdagsgranskning Project Memory

## Starting a Session
**User says**: "Read PROJECT_STATE.md and check coverage"

**You do**:
1. Read `PROJECT_STATE.md` - see Quick Status section
2. Read `docs/BATCH_ANALYSIS_SYSTEM.md` if working on batch analysis
3. Report current status
4. Ask what to work on

## Bash Commands
- `npm run dev` - Start development server (port varies: 3000-3002)
- `node scripts/check_coverage.js` - Check analysis coverage (all types)
- `node scripts/retrieve_all_submitted_batches.js` - ⭐ **RETRIEVE ALL batches** from database
- `node scripts/submit_large_batch.js` - Submit new batches
- See `scripts/INDEX.txt` for full script documentation

## Database Access - CRITICAL

**ALWAYS use Supabase MCP for SQL queries**, NOT Supabase JS client!

✅ **Correct**:
```
mcp__supabase__execute_sql with query:
"SELECT COUNT(*) FROM motion_kvalitet;"
```

❌ **Wrong** (causes errors):
- Supabase JS client (1000 row limit, unreliable)
- Node.js scripts with createClient() (for verification)
- Python scripts (unnecessary complexity)

**Why MCP**:
- No row limits (JS client maxes at 1000)
- Direct SQL access
- No auth/connection issues
- Returns exact data

## Core Tables
- `motioner` - Motions from Riksdagen (2022-2025)
- `motion_kvalitet` - Motion quality analysis results
- `ledamoter` - Parliament members
- `voteringar` - Voting records
- `anforanden` - Speeches
- `franvaro_analys` - Absence analysis
- `retorik_analys` - Rhetoric analysis
- `batch_jobs` - OpenAI batch tracking

## Batch Analysis Workflow

**⚠️ PROJECT PAUSED**: 2025-10-24 - Prompt design issue discovered

**Current Status**:
- Technical system: Working ✅
- Data quality: Good (HTML fulltext, 100% coverage for 2024/25) ✅
- Prompt design: Broken ❌ (94% scored as "empty" even with full text)

**Why paused:**
The current prompt measures "legal completeness" (cost analysis, legal text, implementation). Most Swedish motions are "tillkännagivanden" (investigation requests) - they ask government to study something, not provide complete legislative packages. This is NORMAL for Swedish parliament, but the prompt penalizes it.

**Before resuming:**
1. Define what we're actually trying to expose (symbolpolitik? contradictions? quality gaps?)
2. Design appropriate prompt for Swedish political context
3. Test on 20 sample motions manually
4. Only then submit new batches

**Current data** (3,215 motions, 2024/25):
- Technically correct (full text analyzed)
- Just measures wrong thing (legal completeness vs political substance)
- Can still be used as baseline or for finding rare detailed proposals

**CRITICAL LESSONS ($22 spent in 2 days)**:
- ALWAYS test prompts on 20+ samples BEFORE batch processing
- Domain knowledge > Technical fixes (Swedish motions ≠ US bills)
- Know your SPECIFIC goal before choosing metrics
- ONE clear goal > generic "quality" score
- Batch API is cheap but still adds up fast ($22 in 2 days)
- When in doubt, PAUSE and ask user to clarify goal

## Code Style
- Use TypeScript for API routes and components
- Use async/await, not promises with .then()
- Prefer MCP over JS client for database verification
- Always check PROJECT_STATE.md before starting work

## Critical Files
- `PROJECT_STATE.md` - Current status, batch IDs, session history
- `docs/BATCH_ANALYSIS_SYSTEM.md` - Detailed batch system docs
- `.claude_instructions` - Session instructions (legacy, being replaced by this file)
- `app/api/admin/analysis/submit-batch/route.ts` - Submit batches
- `app/api/admin/analysis/store-batch-results/route.ts` - Store results

## Workflow Rules
- DON'T trust script output without MCP verification
- DON'T use Supabase JS client for verification queries
- DON'T create new scripts without checking if one exists
- DO verify actual state with MCP before assuming
- DO update PROJECT_STATE.md when major changes happen
- DO check docs/BATCH_ANALYSIS_SYSTEM.md for troubleshooting

## Before Ending Session
User says: **"Save state and end session"**

You do:
1. Update PROJECT_STATE.md with latest status
2. Update docs/BATCH_ANALYSIS_SYSTEM.md if batch system changed
3. Confirm what was done
4. Say: "State saved. Next session: 'Read PROJECT_STATE.md and check coverage'"
