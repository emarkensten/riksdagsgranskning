import Link from 'next/link'
import { db, heltal, lista, namn, rader, tal, PARTIER, REGERINGSPARTIERNA } from '@/lib/db'
import { Stapel } from '@/components/stapel'
import { Chip, Etikett, Forbehall, Nyckeltal } from '@/components/system'
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

  // Största värdet, inte första radens. Alla par delar nämnare så länge varje
  // parti har en linje i varje votering — men listan är sorterad på
  // samstämmighet, och att läsa ett annat fält ur dess topp gör talet beroende
  // av en sortering det inte har med att göra.
  const gemensamma = par.length ? Math.max(...par.map((p) => p.gemensamma)) : 0

  return { karta, par, gemensamma }
}

/**
 * Mättnadsskalan. Golvet läses ur urvalet i stället för att stå som en
 * konstant: i ett ämne där ingen ligger under 60 % vore en skala som börjar på
 * 36 % nästan tom, och alla rutor hade sett likadana ut.
 *
 * Inga partifärger — det är relationen som mäts, och ingen av parterna äger
 * den.
 */
function mattnad(v: number, golv: number) {
  const t = 0.1 + 0.9 * Math.max(0, Math.min(1, (v - golv) / Math.max(1, 100 - golv)))
  return {
    background: `color-mix(in oklab, var(--accent) ${Math.round(t * 100)}%, var(--papper-djup))`,
    color: t > 0.62 ? 'var(--papper)' : 'var(--black-mjuk)',
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
  const golv = Math.floor(botten?.samstammighet ?? 36)
  // Regeringsblockets inbördes par, räknade ur samma svar. Spannet skrivs ut
  // i stället för att stå som en formulering om samarbete — sajten redovisar
  // vad partierna gjorde, inte varför.
  const block = par.filter(
    (p) => REGERINGSPARTIERNA.some((r) => r === p.parti_1)
      && REGERINGSPARTIERNA.some((r) => r === p.parti_2))
    .map((p) => p.samstammighet)

  return (
    <main>
      <section className="pb-8 pt-16">
        <Etikett className="stig" ton="signal">
          {valt === 'alla' ? 'Mandatperioden 2022–2026' : `Frågor om ${valt}`}
        </Etikett>
        <h1 className="display stig mt-6 text-[clamp(2.4rem,7vw,72px)]" style={{ animationDelay: '80ms' }}>
          Vem röstar med vem?
        </h1>
        <p className="stig mt-6 max-w-[54ch] text-[19px] leading-[1.5]"
           style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}>
          Alla {heltal(par.length)} partipar, mätta på samma sätt över{' '}
          {heltal(gemensamma)} voteringar. Mättnaden visar hur ofta paret hamnade
          på samma linje — partifärger används inte, eftersom ingen av parterna
          äger relationen.
        </p>
      </section>

      {topp && (
        <section className="grid gap-y-6 border-y py-11 md:grid-cols-[auto_1fr] md:items-end md:gap-x-10"
                 style={{ borderColor: 'var(--linje)' }}>
          <Nyckeltal>{heltal(topp.lika)}</Nyckeltal>
          <p className="max-w-[46ch] pb-2 text-[18px] leading-[1.5]" style={{ color: 'var(--black-mjuk)' }}>
            av {heltal(topp.gemensamma)} voteringar röstade {namn(topp.parti_1)} och{' '}
            {namn(topp.parti_2)} lika{valt === 'alla' ? '' : ` i frågor om ${valt}`}.
            {topp.lika === topp.gemensamma
              ? ' Deras linjer gick aldrig isär.'
              : ` Det är ${tal(topp.samstammighet)} % — inget par röstade oftare lika.`}
          </p>
        </section>
      )}

      <section className="py-12">
        <div className="flex flex-wrap gap-2">
          <Chip href="/samstammighet" aktiv={valt === 'alla'}>Alla ämnen</Chip>
          {[...AMNEN].sort((a, b) => a.localeCompare(b, 'sv')).map((a) => (
            <Chip
              key={a}
              href={`/samstammighet?amne=${encodeURIComponent(a)}`}
              aktiv={valt === a}
            >
              {a}
            </Chip>
          ))}
        </div>

        {/*
          Riktig tabell, inte ett rutnät av div:ar.

          Åtta gånger åtta nakna tal är det enda ställe på sajten där
          kopplingen rad–kolumn måste finnas i markupen: utan `scope` läser en
          skärmläsare upp "44,1" utan att säga vilka två partier det gäller.
          Designens 4 px mellanrum blir `border-spacing`, som tabeller kan.

          Aldrig horisontell sidscroll — behållaren scrollar i stället, med
          720 px som minsta bredd.
        */}
        <div className="mt-10 overflow-x-auto">
          <table
            className="w-full min-w-[720px] table-fixed"
            style={{ borderCollapse: 'separate', borderSpacing: 4 }}
          >
            <caption className="sr-only">
              Andel voteringar där de två partierna hade samma linje.
            </caption>
            <thead>
              <tr>
                <th className="w-14" />
                {PARTIER.map((p) => (
                  <th key={p} scope="col" className="pb-1.5 text-[13px] font-bold">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PARTIER.map((rad) => (
                <tr key={rad}>
                  <th scope="row" className="text-left text-[13px] font-bold">{rad}</th>
                  {PARTIER.map((kol) => {
                    if (rad === kol) {
                      return (
                        <td key={kol} className="h-[60px] rounded-[3px]"
                            style={{ background: 'var(--papper-djup)' }} />
                      )
                    }
                    const v = karta.get(`${rad}|${kol}`)
                    if (v === undefined) {
                      return (
                        <td key={kol}
                            className="h-[60px] rounded-[3px] text-center text-[14px]"
                            style={{ background: 'var(--papper-djup)', color: 'var(--black-svag)' }}>
                          ·
                        </td>
                      )
                    }
                    return (
                      <td
                        key={kol}
                        className="tabular h-[60px] rounded-[3px] text-center text-[14px] font-bold"
                        style={mattnad(v, golv)}
                      >
                        {tal(v)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Etikett>Skala</Etikett>
          <span aria-hidden className="flex h-3 w-[260px] overflow-hidden rounded-[2px]">
            {[0.1, 0.32, 0.55, 0.78, 1].map((t) => (
              <span
                key={t}
                className="flex-1"
                style={{ background: `color-mix(in oklab, var(--accent) ${t * 100}%, var(--papper-djup))` }}
              />
            ))}
          </span>
          <span className="tabular text-[13px]" style={{ color: 'var(--black-svag)' }}>
            {golv} % → 100 %
          </span>
        </div>

        <Forbehall rubrik="Samma linje, inte samma åsikt." className="mt-7">
          Måttet räknar hur ofta partiernas majoritetslinje sammanföll i samma
          votering. Partiets linje är det alternativ flest av dess närvarande
          ledamöter valde, så enstaka avvikande ledamöter ändrar den inte. Ett
          par som båda avstod räknas som eniga — avstår är ett ställningstagande,
          inte ett uteblivet svar. Två partier kan rösta lika av rakt motsatta
          skäl.
        </Forbehall>
      </section>

      <section className="regel py-16">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">Paren, rangordnade</h2>
          {topp && botten && (
            <p className="max-w-[46ch] text-[14.5px] sm:text-right" style={{ color: 'var(--black-mjuk)' }}>
              Från {namn(topp.parti_1)} och {namn(topp.parti_2)} på{' '}
              {tal(topp.samstammighet)} % till {namn(botten.parti_1)} och{' '}
              {namn(botten.parti_2)} på {tal(botten.samstammighet)} %.
            </p>
          )}
        </div>

        <div className="mt-7">
          {par.map((p) => (
            <div
              key={`${p.parti_1}${p.parti_2}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 py-3.5 sm:grid-cols-[minmax(150px,200px)_96px_1fr_80px]"
              style={{ borderBottom: '1px solid var(--linje)' }}
            >
              <span className="flex items-center gap-2 text-[16px] font-bold sm:text-[17px]">
                <Link href={`/partier/${p.parti_1.toLowerCase()}`} className="hover:opacity-70">
                  {p.parti_1}
                </Link>
                <span style={{ color: 'var(--black-svag)' }}>+</span>
                <Link href={`/partier/${p.parti_2.toLowerCase()}`} className="hover:opacity-70">
                  {p.parti_2}
                </Link>
              </span>
              <span className="tabular text-right text-[16px] font-bold sm:text-left sm:text-[19px]">
                {tal(p.samstammighet)} %
              </span>
              <span className="hidden sm:block">
                <Stapel andel={p.samstammighet} />
              </span>
              <span className="tabular col-span-2 text-[15px] sm:col-span-1 sm:text-right"
                    style={{ color: 'var(--black-svag)' }}>
                {heltal(p.lika)} st
              </span>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-[64ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
          Antalet voteringar med samma linje, av {heltal(gemensamma)}.
          {block.length > 0 && (
            <>
              {' '}De tre inbördes paren bland {lista(REGERINGSPARTIERNA.map(namn))} ligger
              på {tal(Math.min(...block))}–{tal(Math.max(...block))} %, så ett fynd
              som namnger ett av dem gäller i praktiken alla tre.
            </>
          )}{' '}
          <Link href="/metod#definitioner" className="underline hover:opacity-70">
            Så räknas samstämmighet
          </Link>
        </p>
      </section>
    </main>
  )
}
