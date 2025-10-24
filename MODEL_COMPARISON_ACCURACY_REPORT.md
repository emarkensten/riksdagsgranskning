# LLM Model Comparison - ACCURACY ANALYSIS
**Test Date:** 2025-10-23
**Evaluator:** Claude Sonnet 4.5
**Methodology:** Ground truth comparison - evaluator analyzed same source data and compared model outputs against correct analysis

---

## 🔬 Methodology Change

**Previous approach (MODEL_COMPARISON_REPORT.md):**
- ❌ Evaluated *presentation quality* (formatting, verbosity, completeness)
- ❌ Did not verify if analysis was **actually correct**

**New approach (this report):**
- ✅ Sonnet 4.5 analyzed the same source data independently
- ✅ Compared each model's output against ground truth
- ✅ Scored based on **accuracy**, not just style

---

## 📊 ACCURACY SCORES

### Overall Accuracy (Average across 3 tests)

| Rank | Model | Motion | Absence | Rhetoric | **Average** | Cost/1000 |
|------|-------|--------|---------|----------|-------------|-----------|
| 🥇 | **GPT-5 Mini** | 9/10 | 10/10 | 10/10 | **9.7/10** | $1.45 |
| 🥈 | **Gemini 2.5 Flash** | 6/10 | 9/10 | 7/10 | **7.3/10** | $0.77 |
| 🥉 | **GPT-4.1** | 9/10 | 6/10 | 7/10 | **7.3/10** | $1.48 |
| 4 | **Grok 4 Fast** | 5/10 | 8/10 | 8/10 | **7.0/10** | $0.30 |
| 5 | **Claude 3.5 Haiku** | 7/10 | 7/10 | 6/10 | **6.7/10** | $2.67 |

---

## ⚠️ MAJOR FINDING: Quality ≠ Presentation

**Previous winner (by presentation):** GPT-5 Mini (9.0/10)
**Actual winner (by accuracy):** GPT-5 Mini (9.7/10) ✅ **Confirmed!**

**Previous runner-up:** Gemini 2.5 Flash (8.8/10)
**Actual runner-up:** Gemini/GPT-4.1 tied (7.3/10) ⚠️ **Dropped significantly**

**Previous "best value":** Grok 4 Fast (7.7/10)
**Actual accuracy:** Grok 4 Fast (7.0/10) ❌ **Lower than expected**

**Biggest drop:** Gemini (-1.5 points), Grok (-0.7 points)
**Biggest surprise:** GPT-4.1 improved (+0.2) despite concise output

---

## 🔍 DETAILED ACCURACY ANALYSIS

### Test 1: Motion Quality - "Säkrare lådcyklar"

**Source Data:**
```
Title: "Säkrare lådcyklar" (Safer cargo bikes)
Text: "Riksdagen ställer sig bakom det som anförs i motionen om att utreda regler
       för deformationszoner på lådcyklar och tillkännager detta för regeringen."
```

**Ground Truth (Sonnet 4.5 analysis):**
- Concrete proposals: 2/10 (only says "investigate rules" - no actual proposal)
- Cost analysis: 1/10 (zero mention of costs)
- Specific goals: 1/10 (no measurable targets)
- Legal text: 1/10 (no draft legislation)
- Implementation: 1/10 (just says "investigate")
- **Overall: 1.2/10**
- **Category: "empty"**

**Model Comparison:**

| Model | Their Overall | Deviation | Accuracy | Key Error |
|-------|---------------|-----------|----------|-----------|
| **GPT-4.1** | 1.4/10 | +0.2 | **9/10** ✅ | Almost perfect |
| **GPT-5 Mini** | 1.6/10 | +0.4 | **9/10** ✅ | Very close |
| **Claude Haiku** | 2.0/10 | +0.8 | **7/10** ⚠️ | Too generous on legal/impl |
| **Gemini** | 2.0/10 | +0.8 | **6/10** ⚠️ | Gave 4/10 concrete (too high) |
| **Grok** | 2.4/10 | +1.2 | **5/10** ❌ | Gave 3/10 legal_text (wrong!) |

**Winner:** GPT-4.1 - Nearly identical scoring to ground truth

**Key insight:**
- Grok gave 3/10 for "legal text" when motion contains ZERO legal text
- Gemini gave 4/10 for "concrete proposals" for a motion that only says "investigate"
- GPT-5 Mini and GPT-4.1 correctly identified extreme weakness

---

### Test 2: Absence Detection - Peter Ollén (M)

**Source Data:**
```
10 votes total:
✅ Present: Skatt, Klimat, Försvar, Migration, Energi, Pension, Kriminalvård, Infrastruktur (8 votes)
❌ Absent: Utbildning, Arbetsmarknad (2 votes)
Absence rate: 20% (vs 13% baseline)
```

