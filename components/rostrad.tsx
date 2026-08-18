import { PARTIER, PARTIFARG, ROSTFARG, ROSTTEXT, partilinje, type Linje, type Rost } from '@/lib/parti'

/**
 * Importerar från `lib/parti` och inte från `lib/db`.
 *
 * Filen används numera också inifrån quizet på `/rosta`, som är en
 * klientkomponent. Med den gamla importen hade hela `@supabase/supabase-js`
 * följt med in i webbläsarens bundle utan att någonsin anropas — vilket det
 * redan gjorde via `app/error.tsx` → `components/system.tsx` → `lib/db`, i
 * månader, utan att någon mätt det.
 */

/** Formen bor i `lib/parti` som `Rost`. Namnet står kvar; tio filer använder det. */
export type PartiRad = Rost

/**
 * Ett parti och dess linje som en etikett.
 *
 * Fyllningen är röstfärgen, understrykningen partifärgen — färgen bär alltså
 * två uppgifter utan att blandas ihop. Förkortningen står alltid utskriven, så
 * färgen aldrig är ensam bärare av innebörden.
 */
export function Linjeetikett({
  parti,
  linje,
  titel,
  kompakt = false,
  markering,
}: {
  parti: string
  linje: string
  titel?: string
  kompakt?: boolean
  /**
   * Ringmarkera etiketten, och säg i text varför.
   *
   * Ringen är en **upprepning**, aldrig den enda bäraren: texten läses av den
   * som inte ser färg. Se regel 1 i docs/DESIGN_GUIDELINES.md — färgen kodar
   * redan röst och parti, och en tredje betydelse i samma etikett måste
   * därför skrivas ut.
   *
   * Texten kommer utifrån och står inte här. Etiketten renderas på
   * /voteringar, /amnen, /fynd och /fragor, och quizets "röstade som du"
   * hade varit ett tilltal de fyra aldrig ber om.
   *
   * `outline` och inte `border`: kanten läggs utanpå och ändrar varken
   * etikettens mått eller radens brytpunkter, så mönstret av åtta etiketter
   * ser likadant ut med och utan markering.
   */
  markering?: string
}) {
  return (
    <span
      title={titel ?? `${parti}: ${linje}`}
      className={`tabular inline-block text-center font-bold ${
        kompakt
          ? 'min-w-[40px] rounded-[3px] px-1.5 py-1 text-[12px]'
          : 'min-w-[46px] rounded-[4px] px-2 py-1.5 text-[12.5px]'
      }`}
      style={{
        background: ROSTFARG[linje],
        color: ROSTTEXT[linje],
        boxShadow: `inset 0 -3px 0 ${PARTIFARG[parti] ?? 'transparent'}`,
        ...(markering ? { outline: '2px solid var(--accent)', outlineOffset: 2 } : {}),
      }}
    >
      {parti}
      {markering && <span className="sr-only"> — {markering}</span>}
    </span>
  )
}

/**
 * Partiernas linje i en votering, som en rad av etiketter.
 *
 * Poängen är att man ska kunna skanna en lista och se mönstret utan att läsa —
 * vilka som röstade lika.
 */
export function Rostrad({
  rader,
  kompakt = false,
  markera,
}: {
  rader: PartiRad[]
  kompakt?: boolean
  /**
   * Ringmarkera de partier som landade på `linje`, och förklara markeringen
   * med `text`. Utelämnas överallt utom i quizet, och raden ser då ut som förut.
   *
   * Bara `Ja` och `Nej` kan skickas in. Ett `Avstår` hade markerat de partier
   * som inte tog ställning som träffar, och att avstå är varken träff eller
   * miss — se `summera()` i lib/rostning.ts.
   */
  markera?: { linje: 'Ja' | 'Nej'; text: string }
}) {
  const karta = new Map(rader.map((r) => [r.parti, r]))
  return (
    <div className={`flex flex-wrap ${markera ? 'gap-2' : 'gap-1'}`}>
      {PARTIER.map((p) => {
        const r = karta.get(p)
        if (!r) {
          return (
            <span
              key={p}
              className={`tabular inline-block text-center font-medium opacity-40 ${
                kompakt
                  ? 'min-w-[40px] rounded-[3px] px-1.5 py-1 text-[12px]'
                  : 'min-w-[46px] rounded-[4px] px-2 py-1.5 text-[12.5px]'
              }`}
              style={{ border: '1px solid var(--linje-stark)' }}
            >
              {p}
            </span>
          )
        }
        const linje: Linje = partilinje(r)
        return (
          <Linjeetikett
            key={p}
            parti={p}
            linje={linje}
            kompakt={kompakt}
            markering={markera && linje === markera.linje ? markera.text : undefined}
            titel={`${p}: ${linje} (Ja ${r.ja}, Nej ${r.nej}, Avstår ${r.avstar}, Frånv. ${r.franvarande})`}
          />
        )
      })}
    </div>
  )
}

export function Rostnyckel() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-[12.5px]"
      style={{ color: 'var(--black-svag)' }}
    >
      {(['Ja', 'Nej', 'Avstår', 'Frånvarande'] as const).map((r) => (
        <span key={r} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-[2px]"
            style={{ background: ROSTFARG[r] }}
          />
          {r}
        </span>
      ))}
      <span>Understrykning = partifärg</span>
    </div>
  )
}
