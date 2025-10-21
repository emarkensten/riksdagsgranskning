import { Metadata } from 'next'
import { MemberSearch } from '@/components/members/member-search'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Medlemmar | Riksdagsgranskning',
  description: 'Sök och jämför ledamöter från svenska riksdagen',
}

export default function MembersPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
            Ledamöter
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Sök och utforska ledamöter från svenska riksdagen. Visa deras rösthistorik,
            motioner och retorisk analys.
          </p>
        </div>

        {/* Search Section */}
        <Suspense fallback={<div className="text-neutral-400">Laddar...</div>}>
          <MemberSearch />
        </Suspense>
      </div>
    </div>
  )
}