**Ground Truth (Sonnet 4.5 analysis):**
- ✅ **Critical pattern:** Both absences are in **domestic/social policy** (education + labor)
- ✅ **Perfect attendance** in: foreign policy, economics, security
- ✅ **This is selective absence**, not random
- ⚠️ Red flag: "Systematic absence in domestic/social issues vs full attendance in other areas"

**Model Comparison:**

| Model | Identified Pattern? | Pattern Description | Accuracy |
|-------|-------------------|---------------------|----------|
| **GPT-5 Mini** | ✅ **YES** | "domestic/social policy", "selective non-participation", "not random but topic-specific" | **10/10** 🏆 |
| **Gemini** | ✅ Yes | "inrikespolitiska områden", "distincta, tunga politikområden" | **9/10** ✅ |
| **Grok** | ✅ Yes | "selective disengagement" | **8/10** ✅ |
| **Claude Haiku** | ⚠️ Partial | Just lists absences, no deeper pattern | **7/10** ⚠️ |
| **GPT-4.1** | ❌ **NO** | Grouped as "Övriga ämnen", missed the domestic/social link | **6/10** ❌ |

**Winner:** GPT-5 Mini - Perfect pattern recognition

**GPT-5 Mini's excellent analysis:**
```json
"overall_assessment": "Overall absence rate above baseline (20.0% vs 13%).
Absences are concentrated on domestic/social-policy topics (education and labour-market),
suggesting either targeted scheduling conflicts or selective non-participation rather than
broad disengagement."

"red_flags": [
  "Both absences are on domestic/social-policy topics — potential pattern of selective absence.",
  "No absences on security, migration or climate votes — indicates absences are not random."
]
```

This is **exactly correct**. GPT-5 Mini understood the political significance.

**GPT-4.1's failure:**
- Grouped 8 votes as "Övriga ämnen" (Other topics) without recognizing they're all non-social
- Missed the key insight that absence is **selective by topic type**

---

### Test 3: Rhetoric vs Voting - Anna Andersson (S)

**Source Data:**
```
Speeches:
  1. "Vi måste stärka välfärden och satsa mer på skola och vård" (2023-03-15)
  2. "Klimatfrågan är vår tids ödesfråga. Kraftfulla åtgärder nu" (2023-04-20)

Votes:
  1. Skolbudget: JA (2023-03-20)
  2. Klimatlag: JA (2023-04-25)
  3. Skattesänkning: NEJ (2023-05-10)
```

**Ground Truth (Sonnet 4.5 analysis):**
- ✅ **Perfect alignment** between rhetoric and voting
- ✅ All votes support the positions stated in speeches
- ⚠️ **BUT:** Dataset is tiny (2 speeches, 3 votes)
- ⚠️ **Critical limitations:**
  1. No healthcare vote to match healthcare rhetoric
  2. Tax vote is *indirectly* related to welfare (not explicit)
  3. Sample size too small for definitive conclusions
  4. Only 2-month timespan

**Gap score:** 0-5/100 (near-perfect alignment, but with caveats about data quality)

**Model Comparison:**

| Model | Gap Score | Identified Limitations? | Credibility Issues Quality | Accuracy |
|-------|-----------|------------------------|---------------------------|----------|
| **GPT-5 Mini** | 5/100 | ✅ **4 issues listed** | ✅ Excellent | **10/10** 🏆 |
| **Grok** | 0/100 | ⚠️ Partial (noted missing healthcare) | ⚠️ Incomplete | **8/10** ✅ |
| **Gemini** | 5/100 | ❌ NO | ❌ Empty | **7/10** ⚠️ |
| **GPT-4.1** | 0/100 | ❌ NO | ❌ Empty | **7/10** ⚠️ |
| **Claude Haiku** | 20/100 | ⚠️ Vague | ⚠️ Wrong issues | **6/10** ❌ |

**Winner:** GPT-5 Mini - Only model to identify all data quality issues

**GPT-5 Mini's exceptional credibility_issues:**
```json
"credibility_issues": [
  "Litet urval av röster: endast tre omröstningar gör slutsatser osäkrare.",
  "Ingen specifik votering för vård nämnd i talen (endast skolbudget är explicit).",
  "Tolkning av 'nej' på skattesänkning som stöd för välfärd är rimlig men kräver kontext.",
  "Tal kan innehålla mer nyanser eller prioriteringsordning som inte syns i tre röster."
]
```

This is **methodologically perfect**. GPT-5 Mini understands research limitations.

