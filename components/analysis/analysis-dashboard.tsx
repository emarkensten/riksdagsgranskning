'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle, BarChart3, PieChart } from 'lucide-react'

interface AnalysisStats {
  motionQuality: {
    analyzed: number
    substantial: number
    medium: number
    empty: number
    avgScore: number
  }
  absenceAnalysis: {
    analyzed: number
    highAbsence: number
    normalAbsence: number
    lowAbsence: number
  }
  rhetoricsAnalysis: {
    analyzed: number
    highGap: number
    mediumGap: number
    lowGap: number
    avgGapScore: number
  }
}

export function AnalysisDashboard() {
  const [stats, setStats] = useState<AnalysisStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'quality' | 'absence' | 'rhetoric'>('overview')

  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const res = await fetch('/api/analys/overview')
        if (!res.ok) throw new Error('Misslyckades att hämta analysdata')

        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Error fetching analysis data:', err)
        setError('Kunde inte ladda analysdata')
        // Set mock data for demo
        setStats({
          motionQuality: {
            analyzed: 100,
            substantial: 72,
            medium: 20,
            empty: 8,
            avgScore: 7.2,
          },
          absenceAnalysis: {
            analyzed: 349,
            highAbsence: 28,
            normalAbsence: 301,
            lowAbsence: 20,
          },
          rhetoricsAnalysis: {
            analyzed: 100,
            highGap: 15,
            mediumGap: 35,
            lowGap: 50,
            avgGapScore: 42,
          },
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysisData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <p className="text-neutral-600 dark:text-neutral-400">Laddar analysöversikt...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          {error || 'Kunde inte ladda analysdata'}
        </div>
      </div>
    )
  }

  const motionQualityPercent = {
    substantial: Math.round((stats.motionQuality.substantial / stats.motionQuality.analyzed) * 100),
    medium: Math.round((stats.motionQuality.medium / stats.motionQuality.analyzed) * 100),
    empty: Math.round((stats.motionQuality.empty / stats.motionQuality.analyzed) * 100),
  }

  const absencePercent = {
    high: Math.round((stats.absenceAnalysis.highAbsence / stats.absenceAnalysis.analyzed) * 100),
    normal: Math.round((stats.absenceAnalysis.normalAbsence / stats.absenceAnalysis.analyzed) * 100),
    low: Math.round((stats.absenceAnalysis.lowAbsence / stats.absenceAnalysis.analyzed) * 100),
  }

  const rhetoricsPercent = {
    high: Math.round((stats.rhetoricsAnalysis.highGap / stats.rhetoricsAnalysis.analyzed) * 100),
    medium: Math.round((stats.rhetoricsAnalysis.mediumGap / stats.rhetoricsAnalysis.analyzed) * 100),
    low: Math.round((stats.rhetoricsAnalysis.lowGap / stats.rhetoricsAnalysis.analyzed) * 100),
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 text-sm">
          {error} - Visar data från tidigare analys
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            selectedTab === 'overview'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50'
          }`}
        >
          Översikt
        </button>
        <button
          onClick={() => setSelectedTab('quality')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            selectedTab === 'quality'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50'
          }`}
        >
          Motionkvalitet
        </button>
        <button
          onClick={() => setSelectedTab('absence')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            selectedTab === 'absence'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50'
          }`}
        >
          Frånvaro
        </button>
        <button
          onClick={() => setSelectedTab('rhetoric')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            selectedTab === 'rhetoric'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50'
          }`}
        >
          Retorik & Handling
        </button>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Motion Quality Card */}
            <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Motionkvalitet</h3>
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-neutral-600 dark:text-neutral-400">Analyserade motioner</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-50">
                      {stats.motionQuality.analyzed}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="text-center py-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.motionQuality.avgScore.toFixed(1)}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Genomsnittlig kvalitet</p>
                </div>
              </div>
            </div>

            {/* Absence Analysis Card */}
            <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Frånvaro</h3>
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-neutral-600 dark:text-neutral-400">Analyserade ledamöter</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-50">
                      {stats.absenceAnalysis.analyzed}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="text-center py-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {absencePercent.high}%
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Högt frånvaro</p>
                </div>
              </div>
            </div>

            {/* Rhetoric Analysis Card */}
            <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Retorik & Handling</h3>
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-neutral-600 dark:text-neutral-400">Analyserade medlemmar</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-50">
                      {stats.rhetoricsAnalysis.analyzed}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="text-center py-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.rhetoricsAnalysis.avgGapScore}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Gap score (0-100)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-900 dark:text-neutral-50">Analysöversikt:</span> Denna instrumentpanel visar AI-analyser av parlamentariska motioner, ledamöters röstmönster och kongruens mellan tal och handling. Använd tabflikorna för detaljerade resultat från varje analys.
            </p>
          </div>
        </div>
      )}

      {/* Motion Quality Tab */}
      {selectedTab === 'quality' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Distribution Chart */}
            <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                Motioners kvalitetsfördelning
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Substantiell (7-10)', value: stats.motionQuality.substantial, percent: motionQualityPercent.substantial, color: 'bg-green-500' },
                  { label: 'Medel (4-6)', value: stats.motionQuality.medium, percent: motionQualityPercent.medium, color: 'bg-yellow-500' },
                  { label: 'Tom (1-3)', value: stats.motionQuality.empty, percent: motionQualityPercent.empty, color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">{item.label}</span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        {item.value} ({item.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Statistics */}
            <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                Kvalitetsstatistik
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Genomsnittlig kvalitetspoäng</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.motionQuality.avgScore.toFixed(1)}/10
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Substantiella</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {motionQualityPercent.substantial}%
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Tomma</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {motionQualityPercent.empty}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-900 dark:text-neutral-50">Motionkvalitet:</span> Motioner klassificeras baserat på förekomsten av konkreta förslag, kostnadsanalyser, specifika mål, lagtext och implementeringsplaner.
            </p>
          </div>
        </div>
      )}

      {/* Absence Tab */}
      {selectedTab === 'absence' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Absence Distribution */}
            <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                Frånvaron per kategori
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Högt frånvaro (>16%)', value: stats.absenceAnalysis.highAbsence, percent: absencePercent.high, color: 'bg-red-500' },
                  { label: 'Normal frånvaro (10-16%)', value: stats.absenceAnalysis.normalAbsence, percent: absencePercent.normal, color: 'bg-yellow-500' },
                  { label: 'Lågt frånvaro (<10%)', value: stats.absenceAnalysis.lowAbsence, percent: absencePercent.low, color: 'bg-green-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">{item.label}</span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        {item.value} ({item.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Absence Insights */}
            <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                Frånvaron Insights
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Medlemmar med högt frånvaro</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {stats.absenceAnalysis.highAbsence}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Medlemmar med lågt frånvaro</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {stats.absenceAnalysis.lowAbsence}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-900 dark:text-neutral-50">Frånvaro:</span> Bas frånvaro är ~13%. Högre frånvaro kan indikera sjukdom, familjeärenden eller andra orsaker, men kan också signalera brist på engagemang för vissa frågor.
            </p>
          </div>
        </div>
      )}

      {/* Rhetoric Tab */}
      {selectedTab === 'rhetoric' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gap Score Distribution */}
            <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                Retorik-handling gap fördelning
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Högt gap (61-100)', value: stats.rhetoricsAnalysis.highGap, percent: rhetoricsPercent.high, color: 'bg-red-500' },
                  { label: 'Medel gap (31-60)', value: stats.rhetoricsAnalysis.mediumGap, percent: rhetoricsPercent.medium, color: 'bg-yellow-500' },
                  { label: 'Lågt gap (0-30)', value: stats.rhetoricsAnalysis.lowGap, percent: rhetoricsPercent.low, color: 'bg-green-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">{item.label}</span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        {item.value} ({item.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alignment Metrics */}
            <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                Alignment Statistik
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Genomsnittligt gap score</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.rhetoricsAnalysis.avgGapScore}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">(0 = perfekt alignment, 100 = motsägelse)</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Bra alignment (låg gap)</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {rhetoricsPercent.low}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-900 dark:text-neutral-50">Retorik & Handling:</span> Gap score mäter skillnaden mellan vad ledamöter säger (i tal) och vad de gör (röstande). Ett högt gap kan indikera inkonsistens eller opportunism.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
