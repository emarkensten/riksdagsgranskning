# Analysis Guide - AI-Powered Parliamentary Scrutiny

Guide for running different analysis types on Swedish parliamentary data with cost estimates and testing procedures.

---

## 💰 Cost Estimates for OpenAI Batch API

All costs are **approximate** and based on GPT-4o pricing (2025-10-20):

### Pricing Model
- **Input**: $0.0025 per 1K tokens
- **Output**: $0.010 per 1K tokens
- **Batch Discount**: 50% reduction on standard pricing
- **Batch Operations**: Can run overnight for maximum cost efficiency

### Cost Examples

| Analysis Type | Records | Avg Tokens | Est. Input Cost | Est. Output Cost | Total | Time |
|--------------|---------|-----------|-----------------|------------------|-------|------|
| **Motion Quality (small)** | 100 | 2,500 | $0.63 | $2.50 | **$3.13** | 15 min |
| **Motion Quality (medium)** | 1,000 | 2,500 | $6.25 | $25.00 | **$31.25** | 2 hrs |
| **Motion Quality (full)** | 56,745 | 2,500 | $354.66 | $1,418.63 | **$1,773.29** | 6-8 hrs |
| **Absence Analysis (small)** | 100 members | 1,500 | $0.38 | $1.50 | **$1.88** | 10 min |
| **Voting Pattern (full)** | 349 members | 3,000 | $2.62 | $10.49 | **$13.11** | 30 min |
| **Rhetoric vs. Action** | 147,359 | 2,000 | $735.62 | $2,942.49 | **$3,678.11** | 8-12 hrs |

---

## 📊 Analysis Types Available

### 1. Motion Quality Analysis
**Purpose**: Evaluate substantive quality of legislative proposals

**What it measures**:
- Concrete proposals vs. vague statements
- Cost-benefit analysis included
- Specific measurable goals
- Legislative text quality
- Implementation plan detail

**Data used**:
- motioner table (56,745 records)
- Motion titles and full text

**Cost Estimates**:
- Small test (100): ~$3
- Medium (1,000): ~$31
- Full (56,745): ~$1,773

**Time to run**:
- Small: 15 minutes
- Medium: 2 hours
- Full: 6-8 hours

---

### 2. Absence & Voting Pattern Analysis
**Purpose**: Identify strategic absences and voting patterns

**What it measures**:
- Total attendance rate by member
- Absence patterns by topic/committee
- Voting consistency within party
- Party discipline violations
- Key vote absences

**Data used**:
- voteringar table (1,006,865 records)
- ledamöter table (2,086 members)

**Cost Estimates**:
- Member analysis (349): ~$2
- Full historical (2,086): ~$13

**Time to run**:
- Quick: 30 minutes
- Full: 1-2 hours

---

### 3. Rhetoric vs. Action Analysis
**Purpose**: Compare what politicians say vs. how they vote

**What it measures**:
- Speech topics and themes
- Vote alignment with stated positions
- Contradiction identification
- Hypocrisy scoring
- Theme consistency

**Data used**:
- anföranden table (147,359 records)
- voteringar table (1,006,865 records)
- Matching by date and topic

**Cost Estimates**:
- Member sample (50): ~$200
- Full (2,086): ~$3,678

**Time to run**:
- Sample: 2-3 hours
- Full: 8-12 hours

---

### 4. Strategic Absence Detection
**Purpose**: Find patterns of strategic vote avoidance

**What it measures**:
- Frånvarande votes on key issues
- Member-specific absence patterns
- Party-wide patterns
- Comparing to plausible illness rates
- Anomaly detection

**Data used**:
- voteringar table (1,006,865 records)
- anföranden table (147,359 records)

**Cost Estimates**:
- Quick analysis: ~$50
- Deep analysis: ~$500

**Time to run**:
- Quick: 1 hour
- Deep: 4-6 hours

---

## 🧪 Testing Procedure

### Phase 1: Proof of Concept (POC)
**Cost**: < $50 (RECOMMENDED FIRST STEP)
**Time**: 1-2 hours
**Goal**: Verify analysis quality before full run

```bash
# Test Motion Quality on 100 random motions
curl -X POST 'http://localhost:3002/api/admin/analysis/submit-batch' \
  -H 'Authorization: Bearer dev-secret-key-2025' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "motion_quality",
    "limit": 100,
    "confirm": "yes"
  }'
```

**Expected output**: 100 motion quality scores with reasoning

### Phase 2: Small Scale (100-1,000 records)
**Cost**: $3-50
**Time**: 1-4 hours
**Goal**: Validate results and tune parameters

### Phase 3: Medium Scale (5,000-10,000 records)
**Cost**: $50-200
**Time**: 2-6 hours
**Goal**: Real-world testing with representative sample

### Phase 4: Full Scale
**Cost**: $500-3,678
**Time**: 6-12 hours
**Goal**: Complete analysis for publication

---

## 🚀 Running Analyses

### Motion Quality Analysis

**Small Test (100 motions, ~$3)**

