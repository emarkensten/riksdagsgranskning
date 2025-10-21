import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import https from 'https'

// Simple auth - check for admin token
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123'

async function fetchBatchResults(fileId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      reject(new Error('Missing OPENAI_API_KEY'))
      return
    }

    const options = {
      hostname: 'api.openai.com',
      path: `/v1/files/${fileId}/content`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    })

    req.on('error', reject)
    req.end()
  })
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { fileId, batchId, type } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 })
    }

    // Detect batch type from custom_id if not provided
    let batchType = type

    console.log(`Fetching batch results from file ${fileId}...`)

    // Fetch results from OpenAI
    const resultsData = await fetchBatchResults(fileId)
    const lines = resultsData.trim().split('\n')

    console.log(`Retrieved ${lines.length} results`)

    if (!supabaseAdmin) throw new Error('Supabase admin client not available')

    let storedCount = 0
    let errorCount = 0

    // Process each result
    for (const line of lines) {
      try {
        const result = JSON.parse(line)
        const customId = result.custom_id
        const content = result.response.body.choices[0].message.content

        // Skip empty responses (token limit hit)
        if (!content || content.trim().length === 0) {
          console.warn(`Skipping empty response for ${customId}`)
          errorCount++
          continue
        }

        // Detect batch type from custom_id if not provided
        if (!batchType) {
          if (customId.includes('motion_quality')) {
            batchType = 'motion_quality'
          } else if (customId.includes('absence_analysis')) {
            batchType = 'absence_detection'
          }
        }

        // Parse the JSON analysis from the content
        let jsonStr = content
        if (content.includes('```json')) {
          jsonStr = content.split('```json')[1].split('```')[0]
        }

        const analysis = JSON.parse(jsonStr.trim())

        if (batchType === 'motion_quality') {
          // Handle motion quality results
          const parts = customId.split('_')
          const motionId = parts[2]

          const { error } = await supabaseAdmin
            .from('motion_kvalitet')
            .insert({
              motion_id: motionId,
              har_konkreta_forslag: analysis.scores.concrete_proposals,
              har_kostnader: analysis.scores.cost_analysis,
              har_specifika_mal: analysis.scores.specific_goals,
              har_lagtext: analysis.scores.legal_text,
              har_implementation: analysis.scores.implementation,
              substantiell_score: analysis.overall_substantiality_score,
              kategori: analysis.category,
              sammanfattning: analysis.assessment,
            })

          if (!error) {
            storedCount++
          } else {
            console.error(`Error storing motion_kvalitet for ${motionId}:`, error)
            errorCount++
          }
        } else if (batchType === 'absence_detection') {
          // Handle absence analysis results
          const parts = customId.split('_')
          const memberId = parts[2]

          // Calculate totals from kategorier array
          let totalVotes = 0
          let totalAbsent = 0
          if (analysis.kategorier && Array.isArray(analysis.kategorier)) {
            analysis.kategorier.forEach((kat: any) => {
              totalVotes += kat.voting_count || 0
              totalAbsent += kat.absence_count || 0
            })
          }

          const { error } = await supabaseAdmin
            .from('franvaro_analys')
            .insert({
              ledamot_id: memberId,
              kategorier: analysis.kategorier || [],
              total_voteringar: totalVotes,
              total_franvaro: totalAbsent,
              franvaro_procent: totalVotes > 0 ? Math.round((totalAbsent / totalVotes) * 100 * 10) / 10 : 0,
            })

          if (!error) {
            storedCount++
          } else {
            console.error(`Error storing franvaro_analys for ${memberId}:`, error)
            errorCount++
          }
        } else if (batchType === 'rhetoric_analysis') {
          // Handle rhetoric vs voting analysis results
          const parts = customId.split('_')
          const memberId = parts[2]

          const { error } = await supabaseAdmin
            .from('retorik_analys')
            .insert({
              ledamot_id: memberId,
              topics_analyzed: analysis.topics_analyzed || [],
              overall_gap_score: analysis.overall_gap_score || 0,
              assessment: analysis.assessment || '',
              credibility_issues: analysis.credibility_issues || [],
            })

          if (!error) {
            storedCount++
          } else {
            console.error(`Error storing retorik_analys for ${memberId}:`, error)
            errorCount++
          }
        }
      } catch (e) {
        console.error('Error processing result line:', e)
        errorCount++
      }
    }

    console.log(`✓ Batch results stored (${storedCount}/${lines.length} successful, ${errorCount} failed)`)

    return NextResponse.json(
      {
        success: true,
        message: 'Batch results stored',
        stats: {
          total: lines.length,
          stored: storedCount,
          failed: errorCount,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error storing batch results:', error)
    return NextResponse.json(
      { error: 'Failed to store batch results', details: String(error) },
      { status: 500 }
    )
  }
}
