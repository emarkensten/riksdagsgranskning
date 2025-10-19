# Riksdagsgranskning - Project Overview

## Project Summary

**Riksdagsgranskning** is a data journalism application that analyzes Swedish parliamentary records to uncover hidden patterns in politician behavior through AI-powered analysis combined with open public data.

### Key Insights the App Reveals

1. **Strategisk Frånvaro** (Strategic Absence Detection)
   - Identifies politicians who systematically avoid voting on specific topics
   - Example: "Politician X absent at 78% of HBTQ debates (baseline: 15%)"

2. **Retorik vs. Handling** (Rhetoric-Action Gap)
   - Compares what politicians say in debates/programs vs. how they actually vote
   - Example: "Party Y mentions climate 500+ times but votes against 8 of 10 climate proposals"

3. **Tomma Motioner** (Empty Proposals)
   - Identifies motions without concrete proposals, cost analysis, or implementation details
   - Scores each motion for substantiality (1-10 scale)

## Technical Architecture

### Tech Stack

```
Frontend/API:     Next.js 14 + TypeScript + Tailwind CSS
UI Components:    shadcn/ui + Radix Icons
Visualizations:   Recharts (charts, graphs, rankings)
Database:         Supabase (PostgreSQL)
File Storage:     Supabase Storage (raw data backups)
LLM Analysis:     OpenAI GPT-4o (Batch API)
Hosting:          Vercel (frontend/API) + Supabase (database)
```

### Data Sources

All data from public sources:
- **Riksdagen API** (`data.riksdagen.se`) - Voting records, members, motions, debates
- **SND** (Swedish National Data Service) - Political programs
- **Offentlighetsprincipen** (Public Access Principle) - Legal basis

### Architecture Philosophy: Batch-First

Instead of analyzing data in real-time during user requests:

1. **Batch Processing** (nightly/monthly)
   - Fetch all data from Riksdagen API
   - Send to OpenAI Batch API (24h processing, 50% discount)
   - Save results to database

2. **Fast API Serving** (user-facing)
   - API routes return pre-computed results
   - No LLM calls during requests
   - Response time: <100ms

3. **Cost Efficiency**
   - MVP setup: ~$30 one-time
   - Monthly operation: $12-57 depending on traffic
   - LLM costs: ~$1/month for monthly analysis updates

## Project Timeline & Phases

### Phase 1 - MVP (Week 1-8)

#### Week 1: Project Setup ✓
- [x] Next.js project created
- [x] Supabase configuration
- [x] Riksdagen API integration
- [x] Database schema designed
- [ ] **Next**: Run data sync and verify

#### Week 2: Data Collection
- [ ] Historical data (2+ years)
- [ ] Automated daily cron sync
- [ ] Admin dashboard
- [ ] Data validation

#### Week 3: Absence Analysis
- [ ] LLM batch processing for absence patterns
- [ ] Process and validate results
- [ ] Store in database

#### Week 4: Additional LLM Analysis
- [ ] Rhetoric vs. voting gap analysis
- [ ] Motion quality scoring
- [ ] All 3 analyses complete

#### Week 5: API Endpoints
- [ ] REST API routes for all data
- [ ] Caching layer
- [ ] Error handling

#### Week 6: Frontend - Basic
- [ ] Navigation and layout
- [ ] Member search and profiles
- [ ] Party comparison page

#### Week 7: Frontend - Visualizations
- [ ] Bar charts (rankings)
- [ ] Scatter plots (correlations)
- [ ] Comparison views
- [ ] Full interactive UI

#### Week 8: Launch
- [ ] Performance optimization
- [ ] Security review
- [ ] Media outreach
- [ ] Soft launch

### Phase 2-4: Expansion (Future)

**Months 2-4:** Historical data (10 years), lobbyist analysis, advanced ML
**Year 2+:** Multi-country expansion, premium features, API for third-party developers

## File Structure

```
riksdagsgranskning/
├── app/                           # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page (landing)
│   ├── api/
│   │   ├── ledamoter/           # Member endpoints
│   │   ├── partier/             # Party comparison endpoints
│   │   ├── rankings/            # Rankings endpoints
│   │   └── cron/                # Automated tasks
│   ├── medlem/                   # Member profile page
│   └── admin/                    # Admin dashboard
│
├── components/                   # Reusable React components
│   ├── charts/                  # Recharts components
│   ├── ui/                      # shadcn/ui components
│   └── layout/                  # Layout components
│
├── lib/                         # Utilities and helpers
│   ├── supabase.ts             # Supabase client
│   ├── riksdagen-api.ts        # Riksdagen API wrapper
│   ├── openai-batch.ts         # OpenAI Batch API client
│   ├── llm-prompts.ts          # LLM prompt generation
│   └── utils.ts                # General utilities
│
├── types/                       # TypeScript definitions
│   └── index.ts                # Main types
│
├── scripts/                    # One-off scripts
│   ├── init-db.sql            # Database schema
│   ├── sync-data.ts           # Data sync (Riksdagen API)
│   ├── generate-*-batch.ts    # LLM batch generation
│   ├── submit-*-batch.ts      # Batch submission
│   └── process-*-results.ts   # Result processing
│
├── public/                     # Static files
│
├── .env.example               # Environment template
├── .env.local                 # Your actual env vars (git-ignored)
├── package.json               # Dependencies
├── next.config.js            # Next.js config
├── tsconfig.json             # TypeScript config
├── tailwind.config.ts        # Tailwind config
│
└── DOCUMENTATION/
    ├── README.md              # Project overview
    ├── SETUP.md              # Setup instructions
    ├── DEVELOPMENT.md        # Development guide
    ├── API.md                # API documentation
    ├── WEEK1_NEXT_STEPS.md   # Week 1 completion guide
    ├── WEEK2_PLAN.md         # Week 2 detailed plan
    ├── WEEK3_PLAN.md         # Week 3 detailed plan
    └── PROJECT_OVERVIEW.md   # This file
```

