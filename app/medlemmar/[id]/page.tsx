import { Metadata } from 'next'
import { MemberDetail } from '@/components/members/member-detail'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Medlem | Riksdagsgranskning',
  description: 'Detaljerad information om en parlamentariker, inklusive röstmönster, motioner och analyser',
}

export default function MemberPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Suspense fallback={<div className="text-neutral-400">Laddar medlem...</div>}>
          <MemberDetail memberId={params.id} />
        </Suspense>
      </div>
    </div>
  )
}