```bash
# First, check if you approve the cost
# Cost breakdown:
# - 100 motions × 2,500 tokens avg = 250K tokens
# - Input: 250K × $0.0025 = $0.63
# - Output: 250K × $0.010 = $2.50
# - Total: ~$3.13

curl -X POST 'http://localhost:3002/api/admin/analysis/submit-batch' \
  -H 'Authorization: Bearer dev-secret-key-2025' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "motion_quality",
    "limit": 100,
    "confirm": "yes"
  }'

# Monitor progress
# Results will be saved to motion_kvalitet table

# Check results
curl -X GET 'http://localhost:3002/api/admin/analysis/results?type=motion_quality&limit=100' \
  -H 'Authorization: Bearer dev-secret-key-2025'
```

**Medium Test (1,000 motions, ~$31)**

```bash
# Cost approval:
# - 1,000 motions × 2,500 tokens = 2.5M tokens
# - Input: 2.5M × $0.0025 = $6.25
# - Output: 2.5M × $0.010 = $25.00
# - Total: ~$31.25

# AWAITING YOUR APPROVAL - Reply "yes" to proceed
```

**Full Run (56,745 motions, ~$1,773)**

```bash
# Cost approval:
# - 56,745 motions × 2,500 tokens = 141.8M tokens
# - Input: 141.8M × $0.0025 = $354.66
# - Output: 141.8M × $0.010 = $1,418.63
# - Total: ~$1,773.29

# AWAITING YOUR APPROVAL - Reply "yes" to proceed
# This will run overnight via Batch API
```

---

### Absence Analysis

**Quick Analysis (349 current members, ~$2)**

```bash
# Cost: ~$2 (voting pattern analysis for current members)

curl -X POST 'http://localhost:3002/api/admin/analysis/absence-patterns' \
  -H 'Authorization: Bearer dev-secret-key-2025' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "absence_analysis",
    "members": 349,
    "confirm": "yes"
  }'
```

**Full Historical (2,086 members, ~$13)**

```bash
# Cost: ~$13 (historical analysis 1990+)

# AWAITING YOUR APPROVAL - Reply "yes" to proceed
```

---

### Rhetoric vs. Action Analysis

**Member Sample (50 members, ~$200)**

```bash
# Cost: ~$200 (50 members × speech + vote analysis)

# AWAITING YOUR APPROVAL - Reply "yes" to proceed
```

**Full Dataset (2,086 members, ~$3,678)**

```bash
# Cost: ~$3,678 (complete rhetoric vs. action analysis)
# Time: 8-12 hours (overnight batch job)

# AWAITING YOUR APPROVAL - Reply "yes" to proceed
# This will run via OpenAI Batch API overnight
```

---

## 📈 Results Storage

All analysis results are stored in these tables:

- `motion_kvalitet` - Motion quality scores
- `absence_patterns` - Voting absence analysis
- `rhetoric_analysis` - Speech vs. vote comparison
- `fraud_detection` - Anomaly and pattern analysis

---

## 💡 Recommended Approach

### Week 1: Testing
1. ✅ **Motion Quality POC** (100 records, ~$3)
   - Validate analysis quality
   - Adjust prompts if needed
   - Estimated cost: **$3-10**

2. ✅ **Absence Analysis Quick** (349 members, ~$2)
   - Quick wins for reporting
   - Estimated cost: **$2-5**

### Week 2: Small Scale
3. **Motion Quality Medium** (1,000 records, ~$31)
   - Prepare for full run
   - Estimated cost: **$30-50**

4. **Rhetoric Sample** (50 members, ~$200)
   - Test full pipeline
   - Estimated cost: **$150-250**

### Week 3: Full Publication
5. **Motion Quality Full** (56,745 records, ~$1,773)
   - Complete dataset
   - Estimated cost: **$1,500-2,000**

6. **Full Rhetoric Analysis** (2,086 members, ~$3,678)
   - Complete comparison
   - Estimated cost: **$3,000-4,000**

**Total estimated cost for full publication: $4,500-6,500**

---

## ⚠️ Important Notes

1. **Batch API saves 50%**: All overnight jobs automatically use Batch API for cost savings
2. **Token estimates**: Actual costs may vary ±20% based on content
3. **Storage**: All results stored in database (no additional cost after analysis)
4. **Reprocessing**: Once analyzed, results can be re-queried for free
5. **Incremental**: Can run incremental updates (new data only)

---

## 🔍 Approval Workflow

For any analysis, I will provide:

1. **Analysis type** and what it measures
2. **Records affected** (how many)
3. **Cost estimate** with breakdown
4. **Time estimate** (how long to run)
5. **Sample results** (if available from POC)

You then reply:
- **"yes"** - Proceed with analysis
- **"wait"** - Pause, I need to review
- **"no"** - Cancel this analysis
- **"modify"** - Adjust parameters (e.g., "100 records instead of 1000")

---

## 📞 Next Steps

Ready to begin? Which analysis interests you first?

1. **Motion Quality** - Understand proposal substantiveness
2. **Absence Patterns** - Find strategic absenteeism
3. **Rhetoric vs. Action** - Identify hypocrisy
4. **Strategic Absence** - Detect voting avoidance patterns

Or should we start with a POC test on a small dataset first?

