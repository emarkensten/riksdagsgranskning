/**
 * Model Comparison Test Script
 *
 * Tests 5 different LLM models on 3 analysis types:
 * - Motion Quality Analysis
 * - Absence Detection Analysis
 * - Rhetoric vs Voting Analysis
 *
 * Models tested:
 * - Claude Haiku 4.5 (Anthropic)
 * - GPT-5 Mini (OpenAI)
 * - GPT-4.1 (OpenAI)
 * - Gemini 2.5 Flash (Google)
 * - Grok 4 Fast (xAI)
 */

import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

// API Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GROK_API_KEY = process.env.XAI_API_KEY || ''

// Sample Data (from actual database)
const SAMPLE_MOTION = {
  id: 'HA021027',
  titel: 'Säkrare lådcyklar',
  fulltext: 'Säkrare lådcyklar \n\nRiksdagen ställer sig bakom det som anförs i motionen om att utreda regler för deformationszoner på lådcyklar och tillkännager detta för regeringen.',
  ledamot_id: '0191189790215',
  datum: '2022-11-22',
}

const SAMPLE_ABSENCE_DATA = {
  member: 'Peter Ollén',
  party: 'M',
  votes: [
    { title: 'Skattefrågor', absent: false },
    { title: 'Klimatpolitik', absent: false },
    { title: 'Försvarspolitik', absent: false },
    { title: 'Utbildningspolitik', absent: true },
    { title: 'Migrationspolitik', absent: false },
    { title: 'Energipolitik', absent: false },
    { title: 'Arbetsmarknadspolitik', absent: true },
    { title: 'Pensionsfrågor', absent: false },
    { title: 'Kriminalvård', absent: false },
    { title: 'Infrastruktur', absent: false },
  ],
}

const SAMPLE_RHETORIC_DATA = {
  member: 'Anna Andersson',
  party: 'S',
  speeches: [
    {
      text: 'Vi måste stärka välfärden och satsa mer på skola och vård. Det är grundläggande för ett rättvist samhälle.',
      date: '2023-03-15',
    },
    {
      text: 'Klimatfrågan är vår tids ödesfråga. Vi behöver kraftfulla åtgärder nu.',
      date: '2023-04-20',
    },
  ],
  votes: [
    { topic: 'Skolbudget', voted: 'ja' as const, date: '2023-03-20' },
    { topic: 'Klimatlag', voted: 'ja' as const, date: '2023-04-25' },
    { topic: 'Skattesänkning', voted: 'nej' as const, date: '2023-05-10' },
  ],
}

// Prompts (from actual system)
function createMotionAnalysisPrompt(motion: typeof SAMPLE_MOTION): string {
  return `You are an expert Swedish legislator. Evaluate the quality and substantiality of a parliamentary motion.

MOTION TITLE: ${motion.titel}
AUTHOR: Unknown (Party)

MOTION TEXT:
${motion.fulltext}

TASK:
Score this motion on each criterion (1-10 scale where 10 = excellent):

1. CONCRETE PROPOSALS: Does it suggest specific, actionable measures?
2. COST ANALYSIS: Does it include budget estimates or financial implications?
3. SPECIFIC GOALS: Are measurable targets or objectives defined?
4. LEGAL TEXT: Does it include proposed legislative changes or law amendments?
5. IMPLEMENTATION: Are details about how/when/who will implement this included?

Then provide:
- Overall substantiality score (average of the 5 criteria, 1-10)
- Category: "substantial" (7-10), "medium" (4-6), "empty" (1-3)
- Summary of what makes this motion strong or weak

RESPOND ONLY WITH VALID JSON:
{
  "scores": {
    "concrete_proposals": number (1-10),
    "cost_analysis": number (1-10),
    "specific_goals": number (1-10),
    "legal_text": number (1-10),
    "implementation": number (1-10)
  },
  "overall_substantiality_score": number (1-10),
  "category": "substantial" | "medium" | "empty",
  "assessment": "What makes this motion strong or weak",
  "main_strengths": ["strength1", "strength2"],
  "main_weaknesses": ["weakness1", "weakness2"]
}`
}

function createAbsenceAnalysisPrompt(data: typeof SAMPLE_ABSENCE_DATA): string {
  const absences = data.votes.filter((v) => v.absent).length
  const total = data.votes.length
  const absenceRate = ((absences / total) * 100).toFixed(1)

  return `Analyze voting absences for ${data.member} (${data.party}): ${absences}/${total} absent (${absenceRate}%)

Sample votes:
${data.votes.map((v) => `- ${v.title}: ${v.absent ? 'ABSENT' : 'Present'}`).join('\n')}

Identify topic categories, absences, patterns. Baseline: ~13%. Respond as JSON only:
{
  "kategorier": [{
    "name": "topic",
    "voting_count": N,
    "absence_count": N,
    "absence_percent": N.N,
    "baseline_percent": 13,
    "deviation": "higher"|"normal"|"lower",
    "pattern_note": "optional"
  }],
  "overall_assessment": "brief summary",
  "red_flags": ["pattern1", "pattern2"]
}`
}

