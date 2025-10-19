import {
  fetchMembers,
  fetchMotions,
  fetchMotionFulltext,
  fetchAnforanden,
  getCurrentRiksmote,
} from '../lib/riksdagen-api'
import { supabaseAdmin } from '../lib/supabase'

async function syncMembers() {
  console.log('Syncing members...')
  try {
    const members = await fetchMembers()
    console.log(`Fetched ${members.length} members`)

    if (!supabaseAdmin) throw new Error('Supabase admin client not available')

    for (const member of members) {
      const { error } = await supabaseAdmin
        .from('ledamoter')
        .upsert(
          {
            id: member.intressent_id,
            namn: member.namn,
            parti: member.parti,
            valkrets: member.valkrets,
            kon: member.kon,
            fodd_ar: parseInt(member.fodd_ar || '0'),
            bild_url: member.bild_url_97,
            updated_at: new Date(),
          },
          { onConflict: 'id' }
        )

      if (error) {
        console.error(`Error upserting member ${member.intressent_id}:`, error)
      }
    }

    console.log('✓ Members synced')
  } catch (error) {
    console.error('Error syncing members:', error)
    throw error
  }
}

async function syncVotings() {
  console.log('Syncing votings...')
  try {
    const riksmotes = getCurrentRiksmote()
    const supabaseService = supabaseAdmin

    if (!supabaseService) throw new Error('Supabase admin client not available')

    for (const rm of riksmotes) {
      console.log(`  Fetching votings for riksmöte ${rm}...`)
      try {
        // Get all votings for this riksmöte
        const response = await fetch(
          `https://data.riksdagen.se/voteringlista/?rm=${rm}&utformat=json`
        )
        const data = await response.json()

        const votingsList = data.voteringlista
        if (!votingsList || !Array.isArray(votingsList)) {
          console.log(`  No votings found for ${rm}`)
          continue
        }

        for (const votingData of votingsList) {
          if (!Array.isArray(votingData.votering)) continue

          const voteringar = votingData.votering as Array<{
            intressent_id: string
            rost: string
            namn: string
            parti: string
          }>

          for (const voting of voteringar) {
            const { error } = await supabaseService
              .from('voteringar')
              .insert({
                votering_id: votingData.dok_id,
                dokument_id: votingData.dok_id,
                ledamot_id: voting.intressent_id,
                datum: votingData.datum,
                titel: votingData.titel,
                rost: voting.rost,
                riksmote: rm,
                beteckning: votingData.beteckning,
              })

            if (error && !error.message.includes('duplicate')) {
              console.error(
                `Error inserting voting for ${voting.intressent_id}:`,
                error
              )
            }
          }
        }
      } catch (error) {
        console.error(`Error processing riksmöte ${rm}:`, error)
      }
    }

    console.log('✓ Votings synced')
  } catch (error) {
    console.error('Error syncing votings:', error)
    throw error
  }
}

async function syncMotions() {
  console.log('Syncing motions...')
  try {
    const riksmotes = getCurrentRiksmote()
    const supabaseService = supabaseAdmin

    if (!supabaseService) throw new Error('Supabase admin client not available')

    for (const rm of riksmotes) {
      console.log(`  Fetching motions for riksmöte ${rm}...`)
      try {
        const motions = await fetchMotions(rm)
        console.log(`  Found ${motions.length} motions`)

        for (const motion of motions) {
          // Try to fetch fulltext, but don't fail if it doesn't work
          let fulltext = ''
          try {
            fulltext = await fetchMotionFulltext(motion.dok_id)
          } catch (e) {
            console.log(
              `  Could not fetch fulltext for motion ${motion.dok_id}`
            )
          }

          const { error } = await supabaseService
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

          if (error && !error.message.includes('duplicate')) {
            console.error(
              `Error upserting motion ${motion.dok_id}:`,
              error
            )
          }
        }
      } catch (error) {
        console.error(`Error processing motions for ${rm}:`, error)
      }
    }

    console.log('✓ Motions synced')
  } catch (error) {
    console.error('Error syncing motions:', error)
    throw error
  }
}

async function syncAnforanden() {
  console.log('Syncing anföranden...')
  try {
    const riksmotes = getCurrentRiksmote()
    const supabaseService = supabaseAdmin

    if (!supabaseService) throw new Error('Supabase admin client not available')

    for (const rm of riksmotes) {
      console.log(`  Fetching anföranden for riksmöte ${rm}...`)
      try {
        const anforanden = await fetchAnforanden(rm)
        console.log(`  Found ${anforanden.length} anföranden`)

        for (const anforande of anforanden) {
          const { error } = await supabaseService
            .from('anforanden')
            .insert({
              anforande_id: anforande.anforande_id,
              ledamot_id: anforande.intressent_id,
              debatt_id: anforande.debatt_id,
              text: anforande.text,
              datum: anforande.datum,
              taltid: anforande.taltid,
              parti: anforande.parti,
            })

          if (error && !error.message.includes('duplicate')) {
            console.error(
              `Error inserting anforande ${anforande.anforande_id}:`,
              error
            )
          }
        }
      } catch (error) {
        console.error(`Error processing anföranden for ${rm}:`, error)
      }
    }

    console.log('✓ Anföranden synced')
  } catch (error) {
    console.error('Error syncing anföranden:', error)
    throw error
  }
}

async function main() {
  console.log('Starting data sync...\n')

  try {
    await syncMembers()
    await syncVotings()
    await syncMotions()
    await syncAnforanden()

    console.log('\n✓ Data sync complete!')
  } catch (error) {
    console.error('\n✗ Data sync failed:', error)
    process.exit(1)
  }
}

main()
