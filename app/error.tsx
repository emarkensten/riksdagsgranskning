'use client'

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
    <main className="pb-10">
      <div className="regel-tjock pt-8">
        <p className="text-[13px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          Något gick fel
        </p>
        <h1 className="display mt-5 max-w-[16ch] text-[clamp(2.2rem,6vw,4rem)]">
          Sidan kunde inte hämta sina siffror<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <p className="mt-7 max-w-[52ch] text-[17px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Sajten visar hellre ingenting än ett tal den inte kan stå för. En
          fråga mot databasen svarade inte som den skulle, och sidan avbröt
          därför i stället för att rendera med luckor.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[14px]">
        <button
          onClick={reset}
          className="border-b pb-1 transition-opacity hover:opacity-60"
          style={{ borderColor: 'var(--accent)' }}
        >
          Försök igen
        </button>
        <a
          href="/"
          className="border-b pb-1 transition-opacity hover:opacity-60"
          style={{ borderColor: 'var(--linje)', color: 'var(--black-mjuk)' }}
        >
          Till startsidan
        </a>
        <a
          href="https://github.com/emarkensten/riksdagsgranskning/issues/new"
          target="_blank"
          rel="noreferrer"
          className="border-b pb-1 transition-opacity hover:opacity-60"
          style={{ borderColor: 'var(--linje)', color: 'var(--black-mjuk)' }}
        >
          Anmäl felet på GitHub
        </a>
      </div>
    </main>
  )
}
