import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchMotionFulltext } from '@/lib/riksdagen-api'

/**
 * Fetch and update fulltext for motions
 * POST /api/admin/sync-motion-fulltext?limit=100
 *
 * Query parameters:
 * - limit: number of motions without fulltext to fetch (default 100)
 * - confirm: "yes" to skip warning
 */

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100')
  const confirm = request.nextUrl.searchParams.get('confirm') === 'yes'

  try {
    console.log(`\n🚀 Fetching fulltext for motions from 2022-2024 (limit: ${limit})`)

    // Fetch motions without fulltext from 2022-2024 (riksmöten HA-HC)
    const { data: motions, error } = await supabaseAdmin!
      .from('motioner')
      .select('id, titel, riksmote')
      .in('riksmote', ['2022/23', '2023/24', '2024/25'])
      .or('fulltext.is.null,fulltext.eq.""')
      .order('datum', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: `Failed to fetch motions: ${error.message}` }, { status: 500 })
    }

    if (!motions || motions.length === 0) {
      return NextResponse.json({
        message: 'No motions need fulltext update (2022-2024)',
        motions_count: 0,
      })
    }

    console.log(`📊 Found ${motions.length} motions without fulltext (2022-2024)`)

    if (!confirm) {
      return NextResponse.json({
        warning: 'This will fetch content from Riksdagen API. Review and confirm by adding ?confirm=yes',
        motions_count: motions.length,
        estimated_time_seconds: Math.ceil(motions.length * 2), // ~2 seconds per motion
        example_request: `/api/admin/sync-motion-fulltext?limit=${limit}&confirm=yes`,
      })
    }

    // Fetch fulltext for each motion
    let updated = 0
    let failed = 0

    for (let i = 0; i < motions.length; i++) {
      const motion = motions[i]
      try {
        console.log(`⏳ [${i + 1}/${motions.length}] Fetching ${motion.dok_id}...`)

        const { titel, fulltext } = await fetchMotionFulltext(motion.id)

        // Always try to update if we got any data
        if (titel || fulltext) {
          // Update database
          const { error: updateError } = await supabaseAdmin!
            .from('motioner')
            .update({
              titel: titel || motion.titel,
              fulltext: fulltext || null,
            })
            .eq('id', motion.id)

          if (updateError) {
            console.warn(`  ⚠️ Failed to update DB: ${updateError.message}`)
            failed++
          } else {
            console.log(`  ✅ Updated (titre: ${titel.length}, fulltext: ${fulltext.length} chars)`)
            updated++
          }
        } else {
          console.log(`  ⚠️ No data returned from API`)
          failed++
        }

        // Rate limiting: 500ms delay between requests
        if (i < motions.length - 1) {
          await new Promise((r) => setTimeout(r, 500))
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error}`)
        failed++
      }
    }

    console.log(`\n✅ Sync complete!`)
    console.log(`  Updated: ${updated}`)
    console.log(`  Failed: ${failed}`)

    return NextResponse.json({
      success: true,
      motions_processed: motions.length,
      updated,
      failed,
      message: `Fulltext fetched for ${updated} motions`,
    })
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
