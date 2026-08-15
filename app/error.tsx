'use client'

import { Etikett } from '@/components/system'
import { NYTT_ARENDE } from '@/lib/sajt'

/**
 * Felgränsen för hela sajten.
 *
 * Finns för att sidorna ska kunna kasta. Databasfrågorna går genom `rader()`
 * och `rakna()` i lib/db.ts, som läser `error` och kastar i stället för att
 * svara med tom lista — utan den här sidan blir varje sådant fel en
 * oformaterad 500 från Next.
 *
 * Formspråket gäller även här: ingen ursäkt, ingen hedge. Skriv vad som hände
 * och vad läsaren kan göra.
 */
export default function Fel({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="py-20">
      <Etikett ton="signal">Något gick fel</Etikett>
      <h1 className="rubrik mt-6 max-w-[16ch] text-[clamp(2rem,5vw,44px)]">
        Sidan kunde inte hämta sina siffror.
      </h1>
      <p className="mt-6 max-w-[52ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
        Sajten visar hellre ingenting än ett tal den inte kan stå för. En fråga
        mot databasen svarade inte som den skulle, och sidan avbröt därför i
        stället för att rendera med luckor.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          onClick={reset}
          className="rounded-full px-[26px] py-[15px] text-[15px] font-semibold transition-[filter] duration-150 hover:brightness-[0.94]"
          style={{ background: 'var(--accent)', color: '#ffffff' }}
        >
          Försök igen
        </button>
        <a
          href="/"
          className="rounded-full px-[26px] py-[15px] text-[15px] font-semibold transition-colors duration-150 hover:bg-[var(--papper-djup)]"
          style={{ border: '1px solid var(--linje-stark)' }}
        >
          Till startsidan
        </a>
        <a
          href={NYTT_ARENDE}
          target="_blank"
          rel="noreferrer"
          className="text-[14.5px] font-semibold transition-opacity duration-150 hover:opacity-70"
          style={{ color: 'var(--black-svag)' }}
        >
          Anmäl felet på GitHub
        </a>
      </div>
    </main>
  )
}
