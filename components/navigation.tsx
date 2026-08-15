'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SIDOR = [
  // Partier först — det är den ingång flest söker.
  { href: '/partier', text: 'Partier' },
  { href: '/amnen', text: 'Ämnen' },
  { href: '/samstammighet', text: 'Vem röstar med vem' },
  { href: '/voteringar', text: 'Voteringar' },
  { href: '/franvaro', text: 'Frånvaro' },
  { href: '/metod', text: 'Metod' },
]

/**
 * Pillernavigering. Aktiv sida = fylld bläck, resten dämpad text.
 *
 * Aktiv sida härleds ur sökvägen, inte ur en prop: /partier/v ska markera
 * Partier utan att partisidan behöver veta om navigeringen.
 */
export function Navigation() {
  const sokvag = usePathname()
  return (
    <nav className="-mx-1.5 flex flex-wrap gap-1.5 text-[13.5px] font-medium">
      {SIDOR.map((s) => {
        const aktiv = sokvag === s.href || sokvag?.startsWith(`${s.href}/`)
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={aktiv ? 'page' : undefined}
            className={`rounded-full px-[14px] py-[7px] transition-colors duration-150 ${
              aktiv ? '' : 'hover:bg-[var(--papper-djup)] hover:text-[var(--black)]'
            }`}
            style={
              aktiv
                ? { background: 'var(--black)', color: 'var(--papper)' }
                : { color: 'var(--black-svag)' }
            }
          >
            {s.text}
          </Link>
        )
      })}
    </nav>
  )
}
