import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { OpenAIBatchClient } from '@/lib/openai-batch'
import { createMotionAnalysisPrompt, createBatchRequest } from '@/lib/llm-prompts'

/**
 * Submit LLM batch jobs to OpenAI for analysis
 * POST /api/admin/analysis/submit-batch?type=motion_quality&limit=40
 *
 * Query parameters:
 * - type: "motion_quality" | "absence_detection" | "rhetoric_analysis"
 * - limit: number of items to analyze (default 10)
 * - confirm: "yes" to skip warning
 */

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = request.nextUrl.searchParams.get('type') || 'motion_quality'
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10')
  const confirm = request.nextUrl.searchParams.get('confirm') === 'yes'

  try {
    console.log(`\n🚀 Submitting batch job for ${type} (limit: ${limit})`)

    if (type === 'motion_quality') {
      return await submitMotionQualityBatch(limit, confirm)
    } else if (type === 'absence_detection') {
      return NextResponse.json({ error: 'Not yet implemented' }, { status: 501 })
    } else if (type === 'rhetoric_analysis') {
      return NextResponse.json({ error: 'Not yet implemented' }, { status: 501 })
    } else {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function submitMotionQualityBatch(limit: number, confirm: boolean) {
  // Fetch motions - prefer fulltext, but accept any with title for POC testing
  const { data: motions, error } = await supabaseAdmin!
    .from('motioner')
    .select('*')
    .not('titel', 'is', null)
    .neq('titel', '')
    .order('datum', { ascending: false })
    .limit(limit)

  if (error || !motions) {
    return NextResponse.json({ error: `Failed to fetch motions: ${error?.message}` }, { status: 500 })
  }

  console.log(`📊 Found ${motions.length} motions to analyze (${motions.filter((m: any) => m.fulltext).length} with fulltext)`)

  // Create batch requests
  const batchRequests = motions.map((motion, idx) => {
    const prompt = createMotionAnalysisPrompt(
      motion.titel || 'Unknown',
      motion.fulltext || 'No fulltext available',
      motion.ledamot_id || 'Unknown',
      'Unknown'
    )

    return createBatchRequest(`motion_quality_${motion.id}_${idx}`, prompt)
  })

  // Calculate cost using GPT-5 Nano Batch API pricing
  const totalChars = batchRequests.reduce((acc, req) => {
    const promptChars = req.body.messages.reduce((sum, msg) => sum + msg.content.length, 0)
    return acc + promptChars
  }, 0)
  const estimatedTokens = Math.ceil(totalChars / 4)
  const inputTokens = Math.ceil(estimatedTokens * 0.5)
  const outputTokens = Math.ceil(estimatedTokens * 0.5)
  // GPT-5 Nano Batch API pricing (50% discount): $0.0000125 input, $0.0001 output
  const inputCost = (inputTokens / 1000000) * 0.0125
  const outputCost = (outputTokens / 1000000) * 0.1
  const totalCost = inputCost + outputCost

  console.log(`💰 Estimated cost: $${totalCost.toFixed(4)}`)
  console.log(`📈 Tokens: ~${estimatedTokens} (input: ${inputTokens}, output: ${outputTokens})`)

  if (!confirm) {
    return NextResponse.json({
      warning: 'This will cost money! Review and confirm by adding ?confirm=yes to the request',
      estimated_cost_usd: totalCost.toFixed(4),
      motions_count: motions.length,
      tokens_estimated: estimatedTokens,
      example_request: `/api/admin/analysis/submit-batch?type=motion_quality&limit=${limit}&confirm=yes`,
    })
  }

  // Actually submit the batch
  try {
    const batchClient = new OpenAIBatchClient()

    console.log('📤 Uploading batch file...')
    const fileId = await batchClient.uploadBatchFile(batchRequests, 'motion_quality_batch.jsonl')
    console.log(`✅ File uploaded: ${fileId}`)

    console.log('📨 Creating batch job...')
    const batchResponse = await batchClient.createBatch(fileId)
    console.log(`✅ Batch created: ${batchResponse.id}`)

    // Store batch info in database for tracking
    const { error: insertError } = await supabaseAdmin!.from('batch_jobs').insert({
      batch_id: batchResponse.id,
      type: 'motion_quality',
      status: 'submitted',
      motions_count: motions.length,
      estimated_cost_usd: totalCost,
      created_at: new Date(),
    })

    if (insertError) {
      console.warn('Warning: Could not store batch job info:', insertError)
    }

    return NextResponse.json(
      {
        success: true,
        batch_id: batchResponse.id,
        type: 'motion_quality',
        motions_count: motions.length,
        estimated_cost_usd: totalCost.toFixed(4),
        status: batchResponse.status,
        message:
          'Batch submitted successfully! Check status with /api/admin/analysis/batch-status?batch_id=' +
          batchResponse.id,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error submitting batch:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
