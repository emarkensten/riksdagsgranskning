# LLM Model Comparison for Riksdag Analysis
**Test Date:** 2025-10-23
**Evaluator:** Claude Sonnet 4.5
**Test Scope:** 5 models × 3 analysis types = 15 total tests

---

## Executive Summary

**Winner: Grok 4 Fast** 🏆
- **Best overall quality-to-cost ratio**: $0.30 per 1000 jobs
- **Fastest responses**: Average 2.5 seconds
- **High quality outputs**: Consistently good JSON formatting and analysis depth

**Runner-up: Gemini 2.5 Flash**
- **Excellent cost**: $0.77 per 1000 jobs
- **Very thorough analysis**: Most detailed outputs
- **Slower**: Average 13.7 seconds

**Current baseline (GPT-5 Nano)**: Not tested, but previous experience shows poor quality
- Cost: ~$0.01 per analysis (with batch API discount)
- Quality issues: Inconsistent JSON formatting, shallow analysis

---

## Models Tested

| Model | Provider | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Status |
|-------|----------|---------------------------|----------------------------|--------|
| **Claude 3.5 Haiku** | Anthropic | $1.00 | $5.00 | ✅ Tested |
| **GPT-5 Mini** | OpenAI | $0.125 | $1.00 | ✅ Tested |
| **GPT-4.1** | OpenAI | $1.00 | $4.00 | ✅ Tested |
| **Gemini 2.5 Flash** | Google | $0.15 | $1.25 | ✅ Tested |
| **Grok 4 Fast** | xAI | $0.20 | $0.50 | ✅ Tested |

---

## Analysis Types Tested

### 1. Motion Quality Analysis
**Prompt:** Evaluate parliamentary motion on substantiality, concrete proposals, cost analysis, legal text, implementation plans
**Sample:** Motion HA021027 - "Säkrare lådcyklar" (Safer cargo bikes)

### 2. Absence Detection Analysis
**Prompt:** Analyze voting absence patterns by topic, identify red flags, compare to 13% baseline
**Sample:** Peter Ollén (M) - 10 votes with 20% absence rate

### 3. Rhetoric vs Voting Gap Analysis
**Prompt:** Compare speech content with voting behavior, calculate gap score (0-100)
**Sample:** Anna Andersson (S) - 2 speeches, 3 votes

---

## Performance Results

### Cost per 1000 Jobs

| Model | Cost/1000 jobs | Relative to Grok |
|-------|----------------|------------------|
| **Grok 4 Fast** | **$0.30** | 1.0× (baseline) |
| **Gemini 2.5 Flash** | $0.77 | 2.6× |
| **GPT-5 Mini** | $1.45 | 4.8× |
| **GPT-4.1** | $1.48 | 4.9× |
| **Claude 3.5 Haiku** | $2.67 | 8.9× |

### Average Latency (Response Time)

| Model | Avg Latency | Speed Rating |
|-------|-------------|--------------|
| **Grok 4 Fast** | **2.5 seconds** | ⚡⚡⚡⚡⚡ Fastest |
| **GPT-4.1** | 4.6 seconds | ⚡⚡⚡⚡ Fast |
| **Claude 3.5 Haiku** | 5.9 seconds | ⚡⚡⚡ Good |
| **Gemini 2.5 Flash** | 13.7 seconds | ⚡⚡ Moderate |
| **GPT-5 Mini** | 21.0 seconds | ⚡ Slow |

### Token Usage

| Model | Avg Input Tokens | Avg Output Tokens | Total per Analysis |
|-------|------------------|-------------------|-------------------|
| Claude 3.5 Haiku | 378 | 459 | 837 |
| GPT-5 Mini | 343 | 1,410 | 1,753 |
| GPT-4.1 | 344 | 285 | 629 |
| Gemini 2.5 Flash | 364 | 569 | 933 |
| Grok 4 Fast | 496 | 410 | 906 |

**Insight:** GPT-5 Mini generates very verbose outputs (4.9× more tokens than GPT-4.1), explaining its slower speed despite lower per-token cost.

---

## Quality Analysis by Claude Sonnet 4.5

### Motion Quality Analysis

**Test Case:** Empty motion requesting investigation of cargo bike safety rules

#### Best Performers: 🥇 Gemini, 🥈 GPT-5 Mini

