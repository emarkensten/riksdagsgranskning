# Riksdagsgranskning - Documentation Index

**Quick navigation to all project documentation**

## Getting Started

**New to the project?** Start here:
1. [QUICKSTART.md](QUICKSTART.md) - Get running in 5 minutes
2. [README.md](README.md) - Project overview
3. [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Full project details

## Implementation Guides

**Following the 8-week MVP plan:**

- [WEEK1_NEXT_STEPS.md](WEEK1_NEXT_STEPS.md) - Complete Week 1 (data sync & database)
- [WEEK2_PLAN.md](WEEK2_PLAN.md) - Week 2 planning (data expansion & automation)
- [WEEK3_PLAN.md](WEEK3_PLAN.md) - Week 3 planning (LLM absence analysis)

*Weeks 4-8 plans coming after Week 3 completion*

## Developer Resources

- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guide, troubleshooting, best practices
- [SETUP.md](SETUP.md) - Detailed installation and environment setup
- [API.md](API.md) - API endpoint documentation (for Week 5)

## Project Status

- [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md) - Week 1 completion status and what's been built

## Original Planning Documents

- [mvp-handlingsplan-riksdagsgranskning.md](mvp-handlingsplan-riksdagsgranskning.md) - Original Swedish MVP plan

---

## Documentation by Topic

### For Project Managers
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Full architectural overview
- [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md) - What's been built and remaining work
- [README.md](README.md) - High-level project summary
- [mvp-handlingsplan-riksdagsgranskning.md](mvp-handlingsplan-riksdagsgranskning.md) - Original vision and timeline

### For Developers

**Getting Started:**
- [QUICKSTART.md](QUICKSTART.md) - 5-minute setup
- [SETUP.md](SETUP.md) - Detailed setup with troubleshooting

**Implementation:**
- [WEEK1_NEXT_STEPS.md](WEEK1_NEXT_STEPS.md) - What to do next
- [WEEK2_PLAN.md](WEEK2_PLAN.md) - Next phase tasks
- [WEEK3_PLAN.md](WEEK3_PLAN.md) - LLM analysis tasks

**Reference:**
- [DEVELOPMENT.md](DEVELOPMENT.md) - Commands, architecture, best practices
- [API.md](API.md) - API documentation (for building endpoints)
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - System architecture

### For Data Team
- [WEEK1_NEXT_STEPS.md](WEEK1_NEXT_STEPS.md) - Data sync instructions
- [WEEK2_PLAN.md](WEEK2_PLAN.md) - Data expansion and validation
- [DEVELOPMENT.md](DEVELOPMENT.md) - Data scripts and SQL queries

### For DevOps/Infrastructure
- [SETUP.md](SETUP.md) - Environment configuration
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Deployment and hosting info
- [DEVELOPMENT.md](DEVELOPMENT.md) - Monitoring and performance

### For Journalists/Media
- [README.md](README.md) - Project overview
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Data sources and legal foundation
- [API.md](API.md) - API for data integration

---

## File Organization

```
riksdagsgranskning/
├── INDEX.md                    ← You are here
├── QUICKSTART.md              ← Start here (5 min)
├── README.md                  ← Project overview
├── SETUP.md                   ← Detailed setup
├── DEVELOPMENT.md             ← Developer guide
├── PROJECT_OVERVIEW.md        ← Full architecture
├── API.md                     ← API documentation
├── COMPLETION_SUMMARY.md      ← Week 1 status
├── WEEK1_NEXT_STEPS.md       ← What's next
├── WEEK2_PLAN.md             ← Week 2 tasks
├── WEEK3_PLAN.md             ← Week 3 tasks
├── mvp-handlingsplan-riksdagsgranskning.md  ← Original plan
│
├── app/                       ← Next.js pages & API routes
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│
├── lib/                       ← Utilities & integrations
│   ├── supabase.ts
│   ├── riksdagen-api.ts
│   ├── openai-batch.ts
│   ├── llm-prompts.ts
│   └── utils.ts
│
├── types/                     ← TypeScript definitions
│   └── index.ts
│
├── scripts/                   ← One-off scripts
│   ├── init-db.sql
│   └── sync-data.ts
│
├── public/                    ← Static files
│
├── .env.local                 ← Your environment variables
├── package.json               ← Dependencies
├── tsconfig.json             ← TypeScript config
├── next.config.js            ← Next.js config
└── tailwind.config.ts        ← Tailwind config
```

---

## Quick Reference

### Start Dev Server
```bash
npm run dev          # http://localhost:3000
```

### Run Data Sync
```bash
npx ts-node scripts/sync-data.ts
```

### Check Code Quality
```bash
npm run lint
```

### Build for Production
```bash
npm run build
npm start
```

---

## Current Phase: Week 1 ✓

**What's Done:**
- ✓ Project setup and configuration
- ✓ All dependencies installed
- ✓ Supabase integration
- ✓ Riksdagen API wrapper
- ✓ OpenAI Batch API client
- ✓ Database schema designed
- ✓ Comprehensive documentation

**What's Next:**
1. Initialize database (scripts/init-db.sql)
2. Sync initial data (scripts/sync-data.ts)
3. Verify data quality
4. Proceed to Week 2

**Time to complete remaining Week 1: ~20-30 minutes**

---

## Reading Guide

**If you have 5 minutes:**
- [QUICKSTART.md](QUICKSTART.md)

**If you have 15 minutes:**
- [README.md](README.md) + [QUICKSTART.md](QUICKSTART.md)

**If you have 30 minutes:**
- [QUICKSTART.md](QUICKSTART.md) + [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)

**If you have 1 hour:**
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) + [DEVELOPMENT.md](DEVELOPMENT.md)

