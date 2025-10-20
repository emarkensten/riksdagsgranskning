# Proof of Concept Testing Plan

Detailed testing plan for verifying analysis quality before full production runs.

---

## Phase 1: Motion Quality Analysis POC

### What we're testing
Analyzing 100 random motions to verify:
1. AI can understand motion quality
2. Analysis results are meaningful
3. Cost estimates are accurate
4. Results storage works

### Test Scope
- **Records**: 100 motions (random sample)
- **Data source**: motioner table
- **Analysis type**: Motion quality scoring
- **Metrics analyzed**:
  - Concrete proposals present
  - Cost-benefit analysis included
  - Specific measurable goals
  - Legislative text quality
  - Implementation plan detail

### Cost Breakdown
```
Calculation:
- 100 motions
- Average 2,500 tokens per motion
- Total input: 250,000 tokens
- Input cost: 250,000 × $0.0025 = $0.63
- Output cost: 250,000 × $0.010 = $2.50
- Subtotal: $3.13
- Buffer (20%): +$0.63
- TOTAL: ~$3-4 USD

Batch Discount: 50% off (overnight)
Final: ~$1.50-2.00 USD with batch
```

### Expected Output Format
```json
{
  "motion_id": "HA01AU1",
  "title": "Motion title...",
  "quality_score": 7,
  "concrete_proposals": true,
  "cost_analysis": false,
  "measurable_goals": true,
  "implementation_plan": false,
  "reasoning": "This motion proposes specific actions but lacks detailed implementation plans...",
  "category": "moderate_quality",
  "recommendations": [...]
}
```

### Success Criteria
- ✅ All 100 motions analyzed without errors
- ✅ Quality scores range from 1-10 (not all same value)
- ✅ Reasoning is substantive (>100 chars per motion)
- ✅ Results stored in motion_kvalitet table
- ✅ Actual cost within 20% of estimate

### Timeline
- **Submission**: Immediate
- **Processing**: 15 minutes
- **Results available**: Within 1 hour

---

## Phase 2: Absence Analysis Quick

### What we're testing
Analyzing voting patterns for 349 current members to verify:
1. Absence detection works
2. Pattern identification is accurate
3. Member-level statistics are meaningful

### Test Scope
- **Records**: 349 current members
- **Data source**: voteringar table (1,006,865 votes)
- **Analysis**: Voting frequency and absence patterns
- **Metrics**:
  - Total votes cast
  - Votes per member
  - Absence rate
  - Committee-based patterns

### Cost Breakdown
```
Calculation:
- 349 members
- Average 1,500 tokens per member analysis
- Total: 523,500 tokens
- Input: 523,500 × $0.0025 = $1.31
- Output: 523,500 × $0.010 = $5.24
- Subtotal: $6.55
- Buffer: +$1.31
- TOTAL: ~$8 USD

With batch discount: ~$4 USD
```

### Expected Output
```json
{
  "member_id": "0638497389621",
  "member_name": "Julia Kronlid",
  "party": "SD",
  "total_votes": 1247,
  "voted_yes": 1100,
  "voted_no": 47,
  "absent": 100,
  "absence_rate_pct": 8.01,
  "expected_absence": 3.5,
  "anomaly_score": 4.5,
  "pattern": "Strategic absence on environmental votes"
}
```

### Success Criteria
- ✅ All 349 members analyzed
- ✅ Absence rates are realistic (0-20%)
- ✅ Anomaly scores identify outliers
- ✅ Pattern descriptions are specific

### Timeline
- **Processing**: 10 minutes
- **Results**: Within 30 minutes

---

## Phase 3: Rhetoric vs. Action Sample

### What we're testing
Comparing speeches to votes for 10 sample members to verify:
1. Topic matching works
2. Contradiction detection is accurate
3. Data linking is correct

### Test Scope
- **Records**: 10 members × speeches + votes
- **Data**: anföranden table + voteringar table
- **Analysis**: Speech-to-vote matching

