import { Metadata } from 'next'
import { PartyComparison } from '@/components/parties/party-comparison'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Partier | Riksdagsgranskning',
  description: 'Jämför svenska partiers motionkvalitet och parlamentarisk aktivitet',
}

export default function PartiesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Suspense fallback={<div className="text-neutral-400">Laddar...</div>}>
          <PartyComparison />
        </Suspense>
      </div>
    </div>
  )
}
