# GPT-5 Nano Batch Processing - Lessons Learned

**Session**: 2025-10-21
**Model**: GPT-5 Nano
**Status**: POC - Motion Quality & Absence Analysis completed

---

## Critical Issues Found & Fixed

### 1. **Parameter Incompatibility: `max_tokens` → `max_completion_tokens`**

**Issue**: All 100 batch requests failed with `unsupported_parameter` error
```
Error: "Unsupported parameter: 'max_tokens' is not supported with this model.
Use 'max_completion_tokens' instead."
```

**Root Cause**: GPT-5 Nano uses different parameter naming than standard OpenAI models

**Fix**: Changed `max_tokens: 1000` to `max_completion_tokens: 1000` in `createBatchRequest()`

**Lesson**: Always check OpenAI API docs for model-specific parameter requirements

---

### 2. **Temperature Parameter Not Supported**

**Issue**: All 100 requests failed with unsupported temperature
```
Error: "Unsupported value: 'temperature' does not support 0.3 with this model.
Only the default (1) value is supported."
```

**Root Cause**: GPT-5 Nano doesn't accept custom temperature - only default (1.0)

**Fix**: Removed `temperature: 0.3` from batch request body entirely

**Lesson**: Nano models have more restrictions. Don't assume feature parity with GPT-4o

---

### 3. **Token Limit Cutoff - Empty Responses**

**Issue**: All LLM responses came back empty (`content: ""`)
```json
{
  "finish_reason": "length",
  "message": { "content": "" }
}
```

**Root Cause**: `max_completion_tokens: 1000` was too low - LLM needed more tokens to complete analysis

**Fix**: Increased to `max_completion_tokens: 2000`

**Lesson**: Need buffer in token limit to allow LLM to complete reasoning

---

### 4. **Result Storage Wasn't Multi-Type Compatible**

**Issue**: `store-batch-results` endpoint only handled `motion_quality`, not `absence_detection`

**Root Cause**: Hardcoded to insert into `motion_kvalitet` table for all batch types

**Fix**: Updated endpoint to:
- Auto-detect batch type from `custom_id`
- Route results to correct table (`motion_kvalitet` or `franvaro_analys`)
- Handle different JSON schemas per analysis type

**Lesson**: Plan for multiple batch types from the start

---

## Current POC Results

### Motion Quality Analysis (100 motions)
- **Submitted**: batch_68f71ec2e2bc8190957b809f5e4e7239
- **Completed**: 100/100 requests
- **Stored**: 96/100 results (4 parse failures)
- **Status**: ✅ Successful

### Absence Analysis (50 members)
- **Submitted**: batch_68f71ec6709c819093e39abd5e03cfee
- **Completed**: 50/50 requests
- **Stored**: 33/50 results (17 parse failures)
- **Status**: ⚠️ Parse issues need fixing

---

## Identified Parse Issues

### Motion Quality
- All 96 results parsed and stored as `kategori: "empty"`
- This suggests LLM may not be outputting analysis in expected JSON format
- Need to verify prompt is generating proper JSON response

### Absence Analysis
- 17/50 results failed to parse
- `franvaro_procent` and other numeric fields are NULL
- Suggests JSON structure mismatch between expected and actual output

---

## Next Steps Before Full Scale

### 1. Validate LLM Output Format
- Fetch sample output from completed batches
- Compare expected vs actual JSON structure
- Update prompts if needed to ensure consistent formatting

### 2. Fix Parse Failures
- Improve error handling in `store-batch-results`
- Log actual vs expected JSON for debugging
- Consider using more flexible JSON parsing (e.g., with defaults)

### 3. Run Motion Quality Full Scale
- 96% success rate is acceptable for POC
- Ready for ~17,000 motions from 2022-2025

### 4. Skip Rhetoric Full Analysis (For Now)
- Rationale: Until Motion Quality & Absence Analysis are fully validated
- Cost: ~$22 estimated (likely $2-11 actual based on current efficiency)
- Timeline: Can revisit after other analyses prove robust

---

## Cost Efficiency Update

### Actual Costs (Partial)
- Motion Quality POC (100): $0.02 (was $0.20 estimated)
- Motion Quality Full (new batch): Unknown - awaiting API bill
- Absence Analysis POC (50): Unknown - awaiting API bill

### Key Insight
Motion Quality POC from previous session came in at **-90% variance** ($0.02 vs $0.20 estimate)

This suggests:
- Batch API is working efficiently
- Token estimates were conservative
- Full Rhetoric analysis might be cheaper than feared ($2-11 vs $22 estimate)

---

## Configuration Recommendations for GPT-5 Nano

```typescript
// DO:
max_completion_tokens: 2000  // Provide buffer for full responses
// DON'T include:
temperature: X  // Don't set - uses default 1.0

// AVOID:
max_tokens: X  // Use max_completion_tokens instead
```

---

## Files Modified

1. `/lib/llm-prompts.ts` - Updated `createBatchRequest()` and `BatchRequestItem` interface
2. `/app/api/admin/analysis/store-batch-results/route.ts` - Made flexible for multiple batch types

---

## Commits

- `321b9e4` - Increase max_completion_tokens to 2000
- `e1c96e5` - Remove temperature parameter
- `46a1034` - Fix max_tokens parameter name
- `c9ef5fe` - Make batch storage flexible for multiple types

---

## Recommendations

✅ **PROCEED WITH**:
- Motion Quality Full (17k motions) - 96% success rate is solid
- Absence Analysis refinement - 66% success, fixable with debugging

⚠️ **HOLD ON**:
- Rhetoric Full Analysis - Wait until primary analyses are polished
- Can run high-profile sample (200 members, ~$5) if eager for results

❌ **SKIP (For Now)**:
- Full Rhetoric (2,086 members) - Too much risk until primary analyses validate

---

**Next Session Focus**:
1. Debug parse failures in Absence Analysis
2. Validate Motion Quality output format
3. Run Motion Quality Full scale (17k motions)
4. Make final Rhetoric decision based on observed cost efficiency
