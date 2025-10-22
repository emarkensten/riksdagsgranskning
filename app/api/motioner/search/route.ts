import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const party = searchParams.get('party')
  const quality = searchParams.get('quality')
  const riksmote = searchParams.get('riksmote')

  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured')
    }

    // Get ledamoter first to enable party filtering
    const { data: allLedamoter, error: ledamoterError } = await supabaseAdmin
      .from('ledamoter')
      .select('id, namn, parti')

    if (ledamoterError) throw ledamoterError

    // Create ledamot lookup map
    const ledamotMap: Record<string, { namn: string; parti: string | null }> = {}
    allLedamoter?.forEach(l => {
      ledamotMap[l.id] = { namn: l.namn, parti: l.parti }
    })

    // Filter ledamot_ids by party if specified
    let ledamotIds: string[] | undefined
    if (party) {
      ledamotIds = allLedamoter
        ?.filter(l => l.parti === party)
        .map(l => l.id)
    }

    // Build motioner query
    let supabaseQuery = supabaseAdmin
      .from('motioner')
      .select(`
        id,
        titel,
        datum,
        riksmote,
        ledamot_id,
        motion_kvalitet(substantiell_score, kategori, sammanfattning)
      `)
      .order('datum', { ascending: false })
      .limit(100)

    // Apply filters
    if (riksmote) {
      supabaseQuery = supabaseQuery.eq('riksmote', riksmote)
    }

    if (ledamotIds && ledamotIds.length > 0) {
      supabaseQuery = supabaseQuery.in('ledamot_id', ledamotIds)
    }

    // Text search in titel
    if (query) {
      supabaseQuery = supabaseQuery.ilike('titel', `%${query}%`)
    }

    const { data: motioner, error } = await supabaseQuery

    if (error) throw error

    // Filter by quality after fetch (since motion_kvalitet is optional)
    let filteredMotioner = motioner || []

    if (quality) {
      filteredMotioner = filteredMotioner.filter((motion: any) => {
        const score = motion.motion_kvalitet?.substantiell_score || 0
        if (quality === 'high') return score >= 7
        if (quality === 'medium') return score >= 4 && score < 7
        if (quality === 'low') return score < 4
        return true
      })
    }

    // Format response with ledamot data
    const formattedMotioner = filteredMotioner.map((motion: any) => {
      const ledamot = ledamotMap[motion.ledamot_id]
      return {
        id: motion.id,
        title: motion.titel,
        date: motion.datum,
        riksmote: motion.riksmote,
        member: ledamot?.namn || 'Okänd',
        party: ledamot?.parti || null,
        qualityScore: motion.motion_kvalitet?.substantiell_score || null,
        category: motion.motion_kvalitet?.kategori || null,
        summary: motion.motion_kvalitet?.sammanfattning || null,
      }
    })

    return NextResponse.json({
      motions: formattedMotioner,
      total: formattedMotioner.length,
      query: {
        search: query,
        party,
        quality,
        riksmote,
      },
    })
  } catch (error) {
    console.error('Motion search error:', error)
    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'object'
        ? JSON.stringify(error)
        : String(error)
    return NextResponse.json(
      {
        error: 'Motion search failed',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
