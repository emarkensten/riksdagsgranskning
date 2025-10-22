import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { OpenAIBatchClient } from '@/lib/openai-batch'
import { createMotionAnalysisPrompt, createAbsenceAnalysisPrompt, createRhetoricAnalysisPrompt, createBatchRequest } from '@/lib/llm-prompts'

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
      return await submitAbsenceAnalysisBatch(limit, confirm)
    } else if (type === 'rhetoric_analysis') {
      return await submitRhetoricAnalysisBatch(limit, confirm)
    } else {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function submitMotionQualityBatch(limit: number, confirm: boolean) {
  // CRITICAL FIX: Only fetch motions that DON'T have analysis yet
  // Use RPC function to get motions without analysis efficiently

  const { data: motions, error } = await supabaseAdmin!
    .rpc('get_motions_without_analysis', {
      limit_count: limit,
      riksmote_filter: ['2022/23', '2023/24', '2024/25']
    })

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

async function submitAbsenceAnalysisBatch(limit: number, confirm: boolean) {
  // Fetch members and their voting data
  const { data: members, error: membersError } = await supabaseAdmin!
    .from('ledamoter')
    .select('*')
    .limit(limit)

  if (membersError || !members) {
    return NextResponse.json({ error: `Failed to fetch members: ${membersError?.message}` }, { status: 500 })
  }

  console.log(`📊 Found ${members.length} members to analyze for absence patterns`)

  // Create batch requests
  const batchRequests = []
  for (let i = 0; i < members.length; i++) {
    const member = members[i]

    // Fetch voting data for this member
    const { data: votes, error: votesError } = await supabaseAdmin!
      .from('voteringar')
      .select('titel, rost, datum')
      .eq('ledamot_id', member.id)
      .limit(100) // Limit votes per member for analysis

    if (votesError || !votes) {
      console.warn(`Warning: Could not fetch votes for ${member.namn}`)
      continue
    }

    // Transform votes to absence analysis format
    const votingData = votes.map((v: any) => ({
      title: v.titel || 'Unknown',
      absent: v.rost === 'Frånvarande' || v.rost === 'Jämförd' || !v.rost,
    }))

    const prompt = createAbsenceAnalysisPrompt(member.namn, member.parti || 'Unknown', votingData)
    batchRequests.push(createBatchRequest(`absence_analysis_${member.id}_${i}`, prompt))
  }

  if (batchRequests.length === 0) {
    return NextResponse.json({ error: 'No valid members to analyze' }, { status: 400 })
  }

  // Calculate cost
  const totalChars = batchRequests.reduce((acc, req) => {
    const promptChars = req.body.messages.reduce((sum, msg) => sum + msg.content.length, 0)
    return acc + promptChars
  }, 0)
  const estimatedTokens = Math.ceil(totalChars / 4)
  const inputTokens = Math.ceil(estimatedTokens * 0.5)
  const outputTokens = Math.ceil(estimatedTokens * 0.5)
  // GPT-5 Nano Batch API pricing (50% discount)
  const inputCost = (inputTokens / 1000000) * 0.0125
  const outputCost = (outputTokens / 1000000) * 0.1
  const totalCost = inputCost + outputCost

  console.log(`💰 Estimated cost: $${totalCost.toFixed(4)}`)
  console.log(`📈 Tokens: ~${estimatedTokens} (input: ${inputTokens}, output: ${outputTokens})`)

  if (!confirm) {
    return NextResponse.json({
      warning: 'This will cost money! Review and confirm by adding ?confirm=yes to the request',
      estimated_cost_usd: totalCost.toFixed(4),
      members_count: batchRequests.length,
      tokens_estimated: estimatedTokens,
      example_request: `/api/admin/analysis/submit-batch?type=absence_detection&limit=${limit}&confirm=yes`,
    })
  }

  // Submit batch
  try {
    const batchClient = new OpenAIBatchClient()

    console.log('📤 Uploading batch file...')
    const fileId = await batchClient.uploadBatchFile(batchRequests, 'absence_analysis_batch.jsonl')
    console.log(`✅ File uploaded: ${fileId}`)

    console.log('📨 Creating batch job...')
    const batchResponse = await batchClient.createBatch(fileId)
    console.log(`✅ Batch created: ${batchResponse.id}`)

    // Store batch info in database
    const { error: insertError } = await supabaseAdmin!.from('batch_jobs').insert({
      batch_id: batchResponse.id,
      type: 'absence_detection',
      status: 'submitted',
      motions_count: batchRequests.length,
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
        type: 'absence_detection',
        members_count: batchRequests.length,
        estimated_cost_usd: totalCost.toFixed(4),
        status: batchResponse.status,
        message: 'Batch submitted successfully! Check status with /api/admin/analysis/batch-status?batch_id=' + batchResponse.id,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error submitting batch:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function submitRhetoricAnalysisBatch(limit: number, confirm: boolean) {
  // Fetch members and their speech/voting data
  const { data: members, error: membersError } = await supabaseAdmin!
    .from('ledamoter')
    .select('*')
    .limit(limit)

  if (membersError || !members) {
    return NextResponse.json({ error: `Failed to fetch members: ${membersError?.message}` }, { status: 500 })
  }

  console.log(`📊 Found ${members.length} members to analyze for rhetoric vs voting alignment`)

  // Create batch requests
  const batchRequests = []
  for (let i = 0; i < members.length; i++) {
    const member = members[i]

    // Fetch speeches for this member (sample)
    const { data: speeches, error: speechesError } = await supabaseAdmin!
      .from('anforanden')
      .select('text, datum')
      .eq('ledamot_id', member.id)
      .limit(5) // Sample 5 speeches

    // Fetch votes for this member (sample)
    const { data: votes, error: votesError } = await supabaseAdmin!
      .from('voteringar')
      .select('titel, rost, datum')
      .eq('ledamot_id', member.id)
      .limit(10) // Sample 10 votes

    if ((speechesError && votesError) || (!speeches && !votes) || (speeches?.length === 0 && votes?.length === 0)) {
      console.warn(`Warning: Could not fetch data for ${member.namn}`)
      continue
    }

    // Transform data for analysis
    const speechData = (speeches || []).map((s: any) => ({
      text: s.text || 'Unknown',
      date: s.datum || 'Unknown',
    }))

    const voteData = (votes || []).map((v: any) => ({
      topic: v.titel || 'Unknown',
      voted: (v.rost === 'Ja' ? 'ja' : v.rost === 'Nej' ? 'nej' : 'avstar') as 'ja' | 'nej' | 'avstar',
      date: v.datum || 'Unknown',
    }))

    const prompt = createRhetoricAnalysisPrompt(member.namn, member.parti || 'Unknown', speechData, voteData)
    batchRequests.push(createBatchRequest(`rhetoric_analysis_${member.id}_${i}`, prompt))
  }

  if (batchRequests.length === 0) {
    return NextResponse.json({ error: 'No valid members with sufficient data to analyze' }, { status: 400 })
  }

  // Calculate cost
  const totalChars = batchRequests.reduce((acc, req) => {
    const promptChars = req.body.messages.reduce((sum, msg) => sum + msg.content.length, 0)
    return acc + promptChars
  }, 0)
  const estimatedTokens = Math.ceil(totalChars / 4)
  const inputTokens = Math.ceil(estimatedTokens * 0.5)
  const outputTokens = Math.ceil(estimatedTokens * 0.5)
  // GPT-5 Nano Batch API pricing (50% discount)
  const inputCost = (inputTokens / 1000000) * 0.0125
  const outputCost = (outputTokens / 1000000) * 0.1
  const totalCost = inputCost + outputCost

  console.log(`💰 Estimated cost: $${totalCost.toFixed(4)}`)
  console.log(`📈 Tokens: ~${estimatedTokens} (input: ${inputTokens}, output: ${outputTokens})`)

  if (!confirm) {
    return NextResponse.json({
      warning: 'This will cost money! Review and confirm by adding ?confirm=yes to the request',
      estimated_cost_usd: totalCost.toFixed(4),
      members_count: batchRequests.length,
      tokens_estimated: estimatedTokens,
      example_request: `/api/admin/analysis/submit-batch?type=rhetoric_analysis&limit=${limit}&confirm=yes`,
    })
  }

  // Submit batch
  try {
    const batchClient = new OpenAIBatchClient()

    console.log('📤 Uploading batch file...')
    const fileId = await batchClient.uploadBatchFile(batchRequests, 'rhetoric_analysis_batch.jsonl')
    console.log(`✅ File uploaded: ${fileId}`)

    console.log('📨 Creating batch job...')
    const batchResponse = await batchClient.createBatch(fileId)
    console.log(`✅ Batch created: ${batchResponse.id}`)

    // Store batch info in database
    const { error: insertError } = await supabaseAdmin!.from('batch_jobs').insert({
      batch_id: batchResponse.id,
      type: 'rhetoric_analysis',
      status: 'submitted',
      motions_count: batchRequests.length,
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
        type: 'rhetoric_analysis',
        members_count: batchRequests.length,
        estimated_cost_usd: totalCost.toFixed(4),
        status: batchResponse.status,
        message: 'Batch submitted successfully! Check status with /api/admin/analysis/batch-status?batch_id=' + batchResponse.id,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error submitting batch:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
