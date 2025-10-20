# Riksdagsgranskning

En granskningsapp som avslöjar dolda mönster i svenska riksdagspolitikers beteende genom att kombinera öppna data med AI-analys.

## Syfte

Skapa rubrikgaranti genom faktabaserad granskning som avslöjar:

1. **Strategisk Frånvaro** - Politiker som systematiskt undviker vissa debatter
2. **Retorik vs. Handling** - Gapet mellan vad politiker säger och hur de röstar
3. **Tomma Motioner** - Motioner utan konkreta förslag eller lösningar

## Teknisk Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui + Recharts för visualisering
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **LLM**: OpenAI GPT-4o (Batch API)
- **Hosting**: Vercel (frontend) + Supabase (database)

## Getting Started

See [SETUP.md](SETUP.md) for detailed installation instructions.

Quick start:

```bash
npm install
cp .env.example .env.local
# Fill in your environment variables
npm run dev
```

## Project Status

**Data Pipeline Complete ✅** - 1.3M+ records imported

Database is now production-ready with:
- ✅ 1,006,865 voting records (2021-2025)
- ✅ 147,359 speeches (2010-2025)
- ✅ 56,745 motions (2010-2025)
- ✅ 60,830 written questions (2010-2025)
- ✅ 18,212 interpellations (2010-2025)
- ✅ 37,483 historical member data (1990+)

See [docs/](docs/) for full documentation.

## Architecture

### Data Pipeline
1. **Data Sync** (Daily at 02:00 CET)
   - Fetch from Riksdagen API
   - Store in Supabase PostgreSQL
   - Backup to Supabase Storage

2. **LLM Analysis** (Monthly batch)
   - Process with OpenAI Batch API
   - Save analysis results

3. **API & Frontend** (Real-time)
   - Serve pre-computed results
   - Fast responses (<100ms)

## Costs

- **MVP Setup**: ~$25-30 (one-time)
- **Monthly Operation**: $12-57 depending on traffic
- **Hosting**: Free tier sufficient for launch

## Data Sources

All data from public sources:
- Riksdagen API: `data.riksdagen.se`
- Political programs: SND (Swedish National Data Service)
- Open data: Offentlighetsprincipen (Public Access Principle)

## Legal Foundation

All analysis is based on publicly available data and follows:
- TF 1 kap. 1-10 §§ (Public Access Principle)
- BrB 5:1 (Justification principle)

## Contributing

This is part of a 8-week MVP sprint. See issues for current priorities.

## Timeline

- **Week 1-2**: Data collection and setup
- **Week 3-4**: LLM analysis implementation
- **Week 5**: Backend API
- **Week 6-7**: Frontend and visualizations
- **Week 8**: Testing and launch

## License

MIT