### Cost Breakdown
```
Calculation:
- 10 members
- Average 50 speeches per member × 2,000 tokens = 100,000 tokens per member
- Total: 1,000,000 tokens
- Input: 1,000,000 × $0.0025 = $2.50
- Output: 1,000,000 × $0.010 = $10.00
- TOTAL: ~$12.50 USD

With batch: ~$6-7 USD
```

### Expected Output
```json
{
  "member_id": "member123",
  "speeches_analyzed": 45,
  "contradictions_found": 3,
  "contradiction_rate": 6.7,
  "examples": [
    {
      "speech": "We must protect the environment",
      "date": "2023-05-15",
      "vote": "No on environmental protection act",
      "date": "2023-06-20",
      "analysis": "Direct contradiction between stated position and vote"
    }
  ]
}
```

### Success Criteria
- ✅ Speech-vote matching works
- ✅ Contradictions are meaningful (not false positives)
- ✅ Examples are specific and verifiable
- ✅ Rates are realistic

### Timeline
- **Processing**: 2-3 hours
- **Results**: Available next day

---

## Testing Sequence

### Step 1: Run Motion Quality POC
```bash
# Estimated cost: $1.50-2 USD
# Estimated time: 15 minutes processing

# YOU SHOULD APPROVE FIRST
Cost approval needed: $2-4 USD for testing
Reply: "yes-motion-poc" to proceed
```

### Step 2: Verify Results
```bash
# Check motion_kvalitet table for 100 new records
# Review sample outputs
# Verify cost accuracy
```

### Step 3: Run Absence Analysis
```bash
# Estimated cost: $4-8 USD
# Estimated time: 10 minutes processing

# YOU SHOULD APPROVE FIRST
Cost approval needed: $4-8 USD for testing
Reply: "yes-absence-poc" to proceed
```

### Step 4: Verify Results
```bash
# Check absence_patterns table
# Review member statistics
# Identify top anomalies
```

### Step 5: Run Rhetoric Sample
```bash
# Estimated cost: $6-7 USD
# Estimated time: 2-3 hours processing

# YOU SHOULD APPROVE FIRST
Cost approval needed: $6-10 USD for testing
Reply: "yes-rhetoric-sample" to proceed
```

### Step 6: Review All Results
- Analyze output quality
- Identify adjustments needed
- Estimate full run parameters

---

## Total POC Cost

```
Motion Quality (100):     $2-4 USD
Absence Analysis (349):   $4-8 USD
Rhetoric Sample (10):     $6-10 USD
─────────────────────────
TOTAL POC:               $12-22 USD
```

**All testing fits comfortably in a $30 testing budget.**

---

## Next Steps After POC

### If results are good:
1. Proceed to medium scale (1,000 records for each)
2. Cost: $30-100 per analysis
3. Then full production runs ($500-4,000 each)

### If results need adjustment:
1. Modify prompts
2. Rerun specific tests
3. Cost: $5-20 per iteration

### Parallelization options:
1. Can run multiple analyses simultaneously
2. Reduces total cost through batch optimization
3. Example: Run all 4 analyses in parallel = ~$15-25 total

---

## Decision Points

**After Motion Quality POC:**
- ✅ Quality good? → Proceed to full motion analysis
- ❌ Quality poor? → Adjust prompts and retry ($3-5)

**After Absence Analysis:**
- ✅ Patterns clear? → Proceed to full member analysis
- ❌ Patterns unclear? → Tweak parameters ($5-10)

**After Rhetoric Sample:**
- ✅ Contradictions found? → Proceed to full rhetoric analysis
- ❌ No contradictions? → Adjust matching algorithm

---

## Recommended Approval Flow

For each test phase, I will provide:

1. **Test Name** (e.g., "Motion Quality POC")
2. **Cost**: $X (exact estimate)
3. **Duration**: Y minutes/hours
4. **Data**: Z records analyzed
5. **Expected results**: Sample output

You reply with one of:
- **"yes"** → Proceed now
- **"wait"** → I'll ask again later
- **"modify"** → Change parameters (specify how)

---

Ready to start Phase 1 testing?

**Motion Quality POC - Phase 1**
- Cost: $2-4 USD
- Time: 15 minutes
- Records: 100 motions

**Your call: "yes-motion-poc" to begin testing**