**Claude Haiku's errors:**
- Gap score: 20/100 - **too high** (should be near 0)
- Credibility issues: "Generella välmenande formuleringar" - this critiques the *rhetoric*, not the *analysis*
- Missed the real issues: small sample, missing data

**Gemini/GPT-4.1 failure:**
- Both had **empty credibility_issues**
- Failed to note sample size limitations
- Too confident in conclusions based on tiny dataset

---

## 📈 KEY INSIGHTS

### 1. **GPT-5 Mini is significantly better than we thought**

**Previous assessment:** "Best quality (9.0/10) but too slow/expensive"
**Actual finding:** "Best accuracy (9.7/10) - worth the cost for critical analysis"

**Why GPT-5 Mini excels:**
- ✅ Identifies subtle patterns (domestic/social policy absence)
- ✅ Recognizes methodological limitations (small sample sizes)
- ✅ Provides context and nuance
- ✅ Perfect Swedish
- ✅ Understands political significance

**When to use GPT-5 Mini:**
- High-stakes analyses where accuracy matters
- Pattern detection across complex datasets
- When you need thorough credibility assessments

---

### 2. **Grok 4 Fast is less accurate than presentation suggested**

**Previous assessment:** "Best value (7.7/10 presentation)"
**Actual finding:** "Moderate accuracy (7.0/10) with concerning errors"

**Grok's errors:**
- ❌ Gave 3/10 for "legal_text" when motion had ZERO legal text
- ❌ Gave 4/10 for "concrete_proposals" for a pure investigation request
- ⚠️ Brief analyses miss important context
- ⚠️ Sometimes outputs English instead of Swedish

**When Grok is still OK:**
- Bulk processing where perfect accuracy isn't critical
- Quick screening to identify obviously good/bad cases
- Budget-constrained projects

---

### 3. **Gemini 2.5 Flash: Good presentation, mediocre accuracy**

**Previous assessment:** "Excellent balance (8.8/10)"
**Actual finding:** "Decent accuracy (7.3/10) but misses critical details"

**Gemini's weaknesses:**
- ❌ Failed to identify data quality issues in rhetoric analysis
- ⚠️ Too generous with scoring (gave 4/10 concrete for empty motion)
- ⚠️ Good at describing but weak at critical evaluation
- ✅ But: Good pattern recognition in absence detection

---

### 4. **GPT-4.1: Inconsistent but sometimes excellent**

**Finding:** Tied for 2nd (7.3/10) despite concise outputs

**Strengths:**
- ✅ **Best scoring accuracy** for motion quality (1.4 vs ground truth 1.2)
- ✅ Doesn't waste tokens on fluff
- ✅ When it's right, it's very right

**Weaknesses:**
- ❌ **Worst pattern recognition** - completely missed absence pattern
- ❌ Failed to note data limitations
- ⚠️ Sometimes responds in English

---

### 5. **Claude 3.5 Haiku: Disappointing for the price**

**Finding:** Lowest accuracy (6.7/10) despite highest cost ($2.67/1000)

**Problems:**
- ❌ Worst rhetoric analysis (gap score 20 vs ground truth 0-5)
- ❌ Weak pattern recognition
- ❌ Too brief without being accurate
- ❌ **Terrible value:** 8.9× more expensive than Grok for only 0.3 points better accuracy

---

## 🎯 UPDATED RECOMMENDATIONS

### For Production Use (12,878 analyses)

### Option 1: **GPT-5 Mini for Critical Analyses** ⭐ NEW RECOMMENDATION

**Cost:** $18.67 (vs $3.86 Grok)
**Accuracy:** 9.7/10 (vs 7.0/10 Grok)
**Difference:** +2.7 accuracy points for +$14.81

**Why this changed:**
- Previous assessment undervalued accuracy
- Pattern recognition is CRITICAL for absence/rhetoric analysis
- Identifying data quality issues prevents false conclusions
- $18.67 is still tiny vs project budget (~$100k+ potential impact)

**When to use:**
1. **Absence detection** - need to identify selective patterns
2. **Rhetoric analysis** - need to assess data quality
3. **High-profile politicians** - accuracy matters for public reports
4. **Any analysis that will be published**

---

### Option 2: **Hybrid Approach** (BEST OVERALL)

**Strategy:**
1. Use **Grok 4 Fast** for initial screening (all 12,878 analyses)
   - Cost: $3.86
   - Identifies obviously good/bad cases
   - Fast processing

2. Use **GPT-5 Mini** for detailed analysis of flagged cases (~20% = 2,576 analyses)
   - Cost: $3.73
   - Pattern verification
   - Critical evaluation of edge cases

