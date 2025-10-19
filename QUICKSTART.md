# Quick Start Guide

Get the Riksdagsgranskning app running in 5 minutes.

## Prerequisites

- Node.js 18+
- Git
- A code editor (VS Code, etc.)

## 1. Clone & Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/yourusername/riksdagsgranskning.git
cd riksdagsgranskning

# Install dependencies
npm install

# You should see: "added 555 packages"
```

## 2. Set Up Environment Variables (1 minute)

```bash
# Copy template to your local file
cp .env.example .env.local

# Now edit .env.local and add your credentials:
```

**You need:**
- Supabase URL and API keys (from existing tone-compass-insight project)
- OpenAI API key (from existing mistral-ocr project)
- These are already in `/Users/erikmarkensten/Documents/GitHub/`

**The .env.local file should have these 3 lines:**
```
NEXT_PUBLIC_SUPABASE_URL=https://kdwfiuzbnidukyywmflx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...
```

## 3. Set Up Database (Optional for Development)

If you want to work with data:

```bash
# Log into Supabase dashboard
# Go to SQL Editor
# Paste contents of scripts/init-db.sql
# Click Run
```

This creates all necessary tables.

## 4. Start Development Server (1 minute)

```bash
npm run dev
```

You should see:
```
> next dev

  ▲ Next.js 14.1.0
  - Local:        http://localhost:3000
```

Open http://localhost:3000 in your browser. You should see "Riksdagsgranskning" placeholder page.

## 5. Done! ✓

You now have:
- ✓ Running Next.js dev server
- ✓ Configured Supabase connection
- ✓ OpenAI API ready
- ✓ All dependencies installed

## What's Next?

### To fetch data from Riksdagen API:

```bash
npx ts-node scripts/sync-data.ts
```

This fetches politicians, votings, motions from Riksdagen and stores in Supabase.

**Note:** Requires `SUPABASE_SERVICE_ROLE_KEY` in .env.local

### To run linter:

```bash
npm run lint
```

### To build for production:

```bash
npm run build
npm start
```

## Project Structure at a Glance

```
app/              ← Next.js pages and API routes
├── page.tsx      ← Home page
└── api/          ← API endpoints

lib/              ← Utilities
├── supabase.ts   ← Database client
├── riksdagen-api.ts ← Data fetching
└── utils.ts      ← Helpers

scripts/          ← One-off scripts
├── sync-data.ts  ← Fetch from Riksdagen
└── init-db.sql   ← Database setup

types/            ← TypeScript definitions
public/           ← Static files (images, fonts)
```

## Common Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Check code style
npm run start     # Run production server

# Data scripts
npx ts-node scripts/sync-data.ts        # Sync from Riksdagen
```

## Useful Files to Read

1. **[README.md](README.md)** - Project overview
2. **[SETUP.md](SETUP.md)** - Detailed setup instructions
3. **[API.md](API.md)** - API documentation (for Week 5)
4. **[WEEK1_NEXT_STEPS.md](WEEK1_NEXT_STEPS.md)** - What to do next
5. **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Complete project details

## Troubleshooting

### "Cannot find module" error

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use

```bash
npm run dev -- -p 3001
# Or kill the process: lsof -ti:3000 | xargs kill -9
```

### Supabase connection fails

- Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL`
- Verify you're connected to internet
- Check Supabase dashboard for project status

### OpenAI API key invalid

- Verify key starts with `sk-proj-`
- Check it's not copy-pasted with extra spaces
- Make sure it has sufficient credits

## Need Help?

- Check [DEVELOPMENT.md](DEVELOPMENT.md) for detailed guides
- Read the 8-week plan: [mvp-handlingsplan-riksdagsgranskning.md](mvp-handlingsplan-riksdagsgranskning.md)
- Check error messages carefully (often have helpful hints)

## Next Milestones

- **Week 1**: ✓ Setup complete → Next: Run data sync
- **Week 2**: Expand historical data, setup cron jobs
- **Week 3**: LLM analysis for absence patterns
- **Week 4**: More LLM analyses (rhetoric, motions)
- **Week 5**: Build API endpoints
- **Week 6**: Frontend pages
- **Week 7**: Visualizations & charts
- **Week 8**: Launch! 🚀

---

**Questions?** Check the documentation or review the code comments for clarification.
