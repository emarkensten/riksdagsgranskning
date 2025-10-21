'use client'

import { ChevronDown, X } from 'lucide-react'
import { useState } from 'react'

interface FilterConfig {
  id: string
  label: string
  type: 'select' | 'range' | 'checkbox'
  options?: Array<{ value: string; label: string }>
  min?: number
  max?: number
  step?: number
}

interface AdvancedFiltersProps {
  filters: FilterConfig[]
  onFilterChange: (filters: Record<string, any>) => void
  title?: string
}

export function AdvancedFilters({ filters, onFilterChange, title = 'Avancerade filter' }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})

  const handleFilterChange = (filterId: string, value: any) => {
    const updated = { ...activeFilters, [filterId]: value }
    setActiveFilters(updated)
    onFilterChange(updated)
  }

  const clearAllFilters = () => {
    setActiveFilters({})
    onFilterChange({})
  }

  const hasActiveFilters = Object.values(activeFilters).some((v) => v !== '' && v !== null && v !== undefined)

  return (
    <div className="space-y-3">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/30 text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <span className="font-medium">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Filters Panel */}
      {isOpen && (
        <div className="space-y-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
          {filters.map((filter) => (
            <div key={filter.id}>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-2">
                {filter.label}
              </label>

              {filter.type === 'select' && (
                <select
                  value={activeFilters[filter.id] || ''}
                  onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle</option>
                  {filter.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {filter.type === 'range' && (
                <div className="space-y-2">
                  <input
                    type="range"
                    min={filter.min || 0}
                    max={filter.max || 100}
                    step={filter.step || 1}
                    value={activeFilters[filter.id] || filter.min || 0}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full"
                  />
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    Värde: {activeFilters[filter.id] || filter.min || 0}
                  </div>
                </div>
              )}

              {filter.type === 'checkbox' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFilters[filter.id] || false}
                    onChange={(e) => handleFilterChange(filter.id, e.target.checked)}
                    className="rounded border-neutral-300 text-blue-600"
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Aktivera filter</span>
                </label>
              )}
            </div>
          ))}

          {/* Clear Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="w-full px-3 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              Rensa alla filter
            </button>
          )}
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          {Object.entries(activeFilters).map(([filterId, value]) => {
            if (!value || value === '') return null
            const filterConfig = filters.find((f) => f.id === filterId)
            if (!filterConfig) return null

            let displayValue = value
            if (filterConfig.type === 'select' && filterConfig.options) {
              const option = filterConfig.options.find((o) => o.value === value)
              displayValue = option?.label || value
            } else if (filterConfig.type === 'checkbox') {
              displayValue = value ? 'Aktiverad' : 'Inaktiverad'
            }

            return (
              <span
                key={filterId}
                className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm flex items-center gap-2"
              >
                {filterConfig.label}: {displayValue}
                <button
                  onClick={() => handleFilterChange(filterId, '')}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