**Total cost:** $7.59
**Benefit:** Best of both worlds

---

### Option 3: **Grok Only** (Budget-Constrained)

**Cost:** $3.86
**Accuracy:** 7.0/10

**Only use if:**
- Budget is absolute constraint
- You can manually review sample outputs
- Acceptable to miss subtle patterns
- Not for publication-quality analysis

**Risk:**
- Will miss domestic/social policy patterns
- May over-score empty motions
- Less reliable for nuanced cases

---

## ⚠️ DO NOT USE

### ❌ Claude 3.5 Haiku
- **Worst value:** $2.67/1000 for 6.7/10 accuracy
- Grok is cheaper ($0.30/1000) AND more accurate (7.0/10)
- Only 0.3 points better than Grok for 8.9× the cost

### ❌ Gemini for Critical Analysis
- OK for screening (7.3/10)
- But fails to identify limitations
- Use GPT-5 Mini instead for important analyses

---

## 📊 ACCURACY vs COST MATRIX

```
High Accuracy (9-10)
│  GPT-5 Mini ($1.45) ⭐
│
│
Mid Accuracy (7-8)
│  Gemini ($0.77)    GPT-4.1 ($1.48)
│  Grok ($0.30) 💰
│  Claude H ($2.67) ❌ WORST VALUE
│
Low Accuracy (<7)
│  [None tested]
│
└────────────────────────────────────
    Low Cost        →        High Cost
```

**Sweet spots:**
- 🏆 **Best Quality:** GPT-5 Mini ($1.45, 9.7/10)
- 💰 **Best Value:** Grok ($0.30, 7.0/10)
- ⚖️ **Best Balance:** Hybrid (Grok + GPT-5 Mini selective)

---

## 🔬 METHODOLOGY VALIDATION

**This accuracy analysis revealed:**

1. ✅ **Verbose ≠ Accurate**
   - GPT-5 Mini is verbose AND accurate
   - Claude is concise but LESS accurate
   - Verbosity correlates with depth of analysis

2. ✅ **Pattern recognition separates good from great**
   - Identifying "domestic/social policy" pattern requires understanding
   - All models got the numbers right
   - Only GPT-5 Mini got the MEANING right

3. ✅ **Critical thinking is rare**
   - Only 1/5 models identified data quality issues
   - Most models stated conclusions without caveats
   - GPT-5 Mini alone showed methodological rigor

4. ✅ **Speed doesn't predict accuracy**
   - Grok (fastest) = 7.0/10
   - GPT-5 Mini (slowest) = 9.7/10
   - No correlation between latency and accuracy

---

## 📝 CONCLUSION

**Original conclusion:** "Use Grok for best value"

**Updated conclusion:**

### For Serious Analysis: **Use GPT-5 Mini**

**Reasoning:**
1. **Accuracy matters more than cost** for this project
   - False conclusions about politician behavior = reputation damage
   - Missing patterns = incomplete insights
   - $18.67 vs $3.86 is insignificant vs project value

2. **Pattern recognition is critical**
   - Absence analysis requires identifying selective behavior
   - Only GPT-5 Mini consistently found patterns

3. **Data quality assessment is essential**
   - Need to know when conclusions are uncertain
   - Only GPT-5 Mini identified limitations

4. **$18.67 for 12,878 analyses is incredibly cheap**
   - $0.00145 per analysis
   - Prevents false conclusions that could damage credibility
   - Worth 5× more than Grok for accuracy

### For Budget Projects: **Hybrid (Grok + GPT-5 Mini)**

- Grok screens all cases ($3.86)
- GPT-5 Mini analyzes flagged cases ($3.73)
- Total: $7.59 for best balance

---

## 🎓 LESSONS LEARNED

1. **Always verify with ground truth**
   - Presentation quality ≠ analytical accuracy
   - Need to analyze same data yourself to evaluate models

2. **Pattern recognition matters**
   - Numbers are easy
   - Understanding what numbers MEAN is hard
   - Only 1/5 models excelled at this

3. **Critical thinking is rare in LLMs**
   - Most models are confident even with tiny datasets
   - Identifying limitations requires higher-order reasoning

4. **Cost optimization can hurt quality**
   - Grok is cheap but misses subtle insights
   - For serious analysis, accuracy > cost

5. **Verbosity can indicate depth**
   - GPT-5 Mini's verbosity includes valuable context
   - Claude's brevity misses important nuance
   - Length ≠ quality, but correlation exists for explanatory text

---

**Final Recommendation:** Use **GPT-5 Mini** for production. The accuracy improvement (9.7 vs 7.0) is worth the cost difference ($18.67 vs $3.86) for a project of this importance.
