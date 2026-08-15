import { PARTIER, PARTIFARG, ROSTFARG, partilinje } from '@/lib/db'

export type PartiRad = {
  parti: string
  ja: number
  nej: number
  avstar: number
  franvarande: number
}

/**
 * Partiernas linje i en votering, som en rad av etiketter.
 *
 * Partifärgen sitter i en smal ram, röstfärgen i fyllningen. Poängen är att
 * man ska kunna skanna en lista och se mönstret utan att läsa — vilka som
 * röstade lika.
 */
export function Rostrad({ rader }: { rader: PartiRad[] }) {
  const karta = new Map(rader.map((r) => [r.parti, r]))
  return (
    <div className="flex flex-wrap gap-1">
      {PARTIER.map((p) => {
        const r = karta.get(p)
        if (!r) {
          return (
            <span
              key={p}
              className="tabular w-9 rounded-sm py-0.5 text-center text-[11px] font-medium opacity-30"
              style={{ border: `1px solid var(--linje)` }}
            >
              {p}
            </span>
          )
        }
        const linje = partilinje(r)
        return (
          <span
            key={p}
            title={`${p}: ${linje} (Ja ${r.ja}, Nej ${r.nej}, Avstår ${r.avstar}, Frånv. ${r.franvarande})`}
            className="tabular w-9 rounded-sm py-0.5 text-center text-[11px] font-semibold text-white"
            style={{
              background: ROSTFARG[linje],
              boxShadow: `inset 0 -2px 0 ${PARTIFARG[p]}`,
            }}
          >
            {p}
          </span>
        )
      })}
    </div>
  )
}

export function Rostnyckel() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]"
      style={{ color: 'var(--black-svag)' }}
    >
      {(['Ja', 'Nej', 'Avstår', 'Frånvarande'] as const).map((r) => (
        <span key={r} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: ROSTFARG[r] }}
          />
          {r}
        </span>
      ))}
      <span className="opacity-70">· understrykning = partifärg</span>
    </div>
  )
}
