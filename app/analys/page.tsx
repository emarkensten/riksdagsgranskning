import { Metadata } from 'next'
import { AnalysisDashboard } from '@/components/analysis/analysis-dashboard'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Analys | Riksdagsgranskning',
  description: 'Djupanalys av svenska parlamentariska motioner, frånvaro och retorik-handling-gap.',
}

export default function AnalysPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
            Djupanalys
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Utforska AI-drivna analyser av motionkvalitet, ledamöters frånvaro och kongruens mellan tal och handling.
          </p>
        </div>

        <Suspense fallback={<div className="text-neutral-400">Laddar...</div>}>
          <AnalysisDashboard />
        </Suspense>
      </div>
    </div>
  )
}
