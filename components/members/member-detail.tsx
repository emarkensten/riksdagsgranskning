'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Briefcase, Calendar, MapPin, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface MemberStats {
  totalVotes?: number
  totalMotions?: number
  absenceRate?: number
  averageQualityScore?: number
  party?: string
  district?: string
  role?: string
}

export function MemberDetail({ memberId }: { memberId: string }) {
  const [member, setMember] = useState<any>(null)
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const res = await fetch(`/api/ledamoter/${memberId}`)
        if (!res.ok) throw new Error('Misslyckades att hämta medlemsdata')

        const data = await res.json()
        setMember(data.member)
        setStats(data.stats)
      } catch (err) {
        console.error('Error fetching member data:', err)
        setError('Kunde inte ladda medlemsinformation')
      } finally {
        setLoading(false)
      }
    }

    fetchMemberData()
  }, [memberId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <p className="text-neutral-600 dark:text-neutral-400">Laddar medlemsinformation...</p>
        </div>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="space-y-6">
        <Link href="/medlemmar">
          <button className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
            <ArrowLeft className="h-4 w-4" />
            Tillbaka till medlemmar
          </button>
        </Link>
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          {error || 'Kunde inte ladda medlemsinformation'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/medlemmar">
        <button className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till medlemmar
        </button>
      </Link>

      {/* Header */}
      <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              {member.name}
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              {stats?.party}
            </p>
          </div>

          {/* Member Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            {stats?.district && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-neutral-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Distrikt</p>
                  <p className="text-neutral-900 dark:text-neutral-50 font-medium">{stats.district}</p>
                </div>
              </div>
            )}
            {stats?.role && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-neutral-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Roll</p>
                  <p className="text-neutral-900 dark:text-neutral-50 font-medium">{stats.role}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Votes */}
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Röster</p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            {stats?.totalVotes ?? '--'}
          </p>
        </div>

        {/* Motions */}
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Motioner</p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            {stats?.totalMotions ?? '--'}
          </p>
        </div>

        {/* Absence Rate */}
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Frånvaro</p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            {stats?.absenceRate !== undefined ? `${(stats.absenceRate * 100).toFixed(1)}%` : '--'}
          </p>
        </div>

        {/* Quality Score */}
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Motionkvalitet</p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            {stats?.averageQualityScore !== undefined ? `${stats.averageQualityScore.toFixed(1)}/10` : '--'}
          </p>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Aktivitet & Analyser
        </h2>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Data från detaljerade analyser av denna ledamots röstmönster, motionaktivitet och dess överensstämmelse mellan tal och handling kommer att visas här när analysen är slutförd.
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <span className="font-semibold text-neutral-900 dark:text-neutral-50">Medlemsdetaljer:</span> Den här sidan visar en överblick av denna parlamentariker's aktivitet. Mer detaljerad information om individuella motioner och röstningar hittar du genom att söka på{' '}
          <Link href="/motioner" className="text-blue-600 dark:text-blue-400 hover:underline">
            motionssidan
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
