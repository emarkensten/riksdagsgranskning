import { db, PARTIER, PARTIFARG, tal } from '@/lib/db'
import AMNEN from '@/lib/amnen.json'
import Link from 'next/link'

export const revalidate = 3600

async function hamta(amne: string) {
  const { data, error } = await db()
    .from('partisamstammighet')
    .select('parti_1, parti_2, gemensamma, lika, samstammighet')
    .eq('amne', amne)
    .range(0, 999)
  if (error) throw new Error(error.message)

  const karta = new Map<string, number>()
  for (const r of data ?? []) {
    karta.set(`${r.parti_1}|${r.parti_2}`, Number(r.samstammighet))
    karta.set(`${r.parti_2}|${r.parti_1}`, Number(r.samstammighet))
  }
  const gemensamma = (data ?? [])[0]?.gemensamma ?? 0
  const par = (data ?? [])
    .map((r) => ({ ...r, samstammighet: Number(r.samstammighet) }))
    .sort((a, b) => b.samstammighet - a.samstammighet)
  return { karta, par, gemensamma }
}

/** Färgskala från neutral till accent. Inga partifärger — det är relationen som mäts. */
function ruta(v: number | undefined) {
  if (v === undefined) return { background: 'transparent', color: 'var(--black-svag)' }
  const t = Math.max(0, (v - 40) / 60)
  return {
    background: `color-mix(in oklab, var(--accent) ${Math.round(t * 88)}%, var(--papper-djup))`,
    color: t > 0.55 ? 'var(--papper)' : 'var(--black-mjuk)',
  }
}

export default async function Samstammighet({
  searchParams,
}: {
  searchParams: Promise<{ amne?: string }>
}) {
  const { amne } = await searchParams
  const valt = amne && AMNEN.includes(amne) ? amne : 'alla'
  const { karta, par, gemensamma } = await hamta(valt)

  const topp = par[0]

  return (
    <main className="pb-10">
      <div className="regel-tjock pt-8">
        <p className="text-[13px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          Mandatperioden 2022–2026
        </p>
        <h1 className="display mt-4 text-[clamp(2.2rem,6vw,4rem)]">Vem röstar med vem</h1>
        <p className="mt-5 max-w-[56ch] text-[16px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Hur ofta två partier landade i samma linje, räknat på{' '}
          {gemensamma.toLocaleString('sv-SE')} voteringar. Ingen höger–vänsteraxel,
          ingen tolkning — bara hur de faktiskt röstade.
        </p>

        {topp && valt === 'alla' && (
          <p className="mt-6 max-w-[56ch] border-l-2 py-3 pl-4 text-[16px] leading-relaxed"
             style={{ borderColor: 'var(--accent)' }}>
            <strong>{topp.parti_1} och {topp.parti_2} röstade lika i{' '}
            {topp.lika.toLocaleString('sv-SE')} av {topp.gemensamma.toLocaleString('sv-SE')}{' '}
            voteringar</strong> — {tal(topp.samstammighet)} % av hela mandatperioden.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-1.5">
        <Amnesknapp href="/samstammighet" text="alla ämnen" aktiv={valt === 'alla'} />
        {AMNEN.map((a) => (
          <Amnesknapp
            key={a}
            href={`/samstammighet?amne=${encodeURIComponent(a)}`}
            text={a}
            aktiv={valt === a}
          />
        ))}
      </div>

      <section className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[560px] text-center text-[13px]">
          <thead>
            <tr>
              <th />
              {PARTIER.map((p) => (
                <th key={p} className="pb-2 text-[12px] font-semibold">
                  <span className="inline-flex flex-col items-center gap-1">
                    <span className="inline-block h-1 w-4 rounded-sm"
                          style={{ background: PARTIFARG[p] }} />
                    {p}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PARTIER.map((rad) => (
              <tr key={rad}>
                <th className="py-1 pr-3 text-right text-[12px] font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-3 w-1 rounded-sm"
                          style={{ background: PARTIFARG[rad] }} />
                    {rad}
                  </span>
                </th>
                {PARTIER.map((kol) => {
                  if (rad === kol) {
                    return <td key={kol} className="p-1">
                      <span className="block rounded-sm py-2" style={{ background: 'var(--papper-djup)' }}>—</span>
                    </td>
                  }
                  const v = karta.get(`${rad}|${kol}`)
                  return (
                    <td key={kol} className="p-1">
                      <span className="tabular block rounded-sm py-2 font-medium" style={ruta(v)}>
                        {v === undefined ? '·' : v.toFixed(0)}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[12px]" style={{ color: 'var(--black-svag)' }}>
          Andel voteringar där partierna hade samma linje, i procent.
        </p>
      </section>

      <section className="regel mt-14 pt-7">
        <h2 className="display text-2xl">Paren, rangordnade</h2>
        <p className="mt-2 text-[13px]" style={{ color: 'var(--black-svag)' }}>
          Samtliga {par.length} partipar, från mest till minst samstämmiga.
        </p>
        <table className="mt-5 w-full max-w-xl text-[14px]">
          <tbody>
            {par.map((p) => (
              <tr key={`${p.parti_1}${p.parti_2}`} className="regel">
                <td className="py-2 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-3 w-1 rounded-sm" style={{ background: PARTIFARG[p.parti_1] }} />
                    {p.parti_1}
                    <span style={{ color: 'var(--black-svag)' }}>+</span>
                    <span className="inline-block h-3 w-1 rounded-sm" style={{ background: PARTIFARG[p.parti_2] }} />
                    {p.parti_2}
                  </span>
                </td>
                <td className="tabular py-2 text-right" style={{ color: 'var(--black-svag)' }}>
                  {p.lika} / {p.gemensamma}
                </td>
                <td className="tabular py-2 pl-6 text-right font-semibold">
                  {tal(p.samstammighet)} %
                </td>
                <td className="w-1/3 py-2 pl-4">
                  <span className="block h-1.5 rounded-sm" style={{
                    width: `${p.samstammighet}%`, background: 'var(--accent)', minWidth: '2px',
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}

function Amnesknapp({ href, text, aktiv }: { href: string; text: string; aktiv: boolean }) {
  return (
    <Link
      href={href}
      className="rounded-sm px-2.5 py-1 text-[12px] transition-opacity hover:opacity-70"
      style={{
        background: aktiv ? 'var(--black)' : 'transparent',
        color: aktiv ? 'var(--papper)' : 'var(--black-mjuk)',
        border: `1px solid ${aktiv ? 'var(--black)' : 'var(--linje)'}`,
      }}
    >
      {text}
    </Link>
  )
}
