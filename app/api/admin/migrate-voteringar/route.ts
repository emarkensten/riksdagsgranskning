import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log(`\nStarting votering migration from votering_import to voteringar\n`)

    if (!supabaseAdmin) throw new Error('Supabase admin client not available')

    // Step 1: Clear old incomplete data from voteringar
    console.log('Step 1: Clearing old data from voteringar...')
    const { error: deleteError } = await supabaseAdmin.from('voteringar').delete().neq('id', 0)

    if (deleteError) {
      console.error('Error deleting old data:', deleteError)
    } else {
      console.log('✓ Old data cleared')
    }

    // Step 2: Migrate data in batches
    console.log('\nStep 2: Migrating data in batches...')

    const batchSize = 5000
    let offset = 0
    let totalMigrated = 0
    let hasMore = true

    while (hasMore) {
      // Fetch batch from votering_import
      const { data: batch, error: fetchError } = await supabaseAdmin
        .from('votering_import')
        .select('votering_id, intressent_id, datum, namn, rost, rm, beteckning')
        .range(offset, offset + batchSize - 1)

      if (fetchError) {
        console.error(`Error fetching batch at offset ${offset}:`, fetchError)
        break
      }

      if (!batch || batch.length === 0) {
        hasMore = false
        break
      }

      // Transform and insert batch
      const transformedBatch = batch.map((row: any) => ({
        votering_id: row.votering_id,
        dokument_id: null,
        ledamot_id: row.intressent_id,
        datum: row.datum,
        titel: row.namn,
        rost: row.rost,
        riksmote: row.rm,
        beteckning: row.beteckning,
      }))

      const { error: insertError, count } = await supabaseAdmin
        .from('voteringar')
        .insert(transformedBatch, { count: 'exact' })

      if (insertError) {
        console.error(`Error inserting batch at offset ${offset}:`, insertError)
      } else if (count !== null) {
        totalMigrated += count
        console.log(`  Migrated ${totalMigrated} rows (batch ${Math.floor(offset / batchSize) + 1})`)
      }

      offset += batchSize

      // Stop if we got less than batchSize (last batch)
      if (batch.length < batchSize) {
        hasMore = false
      }
    }

    console.log(`\n✓ Migration complete!`)
    console.log(`  Total rows migrated: ${totalMigrated}`)

    return NextResponse.json(
      {
        success: true,
        message: 'Votering migration complete',
        stats: {
          migrated: totalMigrated,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error during migration:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Use POST to migrate votering data. Requires Bearer token.',
    },
    { status: 405 }
  )
}
