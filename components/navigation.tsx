'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SIDOR = [
  { href: '/amnen', text: 'Ämnen' },
  { href: '/samstammighet', text: 'Vem röstar med vem' },
  { href: '/voteringar', text: 'Voteringar' },
  { href: '/franvaro', text: 'Frånvaro' },
  { href: '/spanningar', text: 'Metod' },
]

export function Navigation() {
  const sokvag = usePathname()
  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] uppercase tracking-[0.14em]">
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
