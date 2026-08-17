import type { Metadata } from 'next'
import { Schibsted_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Sidfot } from '@/components/sidfot'
import { SAJT, SAJT_URL, UNDERTITEL } from '@/lib/sajt'
import './globals.css'

/**
 * Två familjer, inte fler. Grotesken bär allt — rubriker, tal och brödtext —
 * och mono förekommer bara i 11,5-punktsetiketterna. Åttan behövs: hela
 * displayskalan sätts i 800.
 */
const brod = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-brod',
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

const TITEL = `${SAJT} — så röstade riksdagen`
const BESKRIVNING =
  `${UNDERTITEL} Mandatperioden 2022–2026, byggd på Sveriges riksdags öppna data.`

/**
 * `metadataBase` gör varje relativ og:image absolut. Utan den faller
 * delningsbilden bort helt hos den som läser förhandsvisningen — Next varnar i
 * konsolen, men bara i utveckling.
 *
 * openGraph och twitter ärvs av varje sida som inte sätter dem själv, så en ny
 * sida får rätt bild utan att göra något. De sidor som har en egen rubrik
 * skriver över `title` och `description`.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SAJT_URL),
  title: TITEL,
  description: BESKRIVNING,
  openGraph: {
    type: 'website',
    locale: 'sv_SE',
    siteName: SAJT,
    title: TITEL,
    description: BESKRIVNING,
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: TITEL, description: BESKRIVNING },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${brod.variable} ${mono.variable}`}>
      <body>
        {/* Först i DOM, alltså första tabbstoppet. Se .hoppa i globals.css för
            varför den göms med clip-path och inte med display:none. */}
        <a href="#innehall" className="hoppa">Hoppa till innehållet</a>

        {/* Hårlinjerna kring sidhuvud och sidfot går kant i kant med fönstret,
            precis som det mörka fältet. Ett halvt utbrott — till kolumnens
            ytterkant — hade bara sett ut som en felräkning. */}
        <div style={{ borderBottom: '1px solid var(--linje)' }}>
          {/* Ordmärket krymper aldrig: sju navobjekt bredvid det tvingar annars
              fram en radbrytning mitt i namnet. Under 640 px lindar navet till
              en egen rad i stället. */}
          <header className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-5 py-[22px] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8">
            <Link
              href="/"
              className="shrink-0 text-[17px] font-extrabold tracking-[-0.03em] transition-opacity duration-150 hover:opacity-70"
            >
              Riksdags<span style={{ color: 'var(--accent)' }}>kammaren</span>
            </Link>
            <Navigation />
          </header>
        </div>

        {/* tabIndex={-1} är inte kosmetik. Ett ankarmål som inte är fokuserbart
            scrollar bara — tangentbordsfokus står kvar där det var, och nästa
            Tab landar på navlänk nummer två igen. Det är så en hoppa-länk ser
            ut att fungera medan den inte gör det. */}
        <div id="innehall" tabIndex={-1} className="mx-auto max-w-5xl px-5 sm:px-8">
          {children}
        </div>

        <Sidfot />
      </body>
    </html>
  )
}
