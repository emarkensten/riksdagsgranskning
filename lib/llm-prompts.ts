/**
 * LLM Prompts for analysis
 *
 * These prompts are used in OpenAI Batch API for analyzing politician behavior
 */

/**
 * Prompt for categorizing and analyzing absence patterns
 */
export function createAbsenceAnalysisPrompt(
  memberName: string,
  party: string,
  votingData: Array<{
    title: string
    category?: string
    absent: boolean
  }>
): string {
  const totalVotes = votingData.length
  const absences = votingData.filter((v) => v.absent).length
  const absenceRate = ((absences / totalVotes) * 100).toFixed(1)

  const votingsByCategory = votingData.reduce(
    (acc, v) => {
      const cat = v.category || 'Okategoriserad'
      if (!acc[cat]) acc[cat] = { total: 0, absent: 0 }
      acc[cat].total++
      if (v.absent) acc[cat].absent++
      return acc
    },
    {} as Record<string, { total: number; absent: number }>
  )

  return `Analyze voting absences for ${memberName} (${party}): ${absences}/${totalVotes} absent (${absenceRate}%)

Top categories by absence rate:
${Object.entries(votingsByCategory)
  .sort(([, a], [, b]) => (b.absent / b.total) * 100 - (a.absent / a.total) * 100)
  .slice(0, 5)
  .map(([cat, data]) => {
    const rate = ((data.absent / data.total) * 100).toFixed(1)
    return `- ${cat}: ${data.absent}/${data.total} (${rate}%)`
  })
  .join('\n')}

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

/**
 * Prompt for analyzing rhetoric vs. voting gap
 */
export function createRhetoricAnalysisPrompt(
  memberName: string,
  party: string,
  speeches: Array<{
    text: string
    date: string
  }>,
  votes: Array<{
    topic: string
    voted: 'ja' | 'nej' | 'avstar'
    date: string
  }>
): string {
  const speechSample = speeches.slice(0, 3).map((s) => `"${s.text.substring(0, 200)}..."`).join('\n')
  const voteSample = votes.slice(0, 5).map((v) => `- ${v.topic}: ${v.voted}`).join('\n')

  return `You are a Swedish political journalist. Analyze the gap between what a politician says and how they vote.

MEMBER: ${memberName} (${party})

RECENT SPEECHES (sample of ${speeches.length} total):
${speechSample}

RECENT VOTES (sample of ${votes.length} total):
${voteSample}

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

/**
 * Prompt for analyzing motion quality
 */
export function createMotionAnalysisPrompt(
  motionTitle: string,
  motionText: string,
  author: string,
  party: string
): string {
  const textSample = motionText.substring(0, 1500)

  return `You are an expert Swedish legislator. Evaluate the quality and substantiality of a parliamentary motion.

MOTION TITLE: ${motionTitle}
AUTHOR: ${author} (${party})

MOTION TEXT (sample):
${textSample}
${motionText.length > 1500 ? '[... text truncated ...]' : ''}

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

/**
 * Create batch request item for OpenAI Batch API
 */
export interface BatchRequestItem {
  custom_id: string
  method: 'POST'
  url: '/v1/chat/completions'
  body: {
    model: 'gpt-5-nano'
    messages: Array<{
      role: 'user' | 'system'
      content: string
    }>
    temperature: number
    max_completion_tokens: number
  }
}

export function createBatchRequest(
  customId: string,
  prompt: string,
  model: 'gpt-5-nano' = 'gpt-5-nano'
): BatchRequestItem {
  // Absence analysis needs more tokens to complete full analysis
  // Motion quality can work with less
  const isAbsenceAnalysis = customId.includes('absence_analysis')
  const maxTokens = isAbsenceAnalysis ? 5000 : 3000

  return {
    custom_id: customId,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model,
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
      // GPT-5 Nano only supports temperature: 1 (default)
      // Do not include temperature parameter as it defaults to 1
      max_completion_tokens: maxTokens,
    },
  }
}
