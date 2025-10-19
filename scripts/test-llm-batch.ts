/**
 * Test LLM Batch Processing with a small sample
 * This tests the Motion Quality Analysis on 5 motions to estimate costs
 */

import { createClient } from '@supabase/supabase-js'
import { OpenAIBatchClient } from '../lib/openai-batch'
import { createMotionAnalysisPrompt, createBatchRequest } from '../lib/llm-prompts'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseKey)
const batchClient = new OpenAIBatchClient()

async function testBatch() {
  console.log('🧪 Testing LLM Batch Processing with Motion Quality Analysis\n')

  // Fetch 5 motions from database
  const { data: motions, error } = await supabase
    .from('motioner')
    .select('*')
    .limit(5)

  if (error || !motions) {
    throw new Error(`Failed to fetch motions: ${error?.message}`)
  }

  console.log(`📊 Found ${motions.length} motions to analyze\n`)

  // Create batch requests
  const batchRequests = motions.map((motion, idx) => {
    const prompt = createMotionAnalysisPrompt(
      motion.titel,
      motion.fulltext || 'No fulltext available',
      motion.ledamot_id || 'Unknown',
      'Unknown'
    )

    return createBatchRequest(`motion_quality_${idx}`, prompt)
  })

  console.log(`📦 Created ${batchRequests.length} batch requests`)
  console.log(`💰 Estimated cost: $${(batchRequests.length * 0.0005).toFixed(4)} (rough estimate)\n`)

  // Calculate tokens (rough estimate: ~4 chars per token)
  const totalChars = batchRequests.reduce((acc, req) => {
    const promptChars = req.body.messages.reduce((sum, msg) => sum + msg.content.length, 0)
    return acc + promptChars
  }, 0)
  const estimatedTokens = Math.ceil(totalChars / 4)

  console.log(`📈 Estimated tokens: ${estimatedTokens}`)
  console.log(`   Input: ~${Math.ceil(estimatedTokens * 0.5)} tokens`)
  console.log(`   Output: ~${Math.ceil(estimatedTokens * 0.5)} tokens`)

  // Actual cost (gpt-4o pricing: $0.0025 input, $0.01 output)
  const inputCost = (Math.ceil(estimatedTokens * 0.5) / 1000) * 0.0025
  const outputCost = (Math.ceil(estimatedTokens * 0.5) / 1000) * 0.01
  const totalCost = inputCost + outputCost

  console.log(`\n💵 Actual estimated cost:`)
  console.log(`   Input cost: $${inputCost.toFixed(4)}`)
  console.log(`   Output cost: $${outputCost.toFixed(4)}`)
  console.log(`   Total: $${totalCost.toFixed(4)}\n`)

  // Scale calculation
  console.log(`📈 Full dataset scale (40 motions):`)
  console.log(`   Estimated cost: $${(totalCost * 8).toFixed(4)}\n`)

  console.log(`📋 Batch request details:`)
  batchRequests.forEach((req) => {
    const tokenCount = req.body.messages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0)
    console.log(`   ${req.custom_id}: ~${tokenCount} tokens`)
  })

  console.log('\n✅ Test complete. Ready to submit batch if costs are acceptable.')
  console.log(
    'To submit actual batch (EXPENSIVE): Set SUBMIT_BATCH=true and run again or call submitBatch()\n'
  )

  // Optional: actually submit if env var is set
  if (process.env.SUBMIT_BATCH === 'true') {
    console.log('🚀 SUBMIT_BATCH=true detected. Submitting batch...\n')
    try {
      const fileId = await batchClient.uploadBatchFile(batchRequests, 'motion_quality_test.jsonl')
      console.log(`✅ File uploaded: ${fileId}`)

      const batchResponse = await batchClient.createBatch(fileId)
      console.log(`✅ Batch created: ${batchResponse.id}`)
      console.log(`\n📍 Check status with:`)
      console.log(`   curl -H "Authorization: Bearer $OPENAI_API_KEY" \\`)
      console.log(`   https://api.openai.com/v1/batches/${batchResponse.id}`)
    } catch (e) {
      console.error('❌ Error submitting batch:', e)
    }
  }
}

testBatch().catch(console.error)