function createRhetoricAnalysisPrompt(data: typeof SAMPLE_RHETORIC_DATA): string {
  return `You are a Swedish political journalist. Analyze the gap between what a politician says and how they vote.

MEMBER: ${data.member} (${data.party})

RECENT SPEECHES:
${data.speeches.map((s) => `"${s.text}"`).join('\n')}

RECENT VOTES:
${data.votes.map((v) => `- ${v.topic}: ${v.voted}`).join('\n')}

TASK:
1. Identify the main topics mentioned in speeches
2. For each topic, find related votes
3. Determine if voting aligns with what was said (positive/negative sentiment consistency)
4. Calculate a "gap score" (0-100) where 0 = perfect alignment, 100 = complete contradiction
5. Highlight any obvious contradictions between words and actions

RESPOND ONLY WITH VALID JSON:
{
  "topics_analyzed": [
    {
      "topic": "topic name",
      "speech_mentions": number,
      "speech_sentiment": "positive" | "negative" | "neutral",
      "related_votes": number,
      "supporting_votes": number,
      "opposing_votes": number,
      "alignment": "high" | "medium" | "low",
      "contradiction_note": "If applicable"
    }
  ],
  "overall_gap_score": number (0-100),
  "assessment": "Brief summary of rhetoric vs voting alignment",
  "credibility_issues": ["List of concerns", "about", "credibility"]
}`
}

// Model API Clients
interface ModelConfig {
  name: string
  provider: string
  inputCostPerMToken: number // Cost per 1M input tokens
  outputCostPerMToken: number // Cost per 1M output tokens
  cachedInputCostPerMToken?: number // Optional cached input cost
}

const MODELS: Record<string, ModelConfig> = {
  'claude-3-5-haiku-20241022': {
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    inputCostPerMToken: 1.0,
    outputCostPerMToken: 5.0,
  },
  'gpt-5-mini-2025-08-07': {
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    inputCostPerMToken: 0.125,
    outputCostPerMToken: 1.0,
    cachedInputCostPerMToken: 0.013,
  },
  'gpt-4.1-2025-04-14': {
    name: 'GPT-4.1',
    provider: 'OpenAI',
    inputCostPerMToken: 1.0,
    outputCostPerMToken: 4.0,
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    inputCostPerMToken: 0.15,
    outputCostPerMToken: 1.25,
  },
  'grok-4-fast-non-reasoning': {
    name: 'Grok 4 Fast',
    provider: 'xAI',
    inputCostPerMToken: 0.2,
    outputCostPerMToken: 0.5,
    cachedInputCostPerMToken: 0.05,
  },
}

interface TestResult {
  model: string
  analysisType: string
  response: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  error?: string
  costUSD: number
}

// API call functions
async function callClaude(prompt: string, model: string): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: model,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    )

    const latencyMs = Date.now() - startTime
    const inputTokens = response.data.usage.input_tokens
    const outputTokens = response.data.usage.output_tokens

    const config = MODELS[model]
    const costUSD =
      (inputTokens / 1000000) * config.inputCostPerMToken +
      (outputTokens / 1000000) * config.outputCostPerMToken

    return {
      model,
      analysisType: '',
      response: response.data.content[0].text,
      inputTokens,
      outputTokens,
      latencyMs,
      costUSD,
    }
  } catch (error: any) {
    return {
      model,
      analysisType: '',
      response: '',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      error: error.response?.data?.error?.message || String(error),
      costUSD: 0,
    }
  }
}

async function callOpenAI(prompt: string, model: string): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a Swedish political analyst. Respond ONLY with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 1,
        max_completion_tokens: 4000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    )

    const latencyMs = Date.now() - startTime
    const inputTokens = response.data.usage?.prompt_tokens || 0
    const outputTokens = response.data.usage?.completion_tokens || 0

    const config = MODELS[model]
    const costUSD =
      (inputTokens / 1000000) * config.inputCostPerMToken +
      (outputTokens / 1000000) * config.outputCostPerMToken

    return {
      model,
      analysisType: '',
      response: response.data.choices[0].message.content || '',
      inputTokens,
      outputTokens,
      latencyMs,
      costUSD,
    }
  } catch (error: any) {
    return {
      model,
      analysisType: '',
      response: '',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      error: error.response?.data?.error?.message || String(error),
      costUSD: 0,
    }
  }
}

