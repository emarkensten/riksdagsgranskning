# POC Execution Plan - Nano 2022-2025

Live tracking of Proof of Concept testing with GPT-5 Nano for senaste mandatperioden.

---

## 📋 Vad vi testar

### Motion Quality Analysis POC
- **Data**: 100 random motions from 2022-2025
- **Model**: GPT-5 Nano
- **Cost Estimate**: $0.20 USD
- **Time Estimate**: 10 minutes processing
- **Goal**: Verify AI can analyze motion quality

### Absence Pattern Analysis
- **Data**: 349 current members, voting patterns 2022-2025
- **Model**: GPT-5 Nano
- **Cost Estimate**: $0.10 USD
- **Time Estimate**: 5 minutes processing
- **Goal**: Identify frånvaro patterns

### Rhetoric vs Action Sample
- **Data**: 10 sample members with speeches and votes
- **Model**: GPT-5 Nano
- **Cost Estimate**: $0.10 USD
- **Time Estimate**: 2-3 hours processing
- **Goal**: Test speech-to-vote matching

---

## 💰 Cost Tracking

### Estimate vs Actual

```
Analysis Type          | Estimated | Actual | Diff    | % Variance
─────────────────────────────────────────────────────────────────────
Motion Quality (100)   | $0.20     | $?     | ?       | ?%
Absence Analysis (349) | $0.10     | $?     | ?       | ?%
Rhetoric Sample (10)   | $0.10     | $?     | ?       | ?%
─────────────────────────────────────────────────────────────────────
TOTAL POC              | $0.40     | $?     | ?       | ?%
```

**Updating as we go...**

---

## 🎯 Phase 1: Motion Quality POC ($0.20 estimated)

### Test Details
```
Query: "Analyze motion quality 1-10: [motion text]"

What we're measuring:
- Concrete proposals present (yes/no)
- Cost-benefit analysis included (yes/no)
- Specific measurable goals (yes/no)
- Implementation plan detail (1-10 score)
- Overall quality score (1-10)

Cost breakdown:
- 100 motions × 2,500 tokens avg = 250K tokens
- Input: 250K tokens × $0.000025 = $0.006
- Output: 250K tokens × $0.0002 = $0.050
- Subtotal: $0.056
- Plus overhead: ~$0.20
```

### Success Criteria
- ✅ All 100 motions analyzed
- ✅ Quality scores vary (not all same value)
- ✅ Reasoning is substantive
- ✅ Actual cost within $0.05-0.40

### Expected Output Sample
```json
{
  "motion_id": "HC01AU1",
  "title": "Motion on climate action...",
  "quality_score": 7,
  "concrete_proposals": true,
  "cost_analysis": true,
  "measurable_goals": true,
  "implementation_score": 6,
  "reasoning": "Clear proposals with measurable targets, but implementation details could be more specific...",
  "category": "good_quality"
}
```

### Status
- ⏳ **PENDING** - Awaiting start

---

## 🎯 Phase 2: Absence Analysis ($0.10 estimated)

### Test Details
```
Analysis of 349 current members across 435k votes (2022-2025)

Metrics:
- Total votes cast per member
- Absence rate (%)
- Pattern analysis (which types of votes absent on?)
- Anomaly detection (who's absent more than expected?)

Cost breakdown:
- 349 members × 1,500 tokens avg = 523K tokens
- Input: 523K × $0.000025 = $0.013
- Output: 523K × $0.0002 = $0.105
- Subtotal: $0.118
- Estimated after overhead: $0.10-0.20
```

### Success Criteria
- ✅ All 349 members analyzed
- ✅ Absence rates realistic (3-15%)
- ✅ Anomalies identified
- ✅ Actual cost within $0.05-0.25

### Expected Output Sample
```json
{
  "member_id": "0638497389621",
  "member_name": "Julia Kronlid",
  "party": "SD",
  "total_votes": 435,
  "votes_cast": 410,
  "absent": 25,
  "absence_rate_pct": 5.7,
  "expected_rate": 3.0,
  "anomaly_score": 2.7,
  "pattern": "Higher absence on economic votes",
  "concern_level": "normal"
}
```

### Status
- ⏳ **PENDING** - Will run after Motion Quality

---

## 🎯 Phase 3: Rhetoric vs Action Sample ($0.10 estimated)

### Test Details
```
Comparing 10 sample members' speeches to their votes

Example:
- Member says: "We must strengthen environmental protection"
- But votes: NO on environmental bill
- AI flags: CONTRADICTION

Cost breakdown:
- 10 members × ~100 speeches × 2,000 tokens = ~2M tokens
- Input: 2M × $0.000025 = $0.050
- Output: 2M × $0.0002 = $0.400
- Subtotal: $0.450
- But we're optimizing prompts, so estimate $0.10-0.30
```

### Success Criteria
- ✅ Speech-vote matching works
- ✅ Contradictions are real (not false positives)
- ✅ Examples are specific and verifiable
- ✅ Actual cost within $0.05-0.50

### Expected Output Sample
```json
{
  "member_id": "member123",
  "member_name": "Example Member",
  "speeches_analyzed": 45,
  "votes_analyzed": 180,
  "contradictions_found": 3,
  "contradiction_rate": 6.7,
  "examples": [
    {
      "type": "direct_contradiction",
      "speech": "We must invest in green energy",
      "speech_date": "2023-05-15",
      "vote": "NO on renewable energy subsidy bill",
      "vote_date": "2023-06-20",
      "gap_days": 36,
      "severity": "high"
    }
  ]
}
```

