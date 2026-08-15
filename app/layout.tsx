import type { Metadata } from 'next'
import { Instrument_Serif, IBM_Plex_Sans } from 'next/font/google'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import './globals.css'

const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})

const brod = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-brod',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Riksdagsgranskning — så röstade riksdagen',
  description:
    'Varje votering i Sveriges riksdag, förklarad på vanlig svenska. Byggt på öppna data från Sveriges riksdag.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${display.variable} ${brod.variable}`}>
      <body className="relative">
        <div className="relative z-[1] mx-auto max-w-5xl px-5 sm:px-8">
          {/* Stackad på mobil: fem navobjekt bredvid ordmärket tvingar fram
              radbrytning mitt i namnet. */}
          <header className="flex flex-col items-start gap-3 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <Link href="/" className="display shrink-0 text-xl tracking-tight">
              Riksdagsgranskning
            </Link>
            <Navigation />
          </header>
          {children}
          <footer
            className="regel mt-24 py-8 text-[13px] leading-relaxed"
            style={{ color: 'var(--black-svag)' }}
          >
            <p>
              Källa: Sveriges riksdags öppna data. Voteringarnas innebörd är
              sammanfattad automatiskt från utskottens förslag och reservationer —
              varje sammanfattning kan granskas mot originaltexten.
            </p>
          </footer>
        </div>
      </body>
    </html>
  )
}
