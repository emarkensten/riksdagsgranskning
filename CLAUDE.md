# Riksdagsgranskning Project Memory

## Starting a Session
**User says**: "Read PROJECT_STATE.md and check coverage"

**You do**:
1. Read `PROJECT_STATE.md` - see Quick Status section
2. Read `docs/BATCH_ANALYSIS_SYSTEM.md` if working on batch analysis
3. Report current status
4. Ask what to work on

## Bash Commands
- `npm run dev` - Start development server (usually port 3001)
- `node scripts/check_coverage.js` - Check motion analysis coverage
- `node scripts/check_batch_status_simple.js` - Check OpenAI batch status
- `node scripts/store_round3_batches.js` - Store Round 3 results (when ready)
- `node scripts/verify_before_submit.js` - Verify motions needing analysis

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

**Current Round**: Round 3 - PARTIALLY COMPLETE
- Submitted: 2025-10-22 14:48 CET
- Stored: 2025-10-22 16:23 CET
- Result: 6/7 batches (5,976 motions)
- Stuck: batch_68f8d6888f908190be58aefa878f5538 (992/1000)

**When user asks "hur går det nu? klart ännu?"**:
1. Run `node scripts/check_batch_status_simple.js`
2. If completed: Run `node scripts/store_round3_batches.js`
3. Verify with MCP:
   ```sql
   SELECT DATE(analyzed_at), COUNT(*)
   FROM motion_kvalitet
   GROUP BY DATE(analyzed_at);
   ```
4. Run `node scripts/check_coverage.js`
5. Update PROJECT_STATE.md

**IMPORTANT Lessons**:
- UPSERT counts both INSERT and UPDATE as "stored"
- Script saying "7,007 stored" ≠ 7,007 new rows
- ALWAYS verify with MCP `analyzed_at` timestamps
- Supabase JS client has 1000 row default limit

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
