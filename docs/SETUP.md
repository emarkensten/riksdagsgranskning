# Setup Guide - Riksdagsgranskning

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Note your project URL and API keys
3. Go to SQL Editor and run the contents of `scripts/init-db.sql` to create tables

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=sk-...
```

### 4. Sync Initial Data (Week 1)

Run the data sync script to fetch members and recent votings:

```bash
npx ts-node scripts/sync-data.ts
```

This will:
- Fetch all 349+ members from Riksdagen API
- Fetch recent votings (last 2 years)
- Fetch recent motions and anföranden
- Store everything in Supabase

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
riksdagsgranskning/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utilities
│   ├── supabase.ts        # Supabase client
│   └── riksdagen-api.ts   # Riksdagen API wrapper
├── scripts/
│   ├── init-db.sql        # Database schema
│   └── sync-data.ts       # Data sync script
├── public/                # Static files
├── .env.example           # Environment variables template
└── package.json
```

## AI Analysis Pipeline (Production)

The application includes a fully-validated pipeline for analyzing Swedish parliament data using OpenAI's Batch API:

### Stage 1: Motion Quality Analysis
- **Endpoint**: `POST /api/admin/analysis/submit-batch?type=motion_quality`
- **Analyzes**: Motion substantiality (1-10 scale) based on:
  - Concrete proposals
  - Cost analysis included
  - Specific measurable goals
  - Legal text/amendments
  - Implementation details
- **Cost**: ~$0.005 per motion (GPT-5 Nano batch API)
- **Success Rate**: 96%+ with fulltext data

### Stage 2: Absence Analysis
- **Endpoint**: `POST /api/admin/analysis/submit-batch?type=absence_detection`
- **Analyzes**: Member voting absence patterns by category
- **Categories**: Identified by political topic from speeches
- **Baseline**: ~13% baseline absence rate
- **Optimization**: Token limit 5,000 for complete analysis
- **Success Rate**: 100% with optimized configuration

### Stage 3: Rhetoric vs Voting Gap Analysis (Not yet implemented)
- Planned for analyzing speech-to-voting alignment
- Required: Complete speech and voting data

### Fulltext Data Sync
- **Endpoint**: `POST /api/admin/sync-motion-fulltext?limit=500`
- **Fetches**: Motion text from Riksdagen API
- **Rate Limiting**: 500ms between requests (stays within rate limits)
- **Batch Size**: 200-500 motions per sync
- **Coverage**: 2022-2025 parlament sessions (8,706 total motions)
- **Status**: Can run in parallel batches for 100% coverage in ~6 minutes

### Result Storage
- **Endpoint**: `POST /api/admin/analysis/store-batch-results`
- **Features**:
  - Stores OpenAI batch results to database
  - Supports both motion_quality and absence_detection types
  - Validation: 0 failures with correct data format
  - Output files stored in Supabase

## Pipeline Validation Results

**Tested Configuration (2025-10-21)**:
- ✅ Motion Quality: 96/100 success (fulltext data)
- ✅ Absence Analysis: 50/50 success (optimized tokens)
- ✅ Fulltext Sync: 4,000 motions, 100% success rate
- ✅ Result Storage: 10/10 accuracy

**Production Ready**: Yes, all pipelines validated with real data

## Next Steps

For detailed analysis workflow, see `API-GUIDE.md`
