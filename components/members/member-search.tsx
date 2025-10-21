'use client'

import { useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MemberCard } from './member-card'

interface Member {
  id: string
  name: string
  party: string
  district: string
  role?: string
}

export function MemberSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/ledamoter/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Sökningen misslyckades')

      const data = await res.json()
      setResults(data.members || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query])

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4" role="search" aria-label="Sök ledamöter">
        <div className="relative flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sök ledamöter..."
              aria-label="Sökfält för ledamöter"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            aria-label="Sök ledamöter"
            className="px-6"
          >
            {loading ? 'Söker...' : 'Sök'}
          </Button>
        </div>

        {/* Filters (placeholder) */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Filter:</span>
          <button className="text-sm px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors">
            Alla partier
          </button>
          <button className="text-sm px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors">
            Alla distrikt
          </button>
        </div>
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
            {results.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && query.trim() && (
        <div className="text-center py-12">
          <p className="text-neutral-600 dark:text-neutral-400">
            Inga ledamöter hittades för &quot;{query}&quot;
          </p>
        </div>
      )}

      {!loading && results.length === 0 && !error && !query.trim() && (
        <div className="text-center py-12">
          <p className="text-neutral-600 dark:text-neutral-400">
            Börja skriva för att söka ledamöter
          </p>
        </div>
      )}
    </div>
  )
}
