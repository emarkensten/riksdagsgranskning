# Memory System

This project uses Claude Code's official memory system to ensure Claude remembers critical context across sessions.

## Memory Hierarchy

Following Claude Code's [official memory documentation](https://docs.anthropic.com/en/docs/claude-code/memory), we use:

### 1. `CLAUDE.md` (Project Memory) ✅
**Location**: `./CLAUDE.md` (project root)
**Purpose**: Team-shared instructions for the project
**Contains**:
- Common bash commands
- Database access guidelines (MCP vs JS client)
- Core tables and schemas
- Batch analysis workflow
- Code style preferences
- Critical file locations
- Workflow rules

**Shared with**: All team members via git

### 2. `PROJECT_STATE.md` (Current Status)
**Location**: `./PROJECT_STATE.md`
**Purpose**: Track current batch rounds, coverage, and session history
**Contains**:
- Quick Status section (first thing to read)
- Current batch round status
- Session history
- Next steps when batches complete

**Updates**: After each session

### 3. `docs/BATCH_ANALYSIS_SYSTEM.md` (Deep Dive)
**Location**: `./docs/BATCH_ANALYSIS_SYSTEM.md`
**Purpose**: Detailed documentation of batch analysis system
**Contains**:
- How the system works (submit, store, verify)
- What went wrong in previous rounds
- Best practices and troubleshooting
- Database schema
- Cost tracking

**Use**: When debugging or planning new features

## Why CLAUDE.md?

According to Claude Code's best practices:

✅ **Automatically loaded**: Claude reads CLAUDE.md at startup
✅ **Structured format**: Bullet points and markdown headings
✅ **Version controlled**: Shared with team via git
✅ **Quick updates**: Use `#` key to add memories on-the-fly

❌ **OLD approach** (`.claude_instructions`):
- Not official Claude Code format
- Not automatically loaded
- Had to manually read each session
- Now deprecated

## Usage

### Starting a session
```bash
# You say:
"Read PROJECT_STATE.md and check coverage"

# Claude automatically:
1. Loads CLAUDE.md (project memory)
2. Reads PROJECT_STATE.md (current status)
3. Reports status
```

### Adding new memories
```bash
# Quick add (press # key):
# Always use MCP for SQL verification

# Claude will prompt you to select CLAUDE.md
```

### Editing memories
```bash
# Open CLAUDE.md in editor:
/memory

# Or manually edit:
vim CLAUDE.md
```

## Memory Best Practices

From Claude Code docs:

1. **Be specific**: "Use MCP for SQL queries" > "Query database properly"
2. **Use structure**: Organize with markdown headings and bullet points
3. **Review periodically**: Update as project evolves
4. **Keep concise**: Focus on frequently needed info

## Migration from .claude_instructions

**OLD** (`.claude_instructions`):
- 100+ lines of ad-hoc instructions
- Not official format
- Manual loading required

**NEW** (`CLAUDE.md`):
- Official Claude Code format
- Auto-loaded at startup
- Structured with clear sections
- Version controlled

**Status**: `.claude_instructions` marked as deprecated, redirects to CLAUDE.md

## Files to Read Each Session

1. **CLAUDE.md** - Auto-loaded by Claude Code
2. **PROJECT_STATE.md** - Read when user says "Read PROJECT_STATE.md and check coverage"
3. **docs/BATCH_ANALYSIS_SYSTEM.md** - Read if working on batch system

This ensures Claude has full context without manual loading!
