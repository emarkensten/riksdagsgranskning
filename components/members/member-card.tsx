import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface Member {
  id: string
  name: string
  party: string
  district: string
  role?: string
}

export function MemberCard({ member }: { member: Member }) {
  return (
    <Link href={`/medlemmar/${member.id}`}>
      <div className="group p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md dark:hover:shadow-lg transition-all duration-200 cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
              {member.name}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {member.party}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100" />
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">Distrikt:</span>
            <span className="text-neutral-900 dark:text-neutral-50 font-medium">
              {member.district}
            </span>
          </div>
          {member.role && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">Roll:</span>
              <span className="px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                {member.role}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-4" />

        {/* Stats (placeholder) */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-neutral-600 dark:text-neutral-400">Röster</p>
            <p className="font-semibold text-neutral-900 dark:text-neutral-50">--</p>
          </div>
          <div>
            <p className="text-neutral-600 dark:text-neutral-400">Motioner</p>
            <p className="font-semibold text-neutral-900 dark:text-neutral-50">--</p>
          </div>
          <div>
            <p className="text-neutral-600 dark:text-neutral-400">Frånvaro</p>
            <p className="font-semibold text-neutral-900 dark:text-neutral-50">--</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
