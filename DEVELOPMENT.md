# Development Guide

## Week 1: Project Setup & Data Pipeline Checklist

### Completed ✓
- [x] Next.js project created with TypeScript
- [x] Dependencies installed (@supabase, recharts, shadcn-ui, etc.)
- [x] Project structure established
- [x] Supabase client configured
- [x] Riksdagen API wrapper implemented
- [x] Database schema created (SQL)
- [x] Data sync script created
- [x] Environment setup guide created

### Next Steps (Week 1 continuation)
- [ ] Supabase project setup
  - [ ] Create Supabase project at supabase.com
  - [ ] Create .env.local with Supabase credentials
  - [ ] Run init-db.sql in Supabase SQL Editor

- [ ] Initial data sync
  - [ ] Run `npx ts-node scripts/sync-data.ts`
  - [ ] Verify data in Supabase dashboard
  - [ ] Check member count (~349)
  - [ ] Check voting count (should be >10,000)
  - [ ] Sample data quality check

- [ ] Backup setup
  - [ ] Configure Supabase Storage bucket
  - [ ] Set up automated backup of raw JSON

## Week 1 Verification

After data sync completes, verify:

```sql
-- Check members
SELECT COUNT(*) FROM ledamoter;
-- Expected: ~349

-- Check votings
SELECT COUNT(*) FROM voteringar;
-- Expected: >10,000 for 2 years of data

-- Check motions
SELECT COUNT(*) FROM motioner;
-- Expected: 3,000-5,000

-- Check anföranden
SELECT COUNT(*) FROM anforanden;
-- Expected: >5,000

-- Sample query - member with most absences
SELECT
  l.namn,
  l.parti,
  COUNT(*) as total_votes,
  SUM(CASE WHEN v.rost = 'Frånvarande' THEN 1 ELSE 0 END) as absences
FROM ledamoter l
LEFT JOIN voteringar v ON l.id = v.ledamot_id
GROUP BY l.id, l.namn, l.parti
ORDER BY absences DESC
LIMIT 10;
```

## Week 1 Troubleshooting

### npm install fails
```bash
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection fails
- Check .env.local has correct NEXT_PUBLIC_SUPABASE_URL
- Verify SUPABASE_SERVICE_ROLE_KEY (needed for data sync)
- Test connection: `npx supabase status`

### Riksdagen API timeout
- Add retry logic if needed
- Check rate limiting (currently no documented limits)
- Use caching to avoid repeated requests

### Data quality issues
- Some motions may have empty fulltext (API returns null)
- Some ledamöter may have historical status (not active)
- Handle gracefully in data sync script

## Development Workflow

### Running locally
```bash
npm run dev
# Visit http://localhost:3000
```

### Building
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

### Data sync (manual)
```bash
# Needs environment variables
npx ts-node scripts/sync-data.ts

# Or set env vars inline
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node scripts/sync-data.ts
```

## Project Structure Details

### `/app`
Next.js App Router pages and API routes

### `/components`
React components (will be created in Week 6-7)

### `/lib`
Utilities:
- `supabase.ts` - Supabase client initialization
- `riksdagen-api.ts` - API wrapper for Riksdagen data
- `utils.ts` - Helper functions

### `/scripts`
One-off scripts:
- `init-db.sql` - Database schema setup
- `sync-data.ts` - Data synchronization

### `/types`
TypeScript type definitions

## Key Decisions

1. **Batch-first architecture**: All LLM analysis is batch-processed (not real-time)
   - Why: Cost savings (50% discount on GPT-4o)
   - Trade-off: 24h latency for new analysis

2. **Supabase over custom backend**:
   - Why: Fast setup, built-in auth, real-time capabilities
   - Cost: Free tier sufficient for MVP

3. **Next.js over separate frontend/backend**:
   - Why: Faster development, unified deployment, API routes
   - Trade-off: Monolithic (can split later)

4. **Riksdagen API as single source of truth**:
   - Why: Complete, public, no authentication needed
   - Challenge: No bulk endpoints, needs pagination

## Next Phases

### Week 2: Complete data collection
- Add more riksmötes (go back further in time)
- Implement automated daily sync via Vercel cron
- Add data validation and error handling

### Week 3: LLM Analysis
- Design prompts for absence categorization
- Test with sample data
- Implement OpenAI Batch API integration

### Week 4: More LLM Analysis
- Rhetoric vs. handling prompts
- Motion quality scoring

### Week 5: API Routes
- Implement all endpoints from API.md
- Add caching layer
- Add error handling

### Week 6: Frontend Pages
- Member list and search
- Individual member profiles
- Party comparison page

### Week 7: Visualizations
- Bar charts (Recharts)
- Scatter plots
- Comparison views

### Week 8: Launch
- Performance optimization
- Security review
- Media outreach

## Performance Considerations

### Database
- Indexed on `ledamot_id`, `datum`, `rost`
- JSONB index on analysis kategorier
- Query optimization for common patterns

### API Caching
- Member lists: 24h cache
- Analysis results: 30d cache
- Rankings: 7d cache

### Frontend
- Lazy load charts and lists
- Image optimization for member photos
- Code splitting by page

## Security

- No authentication needed for MVP (public data)
- Rate limiting via Vercel
- Input validation on API routes
- SQL injection protection via Supabase

## Monitoring

In production, monitor:
- API response times
- Database storage usage
- Supabase free tier limits
- Vercel function execution time
- Error rates

## Resources

- [Riksdagen API Docs](https://data.riksdagen.se)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [OpenAI Batch API](https://platform.openai.com/docs/guides/batch)
