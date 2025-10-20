# Week 3: LLM Analysis - Strategisk Frånvaro (Absence Pattern Detection)

**Status**: Ready to start after Week 2 data sync

## Objective

By end of Week 3:
- Complete absence pattern analysis for all 349 members
- Identify systematic absence patterns in specific debate categories
- Store results in `franvaro_analys` table
- Ready for Week 4 (rhetoric and motion quality analysis)

## Why Absence Analysis First?

Absence pattern analysis is the strongest hook for media coverage:
- Easy to understand ("politician never shows up for X debates")
- Impossible to defend ("it's just my calendar")
- Non-partisan (affects all parties)
- Clear numerical evidence

## Architecture

```
Week 3 Flow:
1. Fetch all voting data from database
2. Create batch requests with absence analysis prompts
3. Send to OpenAI Batch API
4. Process results (24h wait)
5. Store in franvaro_analys table
6. Validate quality (sample checking)
```

## Detailed Tasks

### 1. Prepare Voting Data (2-3 hours)

**Goal**: Extract voting records in format ready for LLM analysis

**Create `scripts/prepare-absence-analysis.ts`:**

```typescript
// Queries database for voting patterns
// Groups by member
// Categorizes votes by title keywords
// Outputs requests ready for OpenAI Batch API
```

**Data preparation:**
- [x] Get all members
- [x] Get all votings for each member
- [x] Group by category (based on voting title)
- [x] Calculate per-member absence rates
- [x] Identify baseline for each category

**Category mapping (from title analysis):**
- HBTQ-frågor: Motions with keywords: hbtq, könsneutral, samkönad, etc.
- Klimat: klimat, miljö, växthusgaser, förnybar, etc.
- Försvar: försvar, militär, nato, säkerhet, etc.
- Skatter: skatter, inkomstskatt, arbetsgivaravgift, etc.
- Arbete: arbete, sysselsättning, arbetslöshet, etc.
- Hälsa: sjukvård, tandvård, psykisk hälsa, etc.
- Utbildning: skola, universitet, studier, etc.
- Boendefrågor: bostäder, hyror, bostadsbrister, etc.

### 2. Design & Test Prompts (3-4 hours)

**Goal**: Create prompts that accurately identify voting patterns

**Actions:**
- [ ] Review `lib/llm-prompts.ts` absence prompt
- [ ] Test on 20-30 sample members
- [ ] Iterate based on quality
- [ ] Document prompt version

**Testing samples:**
- Pick members from different parties
- Pick members with high vs. low absence rates
- Check accuracy against manual review

**Quality criteria:**
- Categories identified correctly
- Absence percentages match actual data (±2%)
- Suspicious patterns flagged appropriately
- JSON format always valid

**Expected cost for 100-request test batch:**
- Input: 100 × 500 tokens = 50,000 tokens
- Output: 100 × 200 tokens = 20,000 tokens
- Cost: ~$0.20 (with 50% Batch API discount)

### 3. Create Batch Requests (1-2 hours)

**Goal**: Generate 350 batch requests (one per member)

**Create `scripts/generate-absence-batch.ts`:**

```typescript
import { supabaseAdmin } from '../lib/supabase'
import { createAbsenceAnalysisPrompt, createBatchRequest } from '../lib/llm-prompts'

export async function generateAbsenceBatch() {
  // Get all members
  const members = await supabaseAdmin.from('ledamoter').select('*')

  // For each member, create batch request with their voting data
  const requests = []

  for (const member of members) {
    const votings = await supabaseAdmin
      .from('voteringar')
      .select('titel, rost')
      .eq('ledamot_id', member.id)

    const prompt = createAbsenceAnalysisPrompt(
      member.namn,
      member.parti,
      votings
    )

    const request = createBatchRequest(
      `absence-${member.id}`,
      prompt
    )

    requests.push(request)
  }

  return requests
}
```

**Batch specifications:**
- Total requests: ~350 members
- Batch size: OpenAI accepts 10,000+ per batch
- Expected tokens: 350 × 700 (500 input + 200 output) = 245,000 total
- Estimated cost: ~$0.87 (input: $0.12, output: $0.49 with 50% discount)
- Processing time: ~24 hours

### 4. Submit & Monitor Batch (1-2 hours)

**Goal**: Submit batch to OpenAI and track progress

**Create `scripts/submit-absence-batch.ts`:**

```typescript
import { OpenAIBatchClient } from '../lib/openai-batch'
import { generateAbsenceBatch } from './generate-absence-batch'

export async function submitAbsenceBatch() {
  const client = new OpenAIBatchClient()
  const requests = await generateAbsenceBatch()

  // Cost preview
  const cost = calculateBatchCost(
    requests.length,
    500, // avg input tokens
    200  // avg output tokens
  )
  console.log(`Estimated cost: $${cost.totalCost.toFixed(2)}`)

  // Submit batch
  const results = await client.processBatch(
    requests,
    'absence-analysis-batch.jsonl'
  )

  return results
}
```