**If you have 2 hours (complete orientation):**
- [QUICKSTART.md](QUICKSTART.md)
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
- [DEVELOPMENT.md](DEVELOPMENT.md)
- [WEEK1_NEXT_STEPS.md](WEEK1_NEXT_STEPS.md)

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Total Documentation | 12 files |
| Code Files | ~20 files |
| Dependencies | 555 packages |
| Database Tables | 7 tables |
| API Endpoints Planned | 11+ endpoints |
| LLM Prompts | 3 types |
| Political Members | ~349 |
| Expected Voting Records | ~50,000+ |
| MVP Timeline | 8 weeks |
| Active Development Hours | ~96 hours |
| MVP LLM Cost | ~$1.10 |
| Estimated Total MVPCost | ~$30 |

---

## Contact & Support

### If You're Stuck

1. **Setup issues?**
   - Check [QUICKSTART.md](QUICKSTART.md)
   - Check [SETUP.md](SETUP.md)
   - Check [DEVELOPMENT.md](DEVELOPMENT.md) troubleshooting

2. **Don't know what to do next?**
   - Read [WEEK1_NEXT_STEPS.md](WEEK1_NEXT_STEPS.md)
   - Check git log for recent changes

3. **Architecture questions?**
   - Read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
   - Check [DEVELOPMENT.md](DEVELOPMENT.md)

4. **Code structure questions?**
   - Check file comments
   - Review [API.md](API.md) for endpoint structure
   - Look at type definitions in [types/index.ts](types/index.ts)

---

## Next Steps Checklist

- [ ] Read [QUICKSTART.md](QUICKSTART.md)
- [ ] Run `npm run dev` to verify setup works
- [ ] Follow [WEEK1_NEXT_STEPS.md](WEEK1_NEXT_STEPS.md)
- [ ] Read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for full context
- [ ] Review [DEVELOPMENT.md](DEVELOPMENT.md) for development practices

---

**Last Updated**: October 19, 2025
**Status**: ✓ Week 1 Infrastructure Complete
**Next Phase**: Week 1 Completion (data sync) → Week 2 (data expansion)
