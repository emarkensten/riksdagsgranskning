'use client'

import Link from 'next/link'

export function Navigation() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-semibold tracking-tight">
          Riksdagsgranskning
        </Link>
      </nav>
    </header>
  )
}