**Running:**
```bash
npx ts-node scripts/submit-absence-batch.ts
# Will output batch ID and polling updates
# Check status in OpenAI dashboard if needed
```

**Batch ID tracking:**
- Save in database or env var
- Can check status anytime: `getBatchStatus(batchId)`

### 5. Process Results (2-3 hours)

**Goal**: Convert LLM responses into database records

**Create `scripts/process-absence-results.ts`:**

```typescript
import { supabaseAdmin } from '../lib/supabase'
import { OpenAIBatchClient, parseJsonResponse } from '../lib/openai-batch'

export async function processAbsenceResults(batchId: string) {
  const client = new OpenAIBatchClient()
  const results = await client.getBatchResults(batchId)

  let successCount = 0
  let errorCount = 0

  for (const [customId, result] of results) {
    try {
      const memberId = customId.replace('absence-', '')

      // Parse LLM response
      const responseText = result.result.output.choices[0].message.content
      const analysis = parseJsonResponse(responseText)

      // Insert into database
      const { error } = await supabaseAdmin
        .from('franvaro_analys')
        .insert({
          ledamot_id: memberId,
          kategorier: analysis.kategorier,
          total_voteringar: /* calculate from data */,
          total_franvaro: /* calculate from data */,
          franvaro_procent: /* calculate from data */,
          analyzed_at: new Date(),
        })

      if (error) {
        console.error(`Error inserting member ${memberId}:`, error)
        errorCount++
      } else {
        successCount++
      }
    } catch (error) {
      console.error(`Error processing result ${customId}:`, error)
      errorCount++
    }
  }

  console.log(`✓ Results processed: ${successCount} successful, ${errorCount} failed`)
}
```

### 6. Validation & Quality Check (1-2 hours)

**Goal**: Verify analysis quality before proceeding

**Create `scripts/validate-absence-analysis.ts`:**

```typescript
export async function validateAbsenceAnalysis() {
  // Get random sample of 20 members
  const sample = await supabaseAdmin
    .from('franvaro_analys')
    .select('*')
    .limit(20)

  // For each, manually verify:
  // 1. Categories make sense
  // 2. Percentages are accurate
  // 3. Patterns are plausible
  // 4. JSON format valid

  // Run SQL validation
  const validation = await supabaseAdmin.rpc('validate_absence_data')
  // Returns any warnings/errors
}
```

**Manual spot-check questions:**
- Does "HBTQ-frågor" category include actual HBTQ votes?
- Are absence % accurate?
- Are red flags legitimate?
- Does data look complete?

### 7. Create Admin Report (1 hour)

**Goal**: Document analysis completion and results

**Create `scripts/absence-analysis-report.ts`:**

Generates report showing:
- Total members analyzed: 349
- Average absence rate: ?%
- Members with unusual patterns: ?
- By-party comparison
- Top red flags

## Timeline

| Task | Duration | Days |
|------|----------|------|
| Prepare voting data | 2-3h | Mon |
| Design & test prompts | 3-4h | Mon-Tue |
| Create batch requests | 1-2h | Tue |
| Submit batch | 1-2h | Tue |
| **WAIT for OpenAI** | **24h** | Tue-Wed |
| Process results | 2-3h | Wed-Thu |
| Validation & QA | 1-2h | Thu |
| Admin report | 1h | Thu |

**Total active work: ~15 hours (can compress to 2-3 focused days)**

## Success Criteria

✓ Week 3 complete when:

1. All 349 members have absence analysis in database
2. `franvaro_analys` table has entries for all members
3. Sample validation shows >90% accuracy
4. Analysis cost < $2.00 (should be ~$0.87)
5. Categories are meaningful and accurate
6. At least 3 "suspicious patterns" identified for media
7. Ready for Week 4 analysis

## Estimated Costs

| Component | Cost |
|-----------|------|
| Prompt testing batch (100 requests) | $0.20 |
| Full analysis batch (350 requests) | $0.87 |
| **Total Week 3 LLM** | **~$1.10** |

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Prompts return invalid JSON | Start conservative, test extensively, add validation |
| Batch fails after 24h | Create 2-3 separate batches instead of 1 large one |
| Categories don't match reality | Adjust prompts based on test results |
| Some members have insufficient data | Filter members with <50 votes |
| Batch costs exceed budget | Monitor OpenAI account balance |

## Files to Create/Modify

```
scripts/
├── prepare-absence-analysis.ts      (NEW)
├── generate-absence-batch.ts        (NEW)
├── submit-absence-batch.ts          (NEW)
├── process-absence-results.ts       (NEW)
└── validate-absence-analysis.ts     (NEW)

lib/
├── llm-prompts.ts                   (CREATED in prep)
├── openai-batch.ts                  (CREATED in prep)
└── supabase.ts                      (no changes)
```

## Next: Week 4

After Week 3 completion:
- Absence analysis results ready and validated
- Database contains absence patterns for all members
- Ready to implement rhetoric vs. voting analysis
- Ready to implement motion quality analysis
