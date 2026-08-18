'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Sex objekt, inte sju.
 *
 * `/amnen`, `/samstammighet`, `/blocken` och `/franvaro` låg här fram till
 * vändningen och nås nu från `/fynd`, som samlar dem under rubriken "Hela
 * genomgången". Sidorna finns kvar oförändrade på sina adresser — det som
 * ändrades är vad navigeringen påstår att sajten är. Sju genomgångar överst
 * säger "statistikmagasin"; sökningen och fynden säger "verktyg".
 */
const SIDOR = [
  { href: '/', text: 'Besluten' },
  // Näst efter sökningen, inte sist. Frågesidorna är sajtens enda yta som
  // möter läsaren i hens egna ord i stället för i kammarens, och de är det
  // enda som är byggt för valet snarare än för mandatperioden.
  { href: '/fragor', text: 'Valfrågor' },
  /*
    Quizet, intill frågesidorna. De två är sajtens valytor och läses som ett par.

    Nedskärningen till fem var rätt, och det här är undantaget: `/rosta` nåddes
    bara från en rad högst upp på startsidan, alltså var den enda yta som är
    byggd för valet osynlig från de sju andra sidorna.

    Permanent och inte "fram till valdagen", som designen föreslog. Sidorna
    renderas statiskt, så ett datumvillkor här hade jämförts vid bygget på
    servern och vid laddningen i webbläsaren — två olika tidpunkter, alltså en
    hydreringsavvikelse just den dag villkoret slår om. Och quizet slutar inte
    vara sant efter valet: det visar hur partierna faktiskt röstade. Ska det
    bort är det en rad härifrån.
  */
  { href: '/rosta', text: 'Rösta' },
  { href: '/fynd', text: 'Fynd' },
  { href: '/partier', text: 'Partier' },
  { href: '/metod', text: 'Metod' },
]

/**
 * Pillernavigering. Aktiv sida = fylld bläck, resten dämpad text.
 *
 * Aktiv sida härleds ur sökvägen, inte ur en prop: /partier/v ska markera
 * Partier utan att partisidan behöver veta om navigeringen.
 *
 * `.navremsa` och inte `flex-wrap`: under 640 px låg navet på egen rad under
 * ordmärket och lindade till två rader, och med ett sjätte pill hade det blivit
 * tre. Nu är det en remsa som blöder ut till kanten, med samma svepgest som
 * filtren och valfrågorna. Över 640 px lindar den som förut. Varför den inte
 * återanvänder `.remsa` rakt av står i globals.css — kort: navet är ett
 * flexbarn och behöver `align-self: stretch`, och utbrottet får inte följa med
 * upp i `justify-between`-raden.
 */
export function Navigation() {
  const sokvag = usePathname()
  return (
    <nav className="navremsa text-[13.5px] font-medium">
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
            // shrink-0 och nowrap av samma skäl som i `Chip`: i remsan pressas
            // pillren annars ihop till stumpar i stället för att skjutas
            // utanför kanten. `traffyta` ger 44 px höjd på pekskärm.
            className={`traffyta shrink-0 whitespace-nowrap rounded-full px-[14px] py-[7px] transition-colors duration-150 ${
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
