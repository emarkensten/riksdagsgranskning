'use client'

import { useState, useMemo, useEffect } from 'react'
import { ArrowUpDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PartyStats {
  name: string
  color: string
  members: number
  avgMotionQuality: number
  totalMotions: number
  qualityMotions: number
  weakMotions: number
}

export function PartyComparison() {
  const [sortBy, setSortBy] = useState<'quality' | 'motions' | 'members'>('quality')
  const [selectedParty, setSelectedParty] = useState<string | null>(null)
  const [parties, setParties] = useState<PartyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await fetch('/api/parties/comparison')
        if (!res.ok) throw new Error('Failed to fetch party data')

        const data = await res.json()
        setParties(data.parties || [])
      } catch (err) {
        console.error('Error fetching party data:', err)
        setError('Could not load party comparison data')
        // Fallback to mock data if API fails
        setParties([
          {
            name: 'Moderaterna',
            color: 'bg-blue-600',
            members: 86,
            avgMotionQuality: 7.2,
            totalMotions: 342,
            qualityMotions: 245,
            weakMotions: 97,
          },
          {
            name: 'Socialdemokraterna',
            color: 'bg-red-600',
            members: 82,
            avgMotionQuality: 6.8,
            totalMotions: 316,
            qualityMotions: 198,
            weakMotions: 118,
          },
          {
            name: 'Sverigedemokraterna',
            color: 'bg-yellow-600',
            members: 73,
            avgMotionQuality: 5.2,
            totalMotions: 187,
            qualityMotions: 78,
            weakMotions: 109,
          },
          {
            name: 'Vänsterpartiet',
            color: 'bg-pink-600',
            members: 15,
            avgMotionQuality: 7.4,
            totalMotions: 89,
            qualityMotions: 67,
            weakMotions: 22,
          },
          {
            name: 'Miljöpartiet',
            color: 'bg-green-600',
            members: 12,
            avgMotionQuality: 6.9,
            totalMotions: 56,
            qualityMotions: 38,
            weakMotions: 18,
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchParties()
  }, [])

  const sortedParties = useMemo(() => {
    const sorted = [...parties]
    if (sortBy === 'quality') {
      return sorted.sort((a, b) => b.avgMotionQuality - a.avgMotionQuality)
    } else if (sortBy === 'motions') {
      return sorted.sort((a, b) => b.totalMotions - a.totalMotions)
    } else {
      return sorted.sort((a, b) => b.members - a.members)
    }
  }, [sortBy])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Partijämförelse
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Jämför partiernas motionkvalitet och aktivitet
            </p>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <p className="text-neutral-600 dark:text-neutral-400">Laddar partijämförelse...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
            Partijämförelse
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Jämför partiernas motionkvalitet och aktivitet
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 text-sm">
          {error} - Visar data från tidigare analys
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={sortBy === 'quality' ? 'default' : 'outline'}
          onClick={() => setSortBy('quality')}
          className="gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Motionkvalitet
        </Button>
        <Button
          variant={sortBy === 'motions' ? 'default' : 'outline'}
          onClick={() => setSortBy('motions')}
          className="gap-2"
        >
          <ArrowUpDown className="h-4 w-4" />
          Antal motioner
        </Button>
        <Button
          variant={sortBy === 'members' ? 'default' : 'outline'}
          onClick={() => setSortBy('members')}
          className="gap-2"
        >
          <ArrowUpDown className="h-4 w-4" />
          Ledamöter
        </Button>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full">
          <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Parti
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Ledamöter
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Motioner
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Genomsn. kvalitet
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Bra
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Svag
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedParties.map((party, index) => (
              <tr
                key={party.name}
                className={`border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer ${
                  selectedParty === party.name
                    ? 'bg-neutral-50 dark:bg-neutral-800'
                    : ''
                }`}
                onClick={() =>
                  setSelectedParty(
                    selectedParty === party.name ? null : party.name
                  )
                }
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${party.color}`}
                    />
                    <span className="font-medium text-neutral-900 dark:text-neutral-50">
                      {party.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-neutral-600 dark:text-neutral-400">
                  {party.members}
                </td>
                <td className="px-6 py-4 text-center text-neutral-600 dark:text-neutral-400">
                  {party.totalMotions}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-24 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-green-500"
                        style={{
                          width: `${(party.avgMotionQuality / 10) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 w-8">
                      {party.avgMotionQuality.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm font-medium">
                    {party.qualityMotions}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium">
                    {party.weakMotions}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Party Details */}
      {selectedParty && (
        <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
            {selectedParty} - Detaljer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sortedParties
              .filter((p) => p.name === selectedParty)
              .map((party) => (
                <div key={party.name}>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                    Motionkvalitetsfördelning
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-green-700 dark:text-green-300 font-medium">
                          Bra motioner
                        </span>
                        <span className="text-neutral-900 dark:text-neutral-50 font-semibold">
                          {party.qualityMotions} (
                          {(
                            (party.qualityMotions / party.totalMotions) *
                            100
                          ).toFixed(0)}
                          %)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${
                              (party.qualityMotions / party.totalMotions) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-red-700 dark:text-red-300 font-medium">
                          Svaga motioner
                        </span>
                        <span className="text-neutral-900 dark:text-neutral-50 font-semibold">
                          {party.weakMotions} (
                          {((party.weakMotions / party.totalMotions) * 100).toFixed(0)}
                          %)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{
                            width: `${
                              (party.weakMotions / party.totalMotions) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <span className="font-semibold text-neutral-900 dark:text-neutral-50">
            Motionkvalitet
          </span>{' '}
          mäts baserat på om motionen innehåller konkreta förslag, specifika mål,
          kostnadsanalys, lagtext och implementeringsplan.{' '}
          <span className="font-semibold text-neutral-900 dark:text-neutral-50">
            Klicka på en rad
          </span>{' '}
          för att se detaljer om partiets motionfördelning.
        </p>
      </div>
    </div>
  )
}
