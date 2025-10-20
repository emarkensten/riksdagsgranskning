import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

// Simple auth - check for admin token
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { voteringDir } = await request.json()

    if (!voteringDir) {
      return NextResponse.json(
        { error: 'voteringDir parameter required' },
        { status: 400 }
      )
    }

    console.log(`\nStarting votering import from: ${voteringDir}\n`)

    // Get all riksmöte directories
    const riksmoteDirs = fs
      .readdirSync(voteringDir)
      .filter((name) => name.startsWith('votering-') && name.endsWith('.json'))
      .map((name) => path.join(voteringDir, name))
      .filter((fullPath) => fs.statSync(fullPath).isDirectory())

    console.log(`Found ${riksmoteDirs.length} riksmöte directories\n`)

    let totalVotings = 0
    let totalInserted = 0

    if (!supabaseAdmin) throw new Error('Supabase admin client not available')

    for (const riksmoteDir of riksmoteDirs) {
      const riksmoteName = path.basename(riksmoteDir).replace('votering-', '').replace('.json', '')
      console.log(`\nProcessing riksmöte: ${riksmoteName}`)

      // Get all JSON files in this riksmöte directory
      const jsonFiles = fs
        .readdirSync(riksmoteDir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => path.join(riksmoteDir, name))

      console.log(`  Found ${jsonFiles.length} JSON files`)

      // Process each JSON file
      let riksmoteVotings: any[] = []
      for (const jsonFile of jsonFiles) {
        try {
          const content = fs.readFileSync(jsonFile, 'utf-8')
          const data = JSON.parse(content)

          // Each file contains dokvotering.votering array with all votes for that votering_id
          if (data.dokvotering && data.dokvotering.votering) {
            let votings = data.dokvotering.votering
            if (!Array.isArray(votings)) {
              votings = [votings]
            }
            riksmoteVotings.push(...votings)
          }
        } catch (error) {
          console.error(`  Error reading ${path.basename(jsonFile)}:`, error)
        }
      }

      console.log(`  Parsed ${riksmoteVotings.length} individual voting records`)
      totalVotings += riksmoteVotings.length

      // Insert in batches
      const batchSize = 1000
      let inserted = 0

      for (let i = 0; i < riksmoteVotings.length; i += batchSize) {
        const batch = riksmoteVotings.slice(i, i + batchSize).map((voting: any) => ({
          votering_id: voting.votering_id,
          dokument_id: voting.dok_id || null,
          ledamot_id: voting.intressent_id,
          datum: voting.datum,
          titel: voting.namn || 'N/A',
          rost: voting.rost,
          riksmote: voting.rm,
          beteckning: voting.beteckning,
        }))

        const { error, count } = await supabaseAdmin
          .from('voteringar')
          .upsert(batch, { onConflict: 'votering_id', count: 'exact' })

        if (!error && count !== null) {
          inserted += count
        } else if (error) {
          console.error(`  Error inserting batch:`, error)
        }

        console.log(
          `  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            riksmoteVotings.length / batchSize
          )} (${Math.min(i + batchSize, riksmoteVotings.length)}/${riksmoteVotings.length})`
        )
      }

      console.log(`  ✓ Inserted ${inserted} voteringar for ${riksmoteName}`)
      totalInserted += inserted
    }

    console.log(`\n✓ Import complete!`)
    console.log(`  Total votering records processed: ${totalVotings}`)
    console.log(`  Total voteringar inserted: ${totalInserted}`)

    return NextResponse.json(
      {
        success: true,
        message: 'Votering import complete',
        stats: {
          riksmoten: riksmoteDirs.length,
          total_records: totalVotings,
          inserted: totalInserted,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error during votering import:', error)
    return NextResponse.json(
      { error: 'Import failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Use POST to import votings. Requires Bearer token.',
      example: {
        voteringDir: '/path/to/voteringar',
      },
    },
    { status: 405 }
  )
}
