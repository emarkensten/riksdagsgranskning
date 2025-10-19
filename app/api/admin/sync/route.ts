import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  fetchMembers,
  fetchMotions,
  fetchMotionFulltext,
  fetchAnforanden,
  getCurrentRiksmote,
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

    // Sync votings
    console.log('Syncing votings...')
    const riksmotes = getCurrentRiksmote()
    let votingCount = 0

    for (const rm of riksmotes) {
      console.log(`  Fetching votings for riksmöte ${rm}...`)
      try {
        const response = await fetch(
          `https://data.riksdagen.se/voteringlista/?rm=${rm}&utformat=json`
        )
        const data = await response.json()

        if (!data.voteringlista) continue

        // API returns votering as either an object or array
        let voterings = data.voteringlista.votering
        if (!voterings) continue

        // Normalize to array
        if (!Array.isArray(voterings)) {
          voterings = [voterings]
        }

        for (const voting of voterings) {
          const { error } = await supabaseAdmin
            .from('voteringar')
            .insert({
              votering_id: voting.votering_id,
              dokument_id: voting.dok_id,
              ledamot_id: voting.intressent_id,
              datum: data.voteringlista['@systemdatum'] || null,
              titel: voting.namn || 'N/A',
              rost: voting.rost,
              riksmote: rm,
              beteckning: voting.beteckning,
            })

          if (!error) votingCount++
        }
      } catch (error) {
        console.error(`Error processing votings for riksmöte ${rm}:`, error)
      }
    }
    console.log(`✓ Votings synced (${votingCount} records)\n`)

    // Sync motions
    console.log('Syncing motions...')
    let motionCount = 0

    for (const rm of riksmotes) {
      console.log(`  Fetching motions for riksmöte ${rm}...`)
      try {
        const motions = await fetchMotions(rm)
        console.log(`  Found ${motions.length} motions`)

        for (const motion of motions) {
          let fulltext = ''
          try {
            fulltext = await fetchMotionFulltext(motion.dok_id)
          } catch (e) {
            // Motion fulltext not available
          }

          const { error } = await supabaseAdmin
            .from('motioner')
            .upsert(
              {
                id: motion.dok_id,
                titel: motion.dok_titel,
                datum: motion.publicerad,
                riksmote: rm,
                dokument_typ: motion.doktyp,
                fulltext: fulltext,
              },
              { onConflict: 'id' }
            )

          if (!error) motionCount++
        }
      } catch (error) {
        console.error(`Error processing motions for ${rm}:`, error)
      }
    }
    console.log(`✓ Motions synced (${motionCount} records)\n`)

    // Sync anföranden
    console.log('Syncing anföranden...')
    let anforandeCount = 0

    for (const rm of riksmotes) {
      console.log(`  Fetching anföranden for riksmöte ${rm}...`)
      try {
        const anforanden = await fetchAnforanden(rm)
        console.log(`  Found ${anforanden.length} anföranden`)

        for (const anforande of anforanden) {
          // Check if ledamot exists in database
          const { data: ledamotExists } = await supabaseAdmin
            .from('ledamoter')
            .select('id')
            .eq('id', anforande.intressent_id)
            .limit(1)

          const { error } = await supabaseAdmin
            .from('anforanden')
            .insert({
              anforande_id: anforande.anforande_id,
              ledamot_id: ledamotExists && ledamotExists.length > 0 ? anforande.intressent_id : null,
              debatt_id: anforande.rel_dok_id,
              text: anforande.anforandetext || '',
              datum: anforande.dok_datum || anforande.systemdatum?.split(' ')[0],
              taltid: null,
              parti: anforande.parti,
            })

          if (error) {
            console.error(`Error inserting anförande ${anforande.anforande_id}:`, error)
          } else {
            anforandeCount++
          }
        }
      } catch (error) {
        console.error(`Error processing anföranden for ${rm}:`, error)
      }
    }
    console.log(`✓ Anföranden synced (${anforandeCount} records)\n`)

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
