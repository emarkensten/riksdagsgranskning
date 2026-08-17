'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Fyra objekt, inte sju.
 *
 * `/amnen`, `/samstammighet`, `/blocken` och `/franvaro` låg här fram till
 * vändningen och nås nu från `/fynd`, som samlar dem under rubriken "Hela
 * genomgången". Sidorna finns kvar oförändrade på sina adresser — det som
 * ändrades är vad navigeringen påstår att sajten är. Sju genomgångar överst
 * säger "statistikmagasin"; sökningen och fynden säger "verktyg".
 */
const SIDOR = [
  { href: '/', text: 'Besluten' },
  { href: '/fynd', text: 'Fynd' },
  { href: '/partier', text: 'Partier' },
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
        // Roten kräver exakt träff. Prefixregeln nedan matchar '/' mot varje
        // sökväg som finns, så utan undantaget hade "Besluten" stått markerad
        // på hela sajten samtidigt som den riktiga sidan också var det.
        const aktiv = s.href === '/'
          ? sokvag === '/'
          : sokvag === s.href || sokvag?.startsWith(`${s.href}/`)
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
