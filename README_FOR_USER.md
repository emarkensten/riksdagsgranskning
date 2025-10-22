# Instructions for Working with Claude

## Starting a New Session

**Say exactly this**:
```
Read PROJECT_STATE.md and check coverage
```

Claude will:
1. Read PROJECT_STATE.md (current status)
2. Run `node scripts/check_coverage.js` (verify database)
3. Report what's happening now
4. Ask what to do next

## During Session

**Be explicit**. Don't say "continue" or "do the thing". Say:
- "Check if batches are done"
- "Store the completed batches"
- "Submit new batches for 5000 motions"

Claude will run the appropriate script and show you results.

## Ending a Session

**Say exactly this**:
```
Save state and end session
```

Claude will:
1. Update PROJECT_STATE.md with latest status
2. Confirm what was done
3. Tell you what to do next session

## Files You Care About

**PROJECT_STATE.md** - What's happening right now
**ROADMAP.md** - Long-term plan (phases, goals, timeline)
**scripts/INDEX.txt** - Which scripts exist and work

## Files Claude Uses

**.claude_instructions** - Instructions Claude reads first
**scripts/** - All working scripts
**docs/** - Old documentation (reference only)

## If Claude Makes Mistakes

Common issues:
1. **Creates new scripts** - Remind: "Check scripts/INDEX.txt first"
2. **Assumes state** - Ask: "What does check_coverage show?"
3. **Creates new docs** - Remind: "Update PROJECT_STATE.md instead"

## Current Status (2025-10-22)

**Active Work**: Motion Quality batch analysis (Round 2)
**Status**: 8 batches running (ETA 2025-10-23 evening)
**Scope**: 2022/23, 2023/24, 2024/25 only (2025/26 comes later)
**Next Action**: Wait for batches, then check and store
**Next Session Say**: "Read PROJECT_STATE.md and check coverage"