### Status
- ⏳ **PENDING** - Will run after Absence Analysis (2-3 hours)

---

## 📊 Real-Time Cost Tracker

### Session Cost Log
```
Start Time: [TBD]
─────────────────────────────────────────────────
Phase        | Start    | End      | Cost  | Status
─────────────────────────────────────────────────
Motion POC   | [TBD]    | [TBD]    | $?    | [TBD]
Absence      | [TBD]    | [TBD]    | $?    | [TBD]
Rhetoric     | [TBD]    | [TBD]    | $?    | [TBD]
─────────────────────────────────────────────────
TOTAL        |          |          | $?    | [TBD]
```

**Update after each phase completes**

---

## 🎓 What We Learn From POC

### Motion Quality Results Will Tell Us:
1. **Can AI understand motion substance?**
   - Yes → Good foundation for full run
   - No → Need better prompts

2. **Are the quality scores meaningful?**
   - Varies 1-10? → AI is discriminating well
   - All 6-7? → Prompts need tuning

3. **Cost accuracy**
   - Within ±20% of estimate? → Confident for full run
   - Higher? → Need cheaper approach
   - Lower? → Can expand scope

### Absence Analysis Will Tell Us:
1. **Do we have good anomaly detection?**
   - Finding real patterns? → Keep same approach
   - Too many false positives? → Adjust thresholds

2. **Member data quality**
   - Realistic absence rates? → Data is clean
   - Unrealistic? → Need data validation

### Rhetoric vs Action Will Tell Us:
1. **Can we match speeches to votes?**
   - Finding contradictions? → Approach works
   - No matches? → Need better linking logic

2. **False positive rate**
   - Real contradictions? → Move to full scale
   - Mostly false positives? → Redesign matching

---

## 📋 Next Decision Tree

### After Motion Quality:
```
Results good (scores 1-10, varied) → ✅ Continue to Absence
Results unclear (all same score)   → ⚠️ Adjust prompts, retry ($0.05)
Cost way higher (>$1)              → ❌ Rethink approach
```

### After Absence:
```
Patterns found → ✅ Continue to Rhetoric
No patterns   → ⚠️ Check data quality
```

### After Rhetoric:
```
Contradictions found (3-5 per member) → ✅ Move to full scale
Too many contradictions (>20)         → ⚠️ Too many false positives
No contradictions                     → ⚠️ Matching not working
```

---

## 📊 Full Production After POC

### If POC is successful (< $0.50 total cost):

**Motion Quality Full (17,000 motions)**
- Cost: ~$11
- Time: 1-2 hours
- Expected results: Quality scores for all recent motions

**Absence Analysis Full (2,086 members)**
- Cost: ~$1
- Time: 30 minutes
- Expected results: Absence patterns for all members

**Strategic Absence Detection**
- Cost: ~$4
- Time: 1 hour
- Expected results: Anomalies and patterns

**SKIP Rhetoric Full for now**
- Rationale: See below

---

## ❓ About Rhetoric Full

### Why We're Skipping It (For Now)

**Rhetoric Full would cost $22** - too much complexity without knowing if approach works

### What Rhetoric Full Is For:

Rhetoric analysis shows **hypocrisy at scale** - when politicians systematically say one thing and vote another:

```
Example findings:
- Member A: "We must help working families"
  BUT votes NO on 80% of worker protection bills

- Member B: "Climate is priority"
  BUT votes NO on all environmental measures

- Party C: "Anti-immigration"
  BUT votes YES on importing foreign workers
```

### When to Run Rhetoric Full:

**After we see Motion Quality & Absence results work**

If POC shows:
✅ AI can understand motion quality
✅ AI can find absence patterns
→ Then we know the approach works
→ Rhetoric Full would cost $22 but give us the juiciest story

### Alternative: Rhetoric Smart (Cost-optimized)

Instead of full $22 rhetoric analysis on all 2,086 members:

```
Strategy 1: High-profile sample ($5)
- Analyze top 200 members (party leaders, ministers)
- Find biggest hypocrites for media impact
- Cost: $5, Time: 2 hours

Strategy 2: Party-level analysis ($8)
- One deep analysis per party (8 parties)
- Show party-wide patterns
- Cost: $8, Time: 3 hours

Strategy 3: Hybrid approach ($15)
- High-profile sample + party leaders
- Get both individual and party stories
- Cost: $15, Time: 4 hours
```

---

## 🚀 Recommended Path

### Today: POC ($0.40)
1. Motion Quality: 10 min
2. Absence Analysis: 10 min
3. Rhetoric Sample: 2-3 hours
**Total: ~3.5 hours, $0.40**

### Tomorrow: Quick Wins ($12)
1. Motion Quality Full (17k): $11
2. Absence Full (2k): $1
**Total: 2 hours, $12**
**Results: Ready for media**

### Later: Optional Deep Dive ($15-22)
1. Rhetoric Smart or Full: $8-22
2. Strategic Absence Detection: $4
**Total: 4-6 hours, $12-26**

---

## ✅ Checklist

- [ ] Start Motion Quality POC
- [ ] Monitor actual cost vs estimate
- [ ] Review results quality
- [ ] Run Absence Analysis
- [ ] Run Rhetoric Sample
- [ ] Evaluate whether to do Rhetoric Full
- [ ] Document findings
- [ ] Plan media strategy

---

**Status: READY TO START POC**

Awaiting your confirmation to begin testing.

