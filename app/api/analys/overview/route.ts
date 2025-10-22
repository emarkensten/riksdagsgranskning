import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured')
    }

    // Get motion quality stats
    const { data: motionStats, error: motionError } = await supabaseAdmin
      .from('motion_kvalitet')
      .select('substantiell_score')
      .not('substantiell_score', 'is', null)

    if (motionError) throw motionError

    // Get absence detection stats
    const { data: absenceStats, error: absenceError } = await supabaseAdmin
      .from('franvaro_analys')
      .select('franvaro_procent')

    if (absenceError) throw absenceError

    // Get rhetoric analysis stats
    const { data: rhetoricStats, error: rhetoricError } = await supabaseAdmin
      .from('retorik_analys')
      .select('overall_gap_score')
      .not('overall_gap_score', 'is', null)

    if (rhetoricError) throw rhetoricError

    // Calculate statistics
    const motionQuality = {
      analyzed: motionStats?.length || 0,
      substantial: motionStats?.filter(m => (m.substantiell_score || 0) >= 7).length || 0,
      medium: motionStats?.filter(m => (m.substantiell_score || 0) >= 4 && (m.substantiell_score || 0) < 7).length || 0,
      empty: motionStats?.filter(m => (m.substantiell_score || 0) < 4).length || 0,
      avgScore: motionStats && motionStats.length > 0
        ? motionStats.reduce((sum, m) => sum + (m.substantiell_score || 0), 0) / motionStats.length
        : 0,
    }

    const absenceAnalysis = {
      analyzed: absenceStats?.length || 0,
      highAbsence: absenceStats?.filter(a => (a.franvaro_procent || 0) > 20).length || 0,
      normalAbsence: absenceStats?.filter(a => (a.franvaro_procent || 0) >= 5 && (a.franvaro_procent || 0) <= 20).length || 0,
      lowAbsence: absenceStats?.filter(a => (a.franvaro_procent || 0) < 5).length || 0,
    }

    const rhetoricsAnalysis = {
      analyzed: rhetoricStats?.length || 0,
      highGap: rhetoricStats?.filter(r => (r.overall_gap_score || 0) >= 7).length || 0,
      mediumGap: rhetoricStats?.filter(r => (r.overall_gap_score || 0) >= 4 && (r.overall_gap_score || 0) < 7).length || 0,
      lowGap: rhetoricStats?.filter(r => (r.overall_gap_score || 0) < 4).length || 0,
      avgGapScore: rhetoricStats && rhetoricStats.length > 0
        ? rhetoricStats.reduce((sum, r) => sum + (r.overall_gap_score || 0), 0) / rhetoricStats.length
        : 0,
    }

    return NextResponse.json({
      motionQuality,
      absenceAnalysis,
      rhetoricsAnalysis,
    })
  } catch (error) {
    console.error('Analysis overview error:', error)
    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'object'
        ? JSON.stringify(error)
        : String(error)
    return NextResponse.json(
      {
        error: 'Failed to fetch analysis overview data',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
