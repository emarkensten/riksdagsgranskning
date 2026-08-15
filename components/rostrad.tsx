import { PARTIER, PARTIFARG, ROSTFARG, ROSTTEXT, partilinje } from '@/lib/db'

export type PartiRad = {
  parti: string
  ja: number
  nej: number
  avstar: number
  franvarande: number
}

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
}: {
  parti: string
  linje: string
  titel?: string
  kompakt?: boolean
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
      }}
    >
      {parti}
    </span>
  )
}

/**
 * Partiernas linje i en votering, som en rad av etiketter.
 *
 * Poängen är att man ska kunna skanna en lista och se mönstret utan att läsa —
 * vilka som röstade lika.
 */
export function Rostrad({ rader, kompakt = false }: { rader: PartiRad[]; kompakt?: boolean }) {
  const karta = new Map(rader.map((r) => [r.parti, r]))
  return (
    <div className="flex flex-wrap gap-1">
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
        const linje = partilinje(r)
        return (
          <Linjeetikett
            key={p}
            parti={p}
            linje={linje}
            kompakt={kompakt}
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
