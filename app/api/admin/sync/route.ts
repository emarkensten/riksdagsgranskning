import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  fetchMembers,
  fetchMotions,
  fetchMotionFulltext,
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

    // Sync votings - use sz=100000 to get maximum voting records (API max is 10000)
    console.log('Syncing votings...')
    let votingCount = 0

    try {
      console.log(`  Fetching all votings (sz=100000, API max is 10000)...`)
      const response = await fetch(
        `https://data.riksdagen.se/voteringlista/?sz=100000&utformat=json`
      )
      const data = await response.json()

      if (!data.voteringlista) {
        console.log('  No votings found')
      } else {
        // API returns votering as either an object or array
        let voterings = data.voteringlista.votering
        if (!voterings) {
          console.log('  No votings found')
        } else {
          // Normalize to array
          if (!Array.isArray(voterings)) {
            voterings = [voterings]
          }

          console.log(`  Found ${voterings.length} votings`)

          // Batch insert for efficiency
          const batchSize = 1000
          for (let i = 0; i < voterings.length; i += batchSize) {
            const batch = voterings.slice(i, i + batchSize).map((voting: any) => ({
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
              .insert(batch)

            if (!error) {
              votingCount += batch.length
            } else {
              console.error(`Error inserting voting batch:`, error)
            }

            // Show progress
            if (i % 5000 === 0) {
              console.log(`  Processed ${i + batch.length}/${voterings.length} votings`)
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching votings:`, error)
    }
    console.log(`✓ Votings synced (${votingCount} records)\n`)

    // Sync motions - fetch from 2022-01-01 onwards (current mandate period 2022-2026)
    console.log('Syncing motions...')
    let motionCount = 0

    try {
      console.log(`  Fetching all motions from 2022-01-01 onwards (mandate period 2022-2026)...`)
      const motions = await fetchMotions(undefined, '2022-01-01')
      console.log(`  Found ${motions.length} motions`)

      // First pass: insert motions with basic data (titel is correct field name)
      const batchSize = 1000
      for (let i = 0; i < motions.length; i += batchSize) {
        const batch = motions.slice(i, i + batchSize).map((motion: any) => ({
          id: motion.dok_id,
          titel: motion.titel, // FIX: Use 'titel' not 'dok_titel'
          datum: motion.publicerad,
          riksmote: motion.rm,
          dokument_typ: motion.doktyp,
          fulltext: '', // Will be fetched in second pass
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
        if (i % 5000 === 0) {
          console.log(`  Processed ${i + batch.length}/${motions.length} motions`)
        }
      }

      // Second pass: fetch and update fulltext + titel for all motions
      console.log(`\n  Fetching fulltext for all ${motions.length} motions...`)
      let fulltextCount = 0
      for (let i = 0; i < motions.length; i++) {
        const motion = motions[i]
        try {
          const { titel, fulltext } = await fetchMotionFulltext(motion.dok_id)
          if (fulltext || titel) {
            const { error } = await supabaseAdmin
              .from('motioner')
              .update({
                titel: titel || motion.titel, // Use fetched title if available
                fulltext
              })
              .eq('id', motion.dok_id)
            if (error) {
              console.error(`Error updating fulltext for ${motion.dok_id}:`, error)
            } else {
              fulltextCount++
            }
          }
        } catch (e) {
          // Skip if fulltext not available
        }
        if (i % 50 === 0 && i > 0) {
          console.log(`  Updated ${i}/${motions.length} records (${fulltextCount} with content)`)
        }
      }
      console.log(`  ✓ Updated ${fulltextCount} motions with fulltext`)
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