async function callGemini(prompt: string, model: string): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a Swedish political analyst. Respond ONLY with valid JSON.\n\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 1,
          maxOutputTokens: 4000,
        },
      }
    )

    const latencyMs = Date.now() - startTime
    const inputTokens = response.data.usageMetadata?.promptTokenCount || 0
    const outputTokens = response.data.usageMetadata?.candidatesTokenCount || 0

    const config = MODELS[model]
    const costUSD =
      (inputTokens / 1000000) * config.inputCostPerMToken +
      (outputTokens / 1000000) * config.outputCostPerMToken

    return {
      model,
      analysisType: '',
      response: response.data.candidates[0].content.parts[0].text || '',
      inputTokens,
      outputTokens,
      latencyMs,
      costUSD,
    }
  } catch (error: any) {
    return {
      model,
      analysisType: '',
      response: '',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      error: error.response?.data?.error?.message || String(error),
      costUSD: 0,
    }
  }
}

async function callGrok(prompt: string, model: string): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a Swedish political analyst. Respond ONLY with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 1,
        max_tokens: 4000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROK_API_KEY}`,
        },
      }
    )

    const latencyMs = Date.now() - startTime
    const inputTokens = response.data.usage?.prompt_tokens || 0
    const outputTokens = response.data.usage?.completion_tokens || 0

    const config = MODELS[model]
    const costUSD =
      (inputTokens / 1000000) * config.inputCostPerMToken +
      (outputTokens / 1000000) * config.outputCostPerMToken

    return {
      model,
      analysisType: '',
      response: response.data.choices[0].message.content || '',
      inputTokens,
      outputTokens,
      latencyMs,
      costUSD,
    }
  } catch (error: any) {
    return {
      model,
      analysisType: '',
      response: '',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      error: error.response?.data?.error?.message || String(error),
      costUSD: 0,
    }
  }
}

// Main test runner
async function testModel(
  modelId: string,
  analysisType: 'motion' | 'absence' | 'rhetoric'
): Promise<TestResult> {
  console.log(`\n🧪 Testing ${MODELS[modelId].name} on ${analysisType} analysis...`)

  let prompt: string
  switch (analysisType) {
    case 'motion':
      prompt = createMotionAnalysisPrompt(SAMPLE_MOTION)
      break
    case 'absence':
      prompt = createAbsenceAnalysisPrompt(SAMPLE_ABSENCE_DATA)
      break
    case 'rhetoric':
      prompt = createRhetoricAnalysisPrompt(SAMPLE_RHETORIC_DATA)
      break
  }

  let result: TestResult
  const provider = MODELS[modelId].provider

  if (provider === 'Anthropic') {
    result = await callClaude(prompt, modelId)
  } else if (provider === 'OpenAI') {
    result = await callOpenAI(prompt, modelId)
  } else if (provider === 'Google') {
    result = await callGemini(prompt, modelId)
  } else if (provider === 'xAI') {
    result = await callGrok(prompt, modelId)
  } else {
    throw new Error(`Unknown provider: ${provider}`)
  }

  result.analysisType = analysisType

  if (result.error) {
    console.log(`   ❌ Error: ${result.error}`)
  } else {
    console.log(`   ✅ Success! (${result.latencyMs}ms, $${result.costUSD.toFixed(4)})`)
  }

  return result
}

async function runAllTests() {
  console.log('🚀 Starting Model Comparison Tests\n')
  console.log('Models to test:')
  Object.entries(MODELS).forEach(([id, config]) => {
    console.log(`  - ${config.name} (${config.provider})`)
  })
  console.log('\nAnalysis types: Motion Quality, Absence Detection, Rhetoric Analysis\n')

  const results: TestResult[] = []

  for (const modelId of Object.keys(MODELS)) {
    for (const analysisType of ['motion', 'absence', 'rhetoric'] as const) {
      const result = await testModel(modelId, analysisType)
      results.push(result)

      // Rate limiting delay
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  // Save results
  const outputPath = path.join(__dirname, '../model-comparison-results.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\n✅ Results saved to: ${outputPath}`)

  // Generate summary
  generateSummary(results)
}

function generateSummary(results: TestResult[]) {
  console.log('\n\n📊 SUMMARY\n')

  // Group by model
  const byModel = results.reduce(
    (acc, r) => {
      if (!acc[r.model]) acc[r.model] = []
      acc[r.model].push(r)
      return acc
    },
    {} as Record<string, TestResult[]>
  )

  Object.entries(byModel).forEach(([modelId, modelResults]) => {
    const config = MODELS[modelId]
    const successCount = modelResults.filter((r) => !r.error).length
    const avgLatency =
      modelResults.reduce((sum, r) => sum + r.latencyMs, 0) / modelResults.length
    const totalCost = modelResults.reduce((sum, r) => sum + r.costUSD, 0)

    console.log(`\n${config.name} (${config.provider}):`)
    console.log(`  Success rate: ${successCount}/${modelResults.length}`)
    console.log(`  Avg latency: ${avgLatency.toFixed(0)}ms`)
    console.log(`  Total cost: $${totalCost.toFixed(4)}`)
    console.log(`  Cost per 1000 jobs: $${(totalCost / 3 * 1000).toFixed(2)}`)
  })
}

// Run tests
runAllTests().catch(console.error)
