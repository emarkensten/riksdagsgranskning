import { Metadata } from 'next'
import { MotionSearch } from '@/components/motions/motion-search'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Motioner | Riksdagsgranskning',
  description: 'Sök och jämför svenska parlamentariska motioner. Filtrera på parti, kvalitet och riksmöte.',
}

export default function MotionerPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
            Motioner
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Sök och analysera svenska parlamentariska motioner. Filtrera på parti, kvalitet och riksmöte för att hitta det du söker.
          </p>
        </div>

        <Suspense fallback={<div className="text-neutral-400">Laddar...</div>}>
          <MotionSearch />
        </Suspense>
      </div>
    </div>
  )
}
