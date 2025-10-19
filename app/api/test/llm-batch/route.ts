import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createMotionAnalysisPrompt, createBatchRequest } from '@/lib/llm-prompts'

/**
 * Test LLM Batch Processing - estimates cost for analyzing motions
 * GET /api/test/llm-batch - shows cost estimate
 * POST /api/test/llm-batch?submit=true - actually submits batch (EXPENSIVE!)
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing LLM Batch cost estimation\n')

    // Fetch 5 motions from database
    const { data: motions, error } = await supabaseAdmin!
      .from('motioner')
      .select('*')
      .limit(5)

    if (error || !motions) {
      return NextResponse.json({ error: `Failed to fetch motions: ${error?.message}` }, { status: 500 })
    }

    console.log(`📊 Found ${motions.length} motions to analyze\n`)

    // Create batch requests
    const batchRequests = motions.map((motion, idx) => {
      const prompt = createMotionAnalysisPrompt(
        motion.titel || 'Unknown',
        motion.fulltext || 'No fulltext available',
        motion.ledamot_id || 'Unknown',
        'Unknown'
      )

      return createBatchRequest(`motion_quality_${idx}`, prompt)
    })

    // Calculate tokens (rough estimate: ~4 chars per token)
    const totalChars = batchRequests.reduce((acc, req) => {
      const promptChars = req.body.messages.reduce((sum, msg) => sum + msg.content.length, 0)
      return acc + promptChars
    }, 0)
    const estimatedTokens = Math.ceil(totalChars / 4)

    // Actual cost (gpt-4o pricing: $0.0025 input, $0.01 output)
    const inputTokens = Math.ceil(estimatedTokens * 0.5)
    const outputTokens = Math.ceil(estimatedTokens * 0.5)
    const inputCost = (inputTokens / 1000) * 0.0025
    const outputCost = (outputTokens / 1000) * 0.01
    const totalCost = inputCost + outputCost

    const response = {
      test: true,
      motions_analyzed: motions.length,
      estimated_tokens: estimatedTokens,
      breakdown: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
      costs: {
        input_cost_usd: inputCost.toFixed(4),
        output_cost_usd: outputCost.toFixed(4),
        total_cost_usd: totalCost.toFixed(4),
      },
      scale: {
        full_dataset_40_motions: {
          estimated_cost_usd: (totalCost * 8).toFixed(4),
        },
        all_ledamot_350: {
          estimated_cost_usd: 'TBD - need data',
        },
      },
      motions: motions.map((m) => ({
        id: m.id,
        title: m.titel,
        party: m.ledamot_id,
      })),
      batch_requests: batchRequests.length,
      next_step: 'POST /api/test/llm-batch?submit=true to actually submit batch',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const shouldSubmit = request.nextUrl.searchParams.get('submit') === 'true'

  if (!shouldSubmit) {
    return NextResponse.json({
      error: 'Use ?submit=true to actually submit batch',
      warning: 'This is EXPENSIVE! Each batch costs money.',
    })
  }

  try {
    return NextResponse.json({
      status: 'batch_submission_disabled',
      message: 'Batch submission is disabled in this version. Use SUBMIT_BATCH=true environment variable instead.',
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