## Database Schema

### Core Tables (from Riksdagen API)

- **ledamoter** (349 records)
  - Member IDs, names, parties, districts, photos

- **voteringar** (~50,000+ records)
  - Individual voting records with dates, titles, vote (yes/no/abstain/absent)

- **motioner** (~10,000 records)
  - Proposals/motions with full text

- **anforanden** (~20,000+ records)
  - Parliamentary statements/speeches

### Analysis Result Tables

- **franvaro_analys**
  - Absence patterns by category per member

- **retorik_analys**
  - Rhetoric vs. voting gap scores

- **motion_kvalitet**
  - Motion quality scores and categorization

### Admin Tables

- **sync_logs**
  - Data sync operation logs (error tracking, performance)

## Key Metrics & Success Criteria

### MVP Success (Week 8)

- [ ] 10,000+ unique visitors in launch week
- [ ] 5+ media articles using the data
- [ ] At least 1 news story directly from app findings
- [ ] All 3 analyses implemented and validated
- [ ] <100ms average API response time
- [ ] 99% data accuracy (manual spot checks)

### Sustainability Targets

- [ ] 20% returning visitors (Month 1)
- [ ] 3+ journalist repeat users per week
- [ ] Organic growth to 5,000+ monthly users
- [ ] Minimal operational costs ($12-20/month)

## Data Quality & Legal Foundation

### Data Sources Verification

- ✓ All data from public APIs (no scraping)
- ✓ Legal basis: Offentlighetsprincipen (Swedish public access principle)
- ✓ TF 1 kap. 1-10 §§ (legal basis)
- ✓ BrB 5:1 (justification principle)

### Quality Standards

- Target: >90% accuracy on LLM analysis (validated via manual spot checks)
- Data freshness: Daily sync from Riksdagen API
- Backup: Raw JSON stored in Supabase Storage
- Validation: Automated checks on each sync

## Deployment & Hosting

### Development

```bash
npm run dev    # Local dev server on port 3000
npm run build  # Production build
npm run start  # Production server
```

### Production

- **Frontend & API**: Deployed on Vercel (auto-deploys from main branch)
- **Database**: Supabase Cloud (PostgreSQL)
- **Domain**: `riksdagsgranskning.se` (or similar)

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=        # Public Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Public anon key
SUPABASE_SERVICE_ROLE_KEY=       # Secret key (for data sync)
OPENAI_API_KEY=                  # OpenAI API key
CRON_SECRET=                     # Vercel cron security token
ADMIN_SECRET=                    # Admin dashboard access token
```

## Running Scripts

### Data Collection

```bash
# Initial sync (Week 1)
npx ts-node scripts/sync-data.ts

# Generate LLM batch (Week 3)
npx ts-node scripts/generate-absence-batch.ts

# Submit batch to OpenAI
npx ts-node scripts/submit-absence-batch.ts

# Process results (after 24h)
npx ts-node scripts/process-absence-results.ts
```

### Monitoring

```bash
# Check data quality
npx ts-node scripts/validate-absence-analysis.ts

# Generate report
npx ts-node scripts/absence-analysis-report.ts
```

## Common Tasks

### Add a new politician analysis

1. Update prompts in `lib/llm-prompts.ts`
2. Generate new batch: `scripts/generate-*-batch.ts`
3. Submit to OpenAI: `scripts/submit-*-batch.ts`
4. Process results: `scripts/process-*-results.ts`

### Deploy changes

```bash
git add .
git commit -m "Description"
git push origin main
# Vercel auto-deploys
```

### Check database

Use Supabase dashboard → SQL Editor, or:

```bash
# Or run queries via API
curl https://supabase-project.supabase.co/rest/v1/ledamoter
```

## Support & Resources

- **Riksdagen API Docs**: https://data.riksdagen.se
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **OpenAI Batch API**: https://platform.openai.com/docs/guides/batch

## Team Roles (Post-MVP)

- **Product Manager**: Prioritize analyses, media outreach
- **Data Engineer**: Maintain data pipeline, optimize queries
- **LLM Engineer**: Prompt optimization, analysis quality
- **Frontend Developer**: UI/UX improvements, visualizations
- **DevOps**: Infrastructure, monitoring, scaling

## Known Limitations & Future Improvements

### MVP Limitations

- No real-time data (daily/weekly delays)
- Swedish politicians only
- Limited to Riksdagen (national parliament)
- No lobbyist data integration

### Planned Improvements

- **Phase 2**: Historical data (10 years), local parliament analysis
- **Phase 3**: Lobbyist/company connections, network analysis
- **Phase 4**: International expansion, premium features

## Contact & Legal

- **Privacy**: No personal data collection (only public parliamentary data)
- **License**: MIT (open source)
- **Legal**: Compliant with Swedish Public Access Principle

---

**Last Updated**: October 2025
**Status**: MVP Development (Week 1 complete)
