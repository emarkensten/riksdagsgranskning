import type { Metadata } from 'next'
import { Schibsted_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Hamtat } from '@/components/hamtat'
import { AVSANDARE, REPO, SAJT, SAJT_URL, UNDERTITEL } from '@/lib/sajt'
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

const FOTLANKAR = [
  { href: '/om', text: 'Om sajten' },
  { href: '/metod', text: 'Metod' },
  { href: '/metod#begransningar', text: 'Begränsningar' },
  { href: REPO, text: 'Källkod' },
  { href: 'https://data.riksdagen.se', text: 'Riksdagens öppna data' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${brod.variable} ${mono.variable}`}>
      <body>
        {/* Hårlinjerna kring sidhuvud och sidfot går kant i kant med fönstret,
            precis som det mörka fältet. Ett halvt utbrott — till kolumnens
            ytterkant — hade bara sett ut som en felräkning. */}
        <div style={{ borderBottom: '1px solid var(--linje)' }}>
          {/* Ordmärket krymper aldrig: sex navobjekt bredvid det tvingar annars
              fram en radbrytning mitt i namnet. Under 640 px lindar navet till
              en egen rad i stället. */}
          <header className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-5 py-[22px] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8">
            <Link
              href="/"
              className="shrink-0 text-[17px] font-extrabold tracking-[-0.03em] transition-opacity duration-150 hover:opacity-70"
            >
              Namn<span style={{ color: 'var(--accent)' }}>upprop</span>
            </Link>
            <Navigation />
          </header>
        </div>

        <div className="mx-auto max-w-5xl px-5 sm:px-8">{children}</div>

        <div className="mt-24" style={{ borderTop: '1px solid var(--linje)' }}>
          <footer className="mx-auto flex max-w-5xl flex-col justify-between gap-6 px-5 py-10 sm:flex-row sm:gap-10 sm:px-8">
            {/* Avsändaren står i sidfoten och inte bara på /om: frågan "vem
                ligger bakom det här?" ställs på den sida läsaren råkar stå på,
                och ska ha ett svar där. */}
            <div className="max-w-[60ch] text-[13.5px] leading-relaxed">
              <p style={{ color: 'var(--black-svag)' }}>
                Källa: Sveriges riksdags öppna data. Voteringarnas innebörd är
                sammanfattad automatiskt från utskottens förslag och reservationer —
                varje sammanfattning kan granskas mot originaltexten.
                <Hamtat />
              </p>
              {/* Ingen länk i meningen: länkraden intill bär redan "Om sajten",
                  och två likadana mål i samma sidfot är brus. */}
              <p className="mt-3" style={{ color: 'var(--black-svag)' }}>
                {SAJT} är en privat sajt av {AVSANDARE}, utan koppling till
                Sveriges riksdag och utan finansiering, partiuppdrag eller
                annonser.
              </p>
            </div>
            <nav className="flex shrink-0 flex-wrap gap-5 text-[13.5px] font-medium">
              {FOTLANKAR.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="transition-opacity duration-150 hover:opacity-70"
                >
                  {l.text}
                </Link>
              ))}
            </nav>
          </footer>
        </div>
      </body>
    </html>
  )
}
