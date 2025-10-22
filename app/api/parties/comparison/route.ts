import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const PARTY_COLORS: Record<string, string> = {
  'M': 'bg-blue-600',
  'S': 'bg-red-600',
  'SD': 'bg-yellow-600',
  'C': 'bg-green-600',
  'V': 'bg-red-800',
  'KD': 'bg-blue-800',
  'L': 'bg-blue-400',
  'MP': 'bg-green-500',
}

const PARTY_NAMES: Record<string, string> = {
  'M': 'Moderaterna',
  'S': 'Socialdemokraterna',
  'SD': 'Sverigedemokraterna',
  'C': 'Centerpartiet',
  'V': 'Vänsterpartiet',
  'KD': 'Kristdemokraterna',
  'L': 'Liberalerna',
  'MP': 'Miljöpartiet',
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured')
    }

    // Get all ledamoter with their party affiliation
    const { data: ledamoter, error: ledamoterError } = await supabaseAdmin
      .from('ledamoter')
      .select('id, parti')
      .not('parti', 'is', null)

    if (ledamoterError) throw ledamoterError

    // Create ledamot_id to parti mapping
    const ledamotPartiMap: Record<string, string> = {}
    ledamoter?.forEach(l => {
      if (l.id && l.parti) {
        ledamotPartiMap[l.id] = l.parti
      }
    })

    // Get all motions with quality scores
    const { data: motions, error: motionsError } = await supabaseAdmin
      .from('motioner')
      .select(`
        id,
        ledamot_id,
        motion_kvalitet!inner(substantiell_score)
      `)

    if (motionsError) throw motionsError

    // Group data by party
    const partyStats: Record<string, {
      members: Set<string>
      totalMotions: number
      qualityMotions: number
      weakMotions: number
      totalScore: number
    }> = {}

    // Initialize partyStats from ledamoter
    ledamoter?.forEach(ledamot => {
      if (ledamot.parti && !partyStats[ledamot.parti]) {
        partyStats[ledamot.parti] = {
          members: new Set(),
          totalMotions: 0,
          qualityMotions: 0,
          weakMotions: 0,
          totalScore: 0
        }
      }
      if (ledamot.parti && ledamot.id) {
        partyStats[ledamot.parti].members.add(ledamot.id)
      }
    })

    // Process motions
    motions?.forEach((motion: any) => {
      const parti = ledamotPartiMap[motion.ledamot_id]
      if (parti && partyStats[parti]) {
        const score = motion.motion_kvalitet?.substantiell_score || 0
        partyStats[parti].totalMotions++
        partyStats[parti].totalScore += score

        if (score >= 4) {
          partyStats[parti].qualityMotions++
        } else {
          partyStats[parti].weakMotions++
        }
      }
    })

    // Convert to array format
    const parties = Object.entries(partyStats)
      .map(([parti, stats]) => ({
        name: PARTY_NAMES[parti] || parti,
        color: PARTY_COLORS[parti] || 'bg-gray-600',
        members: stats.members.size,
        avgMotionQuality: stats.totalMotions > 0
          ? stats.totalScore / stats.totalMotions
          : 0,
        totalMotions: stats.totalMotions,
        qualityMotions: stats.qualityMotions,
        weakMotions: stats.weakMotions,
      }))
      .filter(p => p.totalMotions > 0)
      .sort((a, b) => b.avgMotionQuality - a.avgMotionQuality)

    return NextResponse.json({ parties })
  } catch (error) {
    console.error('Party comparison error:', error)
    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'object'
        ? JSON.stringify(error)
        : String(error)
    return NextResponse.json(
      {
        error: 'Failed to fetch party comparison data',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
