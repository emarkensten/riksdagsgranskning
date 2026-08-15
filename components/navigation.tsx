'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SIDOR = [
  { href: '/voteringar', text: 'Voteringar' },
  { href: '/spanningar', text: 'Sagt mot röstat' },
  { href: '/franvaro', text: 'Frånvaro' },
]

export function Navigation() {
  const sokvag = usePathname()
  return (
    <nav className="flex gap-5 text-[13px] uppercase tracking-[0.14em]">
      {SIDOR.map((s) => {
        const aktiv = sokvag?.startsWith(s.href)
        return (
          <Link
            key={s.href}
            href={s.href}
            className="border-b pb-0.5 transition-colors"
            style={{
              color: aktiv ? 'var(--black)' : 'var(--black-mjuk)',
              borderColor: aktiv ? 'var(--accent)' : 'transparent',
            }}
          >
            {s.text}
          </Link>
        )
      })}
    </nav>
  )
}