**Gemini 2.5 Flash** - **Grade: 9/10**
- ✅ Most thorough assessment
- ✅ Excellent contextual understanding ("tillkännagivande motion")
- ✅ Balanced scoring (concrete_proposals: 4/10 - fair recognition that it's not completely empty)
- ✅ Nuanced weaknesses identified
- ✅ Perfect JSON formatting
- ⚠️ Slightly verbose but adds value

**GPT-5 Mini** - **Grade: 8.5/10**
- ✅ Very detailed assessment in Swedish
- ✅ Excellent explanation of why scores are low
- ✅ Good recognition that investigation request has *some* merit (3/10 vs 1/10)
- ✅ Perfect JSON formatting
- ⚠️ Very verbose (1,153 output tokens)

**Claude 3.5 Haiku** - **Grade: 8/10**
- ✅ Concise and accurate
- ✅ Good JSON formatting
- ✅ Clear categorization (empty)
- ✅ Appropriate scores
- ⚠️ Less detailed than Gemini/GPT-5 Mini

**Grok 4 Fast** - **Grade: 7.5/10**
- ✅ Fast and accurate
- ✅ Good JSON formatting
- ✅ Reasonable scores (4/10 for concrete_proposals shows nuance)
- ⚠️ Assessment is brief
- ⚠️ Could be more specific

**GPT-4.1** - **Grade: 7/10**
- ✅ Accurate scoring
- ✅ Good JSON formatting
- ✅ Responds partially in English (consistency issue)
- ⚠️ Less detailed than other models
- ⚠️ Slightly lower scores (might be too harsh)

---

### Absence Detection Analysis

**Test Case:** Member with 20% absence (2/10 votes), concentrated in education & labor topics

#### Best Performers: 🥇 GPT-5 Mini, 🥈 Gemini

**GPT-5 Mini** - **Grade: 9.5/10**
- ✅ **Outstanding pattern recognition**: "concentrated on domestic/social policy"
- ✅ Excellent contextual notes for each category
- ✅ Identifies selective absence vs random absence
- ✅ Red flags are highly specific and actionable
- ✅ Perfect Swedish
- ✅ Most comprehensive analysis

**Gemini 2.5 Flash** - **Grade: 9/10**
- ✅ Excellent categorization in Swedish
- ✅ Clear pattern notes ("Full närvaro", "En tydlig frånvaro")
- ✅ Good red flags identifying concentration
- ✅ Professional assessment
- ⚠️ Slightly less insight than GPT-5 Mini

**Claude 3.5 Haiku** - **Grade: 8/10**
- ✅ Accurate data presentation
- ✅ Good red flags
- ✅ Clean JSON
- ⚠️ Less detailed pattern notes
- ⚠️ Assessment is brief

**Grok 4 Fast** - **Grade: 7.5/10**
- ✅ Accurate numbers
- ✅ Identifies "selective disengagement"
- ✅ Good red flags
- ⚠️ Minimal pattern notes
- ⚠️ Brief assessment

**GPT-4.1** - **Grade: 7/10**
- ✅ Good categorization
- ✅ Accurate numbers
- ✅ Swedish output
- ⚠️ Missed opportunity to note domestic/social policy pattern
- ⚠️ Less detailed than top performers

---

### Rhetoric vs Voting Gap Analysis

**Test Case:** Social Democrat politician - welfare/climate speeches + supportive votes

#### Best Performers: 🥇 All tied at high quality

**GPT-5 Mini** - **Grade: 9/10**
- ✅ **Most thorough analysis**: Detailed explanation of alignment
- ✅ Excellent credibility_issues section (notes small sample size, missing healthcare vote)
- ✅ Nuanced gap_score: 5/100 (not perfect due to limitations)
- ✅ Perfect Swedish
- ✅ Very thoughtful interpretation
- ⚠️ Very verbose (1,417 tokens)

**Claude 3.5 Haiku** - **Grade: 8.5/10**
- ✅ Good topic analysis
- ✅ Reasonable gap_score: 20/100
- ✅ Identifies limited detail on tax policy
- ✅ Swedish responses
- ✅ Balanced assessment
- ⚠️ Could be more detailed

**Gemini 2.5 Flash** - **Grade: 8.5/10**
- ✅ Clean analysis
- ✅ Good gap_score: 5/100
- ✅ Bilingual headers (Swedish topics, English assessment)
- ✅ No credibility issues found (fair)
- ⚠️ Less nuanced than GPT-5 Mini

**GPT-4.1** - **Grade: 8.5/10**
- ✅ Clean and accurate
- ✅ Perfect gap_score: 0/100 (high alignment)
- ✅ Swedish output
- ✅ Empty credibility_issues (correct)
- ⚠️ Less detailed analysis

**Grok 4 Fast** - **Grade: 8/10**
- ✅ Fast and accurate
- ✅ Gap_score: 0/100 (correct)
- ✅ Good topic breakdown
- ✅ Notes missing healthcare vote
- ⚠️ English output (not Swedish)
- ⚠️ Brief

---

## Overall Quality Scores

**Scoring:** Average across 3 analysis types (10-point scale)

| Model | Motion | Absence | Rhetoric | **Average** | Notes |
|-------|--------|---------|----------|-------------|-------|
| **GPT-5 Mini** | 8.5 | 9.5 | 9.0 | **9.0** | Most thorough, verbose |
| **Gemini 2.5 Flash** | 9.0 | 9.0 | 8.5 | **8.8** | Excellent balance |
| **Claude 3.5 Haiku** | 8.0 | 8.0 | 8.5 | **8.2** | Concise, accurate |
| **Grok 4 Fast** | 7.5 | 7.5 | 8.0 | **7.7** | Fast, good value |
| **GPT-4.1** | 7.0 | 7.0 | 8.5 | **7.5** | Solid, less detail |

---

## Key Findings

### 🎯 Strengths by Model

**GPT-5 Mini:**
- ✅ Highest quality analysis (9.0/10 average)
- ✅ Excellent pattern recognition
- ✅ Very detailed credibility assessments
- ✅ Perfect Swedish output
- ❌ **Very slow** (21 seconds average)
- ❌ **Very verbose** (1,410 output tokens average)

**Gemini 2.5 Flash:**
- ✅ Excellent quality (8.8/10 average)
- ✅ Best cost-to-quality ratio among high-quality models
- ✅ Thoughtful, contextual analysis
- ✅ Good JSON formatting
- ❌ Slower than Grok/Claude/GPT-4 (13.7 seconds)

**Claude 3.5 Haiku:**
- ✅ Good quality (8.2/10 average)
- ✅ Concise outputs (459 tokens average)
- ✅ Fast (5.9 seconds)
- ✅ Reliable JSON formatting
- ❌ **Most expensive** ($2.67 per 1000 jobs)

**Grok 4 Fast:**
- ✅ **Best value** ($0.30 per 1000 jobs)
- ✅ **Fastest** (2.5 seconds average)
- ✅ Good quality (7.7/10 average)
- ✅ Reliable JSON formatting
- ❌ Less detailed analysis
- ❌ Sometimes outputs English instead of Swedish

**GPT-4.1:**
- ✅ Fast (4.6 seconds)
- ✅ Concise (285 output tokens average)
- ✅ Good JSON formatting
- ❌ Lower quality (7.5/10 average)
- ❌ Sometimes responds in English
- ❌ Less detailed than competition

---

## Recommendations

### For Production Use (8,706 motions + 2,086 members × 2 analysis types)

**Scenario:** ~12,900 total analyses needed

### Option 1: **Grok 4 Fast** (Recommended for Budget)

**Total Cost:** $3.87
**Total Time:** ~9 hours (with rate limiting)
**Quality:** 7.7/10 - Good enough for most analysis

**Pros:**
- Lowest cost by far (8.9× cheaper than Claude)
- Fastest responses
- Reliable JSON formatting
- Acceptable quality for large-scale analysis

**Cons:**
- Less detailed than GPT-5 Mini/Gemini
- Occasionally outputs English
- May miss subtle patterns

### Option 2: **Gemini 2.5 Flash** (Recommended for Quality)

**Total Cost:** $9.93
**Total Time:** ~49 hours (very slow with rate limiting)
**Quality:** 8.8/10 - Excellent analysis depth

**Pros:**
- Excellent quality-to-cost ratio
- Very thorough analysis
- Good Swedish support
- Contextual understanding

**Cons:**
- Slower responses (13.7s average)
- 2.6× more expensive than Grok
- May hit rate limits faster

### Option 3: **GPT-5 Mini** (Best Quality, Not Recommended for Production)

**Total Cost:** $18.71
**Total Time:** ~75 hours (very slow)
**Quality:** 9.0/10 - Highest quality

**Pros:**
- Best quality analysis
- Excellent pattern recognition
- Most thorough assessments

**Cons:**
- **Too slow** (21 seconds average)
- **Too verbose** (wastes tokens)
- 4.8× more expensive than Grok
- Will definitely hit rate limits

### ❌ Not Recommended:

**Claude 3.5 Haiku:** $34.44 total cost (10× more expensive than Grok for only 0.5 points higher quality)
**GPT-4.1:** Lower quality than GPT-5 Mini for similar price

---

## Final Recommendation

### **🏆 Use Grok 4 Fast for Production**

**Reasoning:**
1. **Cost:** $3.87 for 12,900 analyses vs $9.93 (Gemini) or $34.44 (Claude)
2. **Speed:** 2.5 seconds vs 13.7 seconds (Gemini) or 21 seconds (GPT-5 Mini)
3. **Quality:** 7.7/10 is good enough for large-scale analysis
4. **Reliability:** Consistent JSON formatting, no major errors in testing

**Quality Mitigation:**
- For critical analyses or reports, manually review a sample
- Consider using Gemini 2.5 Flash for a subset of high-profile politicians
- The cost savings ($31 vs $10k budget) allow for human review time

---

## Cost Projection for Full Dataset

**Dataset:**
- Motion Quality: 8,706 motions
- Absence Detection: 2,086 members
- Rhetoric Analysis: 2,086 members
- **Total:** 12,878 analyses

| Model | Cost | Time (estimated) | Quality | Recommendation |
|-------|------|------------------|---------|----------------|
| **Grok 4 Fast** | **$3.86** | ~9 hours | 7.7/10 | ✅ **Use this** |
| Gemini 2.5 Flash | $9.92 | ~49 hours | 8.8/10 | ⚠️ Good alternative |
| GPT-5 Mini | $18.67 | ~75 hours | 9.0/10 | ❌ Too slow/expensive |
| GPT-4.1 | $19.06 | ~17 hours | 7.5/10 | ❌ Worse than GPT-5 Mini |
| Claude 3.5 Haiku | $34.38 | ~21 hours | 8.2/10 | ❌ Too expensive |

**Note:** GPT-5 Nano (current baseline) would cost ~$129 via normal API, or ~$0.13 with batch API (98% discount). However, quality was poor in previous testing.

---

## Sample Outputs Comparison

### Motion Analysis - Same Input

**Grok 4 Fast (7.5/10):**
```json
{
  "scores": { "concrete_proposals": 4, "cost_analysis": 1, "specific_goals": 2, "legal_text": 3, "implementation": 2 },
  "overall_substantiality_score": 2,
  "category": "empty",
  "assessment": "This motion is weak due to its extreme brevity and lack of detail. It proposes a single, vague idea for an investigation into regulations for deformation zones on cargo bikes but provides no elaboration, evidence, or specifics, rendering it insubstantial and more of a placeholder than a robust policy suggestion."
}
```

**Gemini 2.5 Flash (9/10):**
```json
{
  "scores": { "concrete_proposals": 4, "cost_analysis": 1, "specific_goals": 2, "legal_text": 1, "implementation": 2 },
  "overall_substantiality_score": 2.0,
  "category": "empty",
  "assessment": "This motion is a classic example of a 'tillkännagivande' motion, where the Riksdag requests the government to investigate a specific matter. Its strength lies in identifying an emerging public safety concern related to the increasing use of cargo bikes and pinpointing a specific technical area (deformation zones) for potential regulation. This demonstrates awareness of contemporary societal developments. However, its substantiality as a legislative proposal is extremely limited..."
}
```

**Key Difference:** Gemini provides deeper context ("tillkännagivande motion") and societal awareness, but Grok captures the essence in half the tokens.

---

## Conclusion

**Grok 4 Fast is the clear winner** for this use case:
- **10× cheaper** than Claude 3.5 Haiku
- **5× faster** than GPT-5 Mini
- **Acceptable quality** (7.7/10) for large-scale automated analysis
- **Reliable JSON formatting**

For critical analyses or final reports, consider:
- Using Gemini 2.5 Flash for higher quality at 2.6× cost
- Manual review of Grok outputs by human analysts
- Hybrid approach: Grok for bulk, Gemini for high-profile politicians

The $31 saved (vs Claude) can fund significant human analyst review time.
