import type { Metadata } from 'next'
import { Schibsted_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
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

export const metadata: Metadata = {
  title: 'Namnupprop — så röstade riksdagen',
  description:
    'Varje votering i riksdagen, på vanlig svenska. Mandatperioden 2022–2026, byggd på Sveriges riksdags öppna data.',
}

const FOTLANKAR = [
  { href: '/metod', text: 'Metod' },
  { href: '/metod#begransningar', text: 'Begränsningar' },
  { href: 'https://data.riksdagen.se', text: 'Om data' },
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
            <p
              className="max-w-[60ch] text-[13.5px] leading-relaxed"
              style={{ color: 'var(--black-svag)' }}
            >
              Källa: Sveriges riksdags öppna data. Voteringarnas innebörd är
              sammanfattad automatiskt från utskottens förslag och reservationer —
              varje sammanfattning kan granskas mot originaltexten.
            </p>
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
