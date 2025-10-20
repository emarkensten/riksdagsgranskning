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

## Architecture Overview

### Phase 1 (Week 1-2): Data Pipeline
- Fetch data from Riksdagen API
- Store in Supabase PostgreSQL
- Create backup in Supabase Storage

### Phase 2 (Week 3-4): LLM Analysis
- Batch process with OpenAI API
- Save analysis results to database

### Phase 3 (Week 5): Backend API
- Create REST endpoints
- Return pre-computed results

### Phase 4 (Week 6-7): Frontend
- Build UI with Next.js
- Create visualizations with Recharts

### Phase 5 (Week 8): Launch
- Testing and optimization
- Security review
- Soft launch to media

## Next Steps

After initial setup, follow the 8-week roadmap in `mvp-handlingsplan-riksdagsgranskning.md`
