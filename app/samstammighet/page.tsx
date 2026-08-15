import Link from 'next/link'
import {
  db, heltal, lista, namn, rader, tal, PARTIER, PARTIFARG, REGERINGSPARTIERNA,
} from '@/lib/db'
import { Stapel } from '@/components/stapel'
import AMNEN from '@/lib/amnen.json'

// Ingen revalidate: sidan läser searchParams och renderas därför alltid
// dynamiskt. En deklaration här hade sett ut som en cache som inte finns.

export const metadata = {
  title: 'Vem röstar med vem — Riksdagsgranskning',
  description:
    'Hur ofta varje par av riksdagspartier landade på samma linje, mätt över alla voteringar med namnupprop 2022–2026.',
}

type Par = { parti_1: string; parti_2: string; gemensamma: number; lika: number; samstammighet: number }

async function hamta(amne: string) {
  // 28 partipar per ämne — långt under takgränsen, ingen paginering behövs.
  const data = await rader<Par>(
    db().from('partisamstammighet')
      .select('parti_1, parti_2, gemensamma, lika, samstammighet')
      .eq('amne', amne))

  const par = data
    .map((r) => ({ ...r, samstammighet: Number(r.samstammighet), lika: Number(r.lika), gemensamma: Number(r.gemensamma) }))
    .sort((a, b) => b.samstammighet - a.samstammighet)

  const karta = new Map<string, number>()
  for (const r of par) {
    karta.set(`${r.parti_1}|${r.parti_2}`, r.samstammighet)
    karta.set(`${r.parti_2}|${r.parti_1}`, r.samstammighet)
  }

  return { karta, par, gemensamma: par[0]?.gemensamma ?? 0 }
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
  const botten = par[par.length - 1]
  // Regeringsblockets inbördes par, räknade ur samma svar. Spannet skrivs ut
  // i stället för att stå som en formulering om samarbete — sajten redovisar
  // vad partierna gjorde, inte varför.
  const block = par.filter(
    (p) => REGERINGSPARTIERNA.some((r) => r === p.parti_1)
      && REGERINGSPARTIERNA.some((r) => r === p.parti_2))
    .map((p) => p.samstammighet)

  return (
    <main className="pb-10">
      <section className="regel-tjock pt-8">
        <p className="stig text-[13px] uppercase tracking-[0.18em]"
           style={{ color: 'var(--accent)', animationDelay: '0ms' }}>
          {valt === 'alla' ? 'Mandatperioden 2022–2026' : `Frågor om ${valt}`}
        </p>
        <h1 className="display stig mt-5 text-[clamp(2.4rem,7vw,4.6rem)]"
            style={{ animationDelay: '80ms' }}>
          Vem röstar med vem<span style={{ color: 'var(--accent)' }}>?</span>
        </h1>

        {topp && (
          <div className="stig mt-10" style={{ animationDelay: '160ms' }}>
            <div className="display tabular text-[clamp(3.2rem,13vw,7.5rem)] leading-[0.82]"
                 style={{ color: 'var(--accent)' }}>
              {heltal(topp.lika)}
            </div>
            <p className="mt-6 max-w-[46ch] text-[19px] leading-snug">
              av {heltal(topp.gemensamma)} voteringar röstade{' '}
              {namn(topp.parti_1)} och {namn(topp.parti_2)} lika
              {valt === 'alla' ? '' : ` i frågor om ${valt}`}.
              {topp.lika === topp.gemensamma
                ? ' Deras linjer gick aldrig isär.'
                : ` Det är ${tal(topp.samstammighet)} % — inget par röstade oftare lika.`}
            </p>
          </div>
        )}
      </section>

      <section className="regel mt-16 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Alla 28 par</h2>
        <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Andelen av {heltal(gemensamma)} voteringar där de två partierna hade
          samma linje. Ingen höger–vänsteraxel, ingen viktning, inget par valt i
          förväg.
        </p>

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

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[560px] table-fixed text-center text-[13px] sm:text-[15px]">
            <caption className="sr-only">
              Andel voteringar med samma linje, för varje par av partier.
            </caption>
            <thead>
              <tr>
                <th className="w-[9%]" />
                {PARTIER.map((p) => (
                  <th key={p} scope="col" className="pb-3 text-[12px] font-semibold sm:text-[13px]">
                    <span className="inline-flex flex-col items-center gap-1">
                      <span className="inline-block h-1 w-5 rounded-sm" aria-hidden
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
                  <th scope="row" className="py-1 pr-3 text-right text-[12px] font-semibold sm:text-[13px]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-1 rounded-sm" aria-hidden
                            style={{ background: PARTIFARG[rad] }} />
                      {rad}
                    </span>
                  </th>
                  {PARTIER.map((kol) => {
                    if (rad === kol) {
                      return (
                        <td key={kol} className="p-1">
                          <span className="block rounded-sm py-3 sm:py-5"
                                style={{ background: 'var(--papper-djup)' }}>—</span>
                        </td>
                      )
                    }
                    const v = karta.get(`${rad}|${kol}`)
                    return (
                      <td key={kol} className="p-1">
                        <span className="tabular block rounded-sm py-3 font-medium sm:py-5"
                              style={ruta(v)}
                              title={`${namn(rad)} och ${namn(kol)}: ${v === undefined ? 'saknas' : `${tal(v)} %`}`}>
                          {v === undefined ? '·' : heltal(v)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 max-w-[68ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          <strong style={{ color: 'var(--black)' }}>Samma linje</strong> betyder
          att båda partierna hamnade på samma alternativ — ja, nej eller avstår.
          Partiets linje är det alternativ flest av dess närvarande ledamöter
          valde, så enstaka ledamöter som röstar annorlunda ändrar den inte. Ett
          par som båda avstod räknas som eniga, eftersom avstår är ett
          ställningstagande och inte ett uteblivet svar. Färgen är accentskalan,
          inte partifärger: det är relationen som mäts, och ingen av parterna
          äger den.{' '}
          <Link href="/metod#definitioner" className="underline hover:opacity-60">
            Så räknas samstämmighet
          </Link>
        </p>
      </section>

      <section className="regel mt-16 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Paren, rangordnade</h2>
        {topp && botten && (
          <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
            Från {namn(topp.parti_1)} och {namn(topp.parti_2)} på{' '}
            {tal(topp.samstammighet)} % till {namn(botten.parti_1)} och{' '}
            {namn(botten.parti_2)} på {tal(botten.samstammighet)} %.
          </p>
        )}
        <table className="mt-7 w-full max-w-2xl text-[15px]">
          <tbody>
            {par.map((p) => (
              <tr key={`${p.parti_1}${p.parti_2}`} className="regel">
                <td className="py-2.5 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-3 w-1 rounded-sm" aria-hidden
                          style={{ background: PARTIFARG[p.parti_1] }} />
                    <Link href={`/partier/${p.parti_1.toLowerCase()}`} className="hover:opacity-60">
                      {p.parti_1}
                    </Link>
                    <span style={{ color: 'var(--black-svag)' }}>+</span>
                    <span className="inline-block h-3 w-1 rounded-sm" aria-hidden
                          style={{ background: PARTIFARG[p.parti_2] }} />
                    <Link href={`/partier/${p.parti_2.toLowerCase()}`} className="hover:opacity-60">
                      {p.parti_2}
                    </Link>
                  </span>
                </td>
                <td className="tabular py-2.5 pl-4 text-right" style={{ color: 'var(--black-svag)' }}>
                  {heltal(p.lika)}
                </td>
                <td className="tabular whitespace-nowrap py-2.5 pl-5 text-right font-semibold">
                  {tal(p.samstammighet)} %
                </td>
                <td className="hidden w-1/2 py-2.5 pl-5 sm:table-cell">
                  <Stapel andel={p.samstammighet} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-5 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Antalet voteringar med samma linje, av {heltal(gemensamma)}. Måttet
          säger vad partierna gjorde, inte varför — två partier kan rösta lika av
          rakt motsatta skäl.
          {block.length > 0 && (
            <>
              {' '}De tre inbördes paren bland {lista(REGERINGSPARTIERNA.map(namn))} ligger
              på {tal(Math.min(...block))}–{tal(Math.max(...block))} %, så ett
              fynd som namnger ett av dem gäller i praktiken alla tre.
            </>
          )}
        </p>
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
