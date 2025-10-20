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
    const { betankandenDir } = await request.json()

    if (!betankandenDir) {
      return NextResponse.json(
        { error: 'betankandenDir parameter required' },
        { status: 400 }
      )
    }

    console.log(`\nStarting betänkanden import from: ${betankandenDir}\n`)

    // Get all JSON files in the directory
    const jsonFiles = fs
      .readdirSync(betankandenDir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => path.join(betankandenDir, name))

    console.log(`Found ${jsonFiles.length} betänkande JSON files\n`)

    if (!supabaseAdmin) throw new Error('Supabase admin client not available')

    let totalBetankanden = 0
    let totalInserted = 0
    let allBetankanden: any[] = []

    // Parse all files first
    for (const jsonFile of jsonFiles) {
      try {
        const content = fs.readFileSync(jsonFile, 'utf-8')
        const data = JSON.parse(content)

        // Each file contains dokumentstatus.dokument object
        if (data.dokumentstatus && data.dokumentstatus.dokument) {
          const dok = data.dokumentstatus.dokument
          allBetankanden.push(dok)
        }
      } catch (error) {
        console.error(`  Error reading ${path.basename(jsonFile)}:`, error)
      }
    }

    totalBetankanden = allBetankanden.length
    console.log(`Parsed ${totalBetankanden} betänkanden\n`)

    // Insert in batches
    const batchSize = 100 // Smaller batches since HTML content is large
    console.log(`Inserting ${totalBetankanden} betänkanden in batches of ${batchSize}...\n`)

    for (let i = 0; i < allBetankanden.length; i += batchSize) {
      const batch = allBetankanden.slice(i, i + batchSize).map((dok: any) => ({
        id: dok.dok_id,
        hangar_id: dok.hangar_id,
        riksmote: dok.rm,
        beteckning: dok.beteckning,
        typ: dok.typ,
        subtyp: dok.subtyp,
        doktyp: dok.doktyp,
        datum: dok.datum ? dok.datum.split(' ')[0] : null, // Extract date only
        publicerad: dok.publicerad,
        titel: dok.titel,
        html: dok.html,
      }))

      const { error, count } = await supabaseAdmin
        .from('betankanden')
        .upsert(batch, { onConflict: 'id', count: 'exact' })

      if (!error && count !== null) {
        totalInserted += count
      } else if (error) {
        console.error(`  Error inserting batch:`, error)
      }

      console.log(
        `  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          allBetankanden.length / batchSize
        )} (${Math.min(i + batchSize, allBetankanden.length)}/${allBetankanden.length})`
      )
    }

    console.log(`\n✓ Import complete!`)
    console.log(`  Total betänkanden processed: ${totalBetankanden}`)
    console.log(`  Total betänkanden inserted: ${totalInserted}`)

    return NextResponse.json(
      {
        success: true,
        message: 'Betänkanden import complete',
        stats: {
          total_files: jsonFiles.length,
          total_betankanden: totalBetankanden,
          inserted: totalInserted,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error during betänkanden import:', error)
    return NextResponse.json(
      { error: 'Import failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Use POST to import betänkanden. Requires Bearer token.',
      example: {
        betankandenDir: '/path/to/bet-2022-2025.json',
      },
    },
    { status: 405 }
  )
}
