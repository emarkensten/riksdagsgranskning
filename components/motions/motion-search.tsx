'use client'

import { useState, useCallback } from 'react'
import { Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MotionCard } from './motion-card'

interface Motion {
  id: string
  titel: string
  ledamot_namn?: string
  party?: string
  datum?: string
  quality_score?: number
  riksmote?: string
}

export function MotionSearch() {
  const [query, setQuery] = useState('')
  const [party, setParty] = useState<string>('')
  const [quality, setQuality] = useState<string>('')
  const [riksmote, setRiksmote] = useState<string>('')
  const [results, setResults] = useState<Motion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim() && !party && !quality && !riksmote) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (query) params.append('q', query)
      if (party) params.append('party', party)
      if (quality) params.append('quality', quality)
      if (riksmote) params.append('riksmote', riksmote)

      const res = await fetch(`/api/motioner/search?${params.toString()}`)
      if (!res.ok) throw new Error('Sökningen misslyckades')

      const data = await res.json()
      setResults(data.motions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query, party, quality, riksmote])

  const clearFilters = () => {
    setQuery('')
    setParty('')
    setQuality('')
    setRiksmote('')
    setResults([])
  }

  const hasActiveFilters = query.trim() || party || quality || riksmote

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4" role="search" aria-label="Sök motioner">
        <div className="relative flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sök motioner..."
              aria-label="Sökfält för motioner"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !hasActiveFilters}
            aria-label="Sök motioner"
            className="px-6"
          >
            {loading ? 'Söker...' : 'Sök'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            aria-label={showFilters ? 'Dölj filter' : 'Visa filter'}
            aria-expanded={showFilters}
            className="gap-2"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
            {/* Main Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-2">
                  Parti
                </label>
                <select
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alla partier</option>
                  <option value="Moderaterna">Moderaterna</option>
                  <option value="Socialdemokraterna">Socialdemokraterna</option>
                  <option value="Sverigedemokraterna">Sverigedemokraterna</option>
                  <option value="Vänsterpartiet">Vänsterpartiet</option>
                  <option value="Miljöpartiet">Miljöpartiet de gröna</option>
                  <option value="Centerpartiet">Centerpartiet</option>
                  <option value="Folkpartiet">Liberalerna</option>
                  <option value="Kristdemokraterna">Kristdemokraterna</option>
                  <option value="Piratpartiet">Piratpartiet</option>
                  <option value="Övriga">Övriga</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-2">
                  Motionkvalitet
                </label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alla kvaliteter</option>
                  <option value="7-10">Högt (7-10)</option>
                  <option value="5-6">Medel (5-6)</option>
                  <option value="0-4">Lågt (0-4)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-2">
                  Riksmöte
                </label>
                <select
                  value={riksmote}
                  onChange={(e) => setRiksmote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alla riksmöten</option>
                  <option value="2022/23">2022/23</option>
                  <option value="2023/24">2023/24</option>
                  <option value="2024/25">2024/25</option>
                </select>
              </div>
            </div>

            {/* Filter Tips */}
            <div className="text-xs text-neutral-600 dark:text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <p className="font-medium text-neutral-900 dark:text-neutral-50 mb-1">Filtreringstips:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Kombinera filter för mer preciserad sökning</li>
                <li>Använd både textsökning och filteralternativ tillsammans</li>
                <li>Kvalitetsfilter visar motioner baserade på AI-analys</li>
              </ul>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            {query.trim() && (
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm">
                Sökning: {query}
              </span>
            )}
            {party && (
              <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm">
                Parti: {party}
              </span>
            )}
            {quality && (
              <span className="px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm">
                Kvalitet: {quality}
              </span>
            )}
            {riksmote && (
              <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm">
                Riksmöte: {riksmote}
              </span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 underline"
            >
              Rensa alla
            </button>
          </div>
        )}
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            {results.length} resultat
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((motion) => (
              <MotionCard key={motion.id} motion={motion} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && hasActiveFilters && (
        <div className="text-center py-12">
          <p className="text-neutral-600 dark:text-neutral-400">
            Inga motioner hittades för din sökning
          </p>
        </div>
      )}

      {!loading && results.length === 0 && !error && !hasActiveFilters && (
        <div className="text-center py-12">
          <p className="text-neutral-600 dark:text-neutral-400">
            Börja skriva eller använd filter för att söka motioner
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <span className="font-semibold text-neutral-900 dark:text-neutral-50">
            Tips:
          </span>{' '}
          Använd filtren för att söka på specifika partier, kvalitetsintervall eller riksmöten.
          Du kan kombinera flera filter för en mer preciserad sökning.
        </p>
      </div>
    </div>
  )
}
