/**
 * Update batch_jobs status from OpenAI
 *
 * This script checks all "submitted" batches at OpenAI and updates their
 * status in the database. Solves the problem where batches are completed
 * but database still shows "submitted".
 */

const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateBatchStatuses() {
  console.log('🔄 Updating batch statuses from OpenAI...\n')

  // Get all submitted batches
  const { data: batches, error } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('status', 'submitted')
    .order('created_at', { ascending: false })

  if (error || !batches) {
    console.error('❌ Failed to fetch batches:', error)
    return
  }

  console.log(`Found ${batches.length} batches with status "submitted"\n`)

  let updated = 0
  let failed = 0

  for (const batch of batches) {
    try {
      // Check status at OpenAI
      const response = await axios.get(
        `https://api.openai.com/v1/batches/${batch.batch_id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const openaiStatus = response.data.status
      const completedAt = response.data.completed_at
        ? new Date(response.data.completed_at * 1000).toISOString()
        : null

      // Update if status changed
      if (openaiStatus !== 'submitted') {
        const { error: updateError } = await supabase
          .from('batch_jobs')
          .update({
            status: openaiStatus,
            completed_at: completedAt
          })
          .eq('batch_id', batch.batch_id)

        if (updateError) {
          console.error(`❌ Failed to update ${batch.batch_id}:`, updateError)
          failed++
        } else {
          console.log(`✅ ${batch.batch_id.substring(0, 12)}... : submitted → ${openaiStatus}`)
          updated++
        }
      } else {
        console.log(`⏳ ${batch.batch_id.substring(0, 12)}... : still submitted`)
      }

    } catch (err) {
      console.error(`❌ Error checking ${batch.batch_id}:`, err.message)
      failed++
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Still submitted: ${batches.length - updated - failed}`)
  console.log(`   Failed: ${failed}`)
}

updateBatchStatuses().catch(console.error)
