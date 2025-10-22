import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  fetchMembers,
  fetchAllMotionsForRiksmote,
  fetchAllVotingsForRiksmote,
} from '@/lib/riksdagen-api'

// Simple auth - check for admin token
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting data sync...\n')

    // Sync members
    console.log('Syncing members...')
    const members = await fetchMembers()
    console.log(`Fetched ${members.length} members`)

    if (!supabaseAdmin) throw new Error('Supabase admin client not available')

    let memberCount = 0
    for (const member of members) {
      const fullnamn = `${member.tilltalsnamn} ${member.efternamn}`.trim()
      const { error } = await supabaseAdmin
        .from('ledamoter')
        .upsert(
          {
            id: member.intressent_id,
            namn: fullnamn,
            parti: member.parti,
            valkrets: member.valkrets,
            kon: member.kon,
            fodd_ar: parseInt(member.fodd_ar || '0'),
            bild_url: member.bild_url_192,
            status: member.status,
            updated_at: new Date(),
          },
          { onConflict: 'id' }
        )

      if (!error) memberCount++
      else console.error(`Error upserting member ${member.intressent_id}:`, error)
    }
    console.log(`✓ Members synced (${memberCount}/${members.length})\n`)

    // Sync votings - fetch ALL votings for current mandate period 2022-2026
    // Using riksmöte filter with pagination to ensure 100% data completeness
    console.log('Syncing votings...')
    let votingCount = 0
    let allVotings: any[] = []

    try {
      console.log(`  Fetching ALL votings for mandate period 2022-2026...`)
      console.log(`  Using riksmöte filter with pagination for 100% data completeness`)

      // Fetch ALL votings for each riksmöte in current mandate period
      // This ensures we get every single voting (50,000+ per riksmöte)
      const riksmoten = ['2022/23', '2023/24', '2024/25', '2025/26']

      for (const rm of riksmoten) {
        console.log(`\n  Fetching riksmöte ${rm}...`)
        const votings = await fetchAllVotingsForRiksmote(rm)
        allVotings.push(...votings)
        console.log(`    ✓ Added ${votings.length} votings (total so far: ${allVotings.length})`)
      }

      // Remove duplicates (shouldn't be any, but safety check)
      const uniqueVotings = Array.from(new Map(allVotings.map(v => [v.votering_id, v])).values())
      if (uniqueVotings.length !== allVotings.length) {
        console.log(`  Removed ${allVotings.length - uniqueVotings.length} duplicates`)
      }
      allVotings = uniqueVotings

      console.log(`\n  ✓ Total fetched: ${allVotings.length} unique votings`)

      // Batch insert for efficiency
      const batchSize = 1000
      console.log(`\n  Inserting ${allVotings.length} votings in batches of ${batchSize}...`)

      for (let i = 0; i < allVotings.length; i += batchSize) {
        const batch = allVotings.slice(i, i + batchSize).map((voting: any) => ({
          votering_id: voting.votering_id,
          dokument_id: voting.dok_id,
          ledamot_id: voting.intressent_id,
          datum: voting.datum,
          titel: voting.namn || 'N/A',
          rost: voting.rost,
          riksmote: voting.rm,
          beteckning: voting.beteckning,
        }))

        const { error } = await supabaseAdmin
          .from('voteringar')
          .upsert(batch, { onConflict: 'votering_id' })

        if (!error) {
          votingCount += batch.length
        } else {
          console.error(`Error inserting voting batch:`, error)
        }

        // Show progress
        console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allVotings.length / batchSize)} (${i + batch.length}/${allVotings.length} votings)`)
      }

      console.log(`\n  ✓ Inserted ${votingCount} votings`)
    } catch (error) {
      console.error(`Error processing votings:`, error)
    }
    console.log(`✓ Votings synced (${votingCount} records)\n`)

    // Sync motions - fetch ALL motions for current mandate period 2022-2026
    // Using riksmöte filter to ensure 100% data completeness
    console.log('Syncing motions...')
    let motionCount = 0
    let allMotions: any[] = []

    try {
      console.log(`  Fetching ALL motions for mandate period 2022-2026...`)
      console.log(`  Using riksmöte filter for 100% data completeness`)

      // Fetch ALL motions for each riksmöte in current mandate period
      // This ensures we get every single motion (critical for journalistic integrity)
      const riksmoten = ['2022/23', '2023/24', '2024/25', '2025/26']

      for (const rm of riksmoten) {
        console.log(`\n  Fetching riksmöte ${rm}...`)
        const motions = await fetchAllMotionsForRiksmote(rm)
        allMotions.push(...motions)
        console.log(`    ✓ Added ${motions.length} motions (total so far: ${allMotions.length})`)
      }

      // Remove duplicates (shouldn't be any, but safety check)
      const uniqueMotions = Array.from(new Map(allMotions.map(m => [m.dok_id, m])).values())
      if (uniqueMotions.length !== allMotions.length) {
        console.log(`  Removed ${allMotions.length - uniqueMotions.length} duplicates`)
      }
      allMotions = uniqueMotions

      console.log(`\n  ✓ Total fetched: ${allMotions.length} unique motions`)
      const motions_to_sync = allMotions

      // Insert motions with basic data (titel is correct field name)
      // NOTE: Fulltext fetching is skipped here - too slow for sync endpoint
      // Use /api/admin/fetch-fulltext endpoint separately to fetch fulltext
      const batchSize = 1000
      console.log(`\n  Inserting ${motions_to_sync.length} motions in batches of ${batchSize}...`)

      for (let i = 0; i < motions_to_sync.length; i += batchSize) {
        const batch = motions_to_sync.slice(i, i + batchSize).map((motion: any) => ({
          id: motion.dok_id,
          titel: motion.titel, // FIX: Use 'titel' not 'dok_titel'
          datum: motion.publicerad,
          riksmote: motion.rm,
          dokument_typ: motion.doktyp,
          fulltext: '', // Fulltext will be fetched separately
        }))

        const { error } = await supabaseAdmin
          .from('motioner')
          .upsert(batch, { onConflict: 'id' })

        if (!error) {
          motionCount += batch.length
        } else {
          console.error(`Error inserting motion batch:`, error)
        }

        // Show progress
        console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(motions_to_sync.length / batchSize)} (${i + batch.length}/${motions_to_sync.length} motions)`)
      }

      console.log(`\n  ✓ Inserted ${motionCount} motions with basic data`)
      console.log(`  NOTE: Fulltext not fetched (too slow for sync endpoint)`)
      console.log(`  Run /api/admin/fetch-fulltext separately to fetch fulltext content`)
    } catch (error) {
      console.error(`Error processing motions:`, error)
    }
    console.log(`✓ Motions synced (${motionCount} records)\n`)

    // Sync anföranden - fetch from all riksmöten (SKIPPED for now - too slow)
    // TODO: Implement date-range based anföranden sync or async job
    let anforandeCount = 0
    console.log('Skipping anföranden sync (implement as separate job)\n')

    return NextResponse.json(
      {
        success: true,
        message: 'Data sync complete!',
        stats: {
          members: memberCount,
          votings: votingCount,
          motions: motionCount,
          anforanden: anforandeCount,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error during sync:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { message: 'Use POST to sync data. Requires Bearer token.' },
    { status: 405 }
  )
}
