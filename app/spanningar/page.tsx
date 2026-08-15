import Link from 'next/link'
import { db, PARTIFARG } from '@/lib/db'

export const revalidate = 3600

const ETIKETT: Record<string, { text: string; farg: string }> = {
  motsäger: { text: 'Motsäger', farg: 'var(--nej)' },
  spänning: { text: 'Spänning', farg: 'var(--avstar)' },
  stämmer: { text: 'Stämmer', farg: 'var(--ja)' },
  oklart: { text: 'Oklart', farg: 'var(--franvarande)' },
}

async function hamta(filter?: string) {
  const klient = db()

  const { data: alla } = await klient
    .from('retorik_rost').select('overensstammelse, parti').range(0, 49999)

  const fordelning: Record<string, number> = {}
  const perParti: Record<string, { motsager: number; totalt: number }> = {}
  for (const r of alla ?? []) {
    fordelning[r.overensstammelse] = (fordelning[r.overensstammelse] ?? 0) + 1
    if (!r.parti) continue
    perParti[r.parti] ??= { motsager: 0, totalt: 0 }
    perParti[r.parti].totalt++
    if (r.overensstammelse === 'motsäger') perParti[r.parti].motsager++
  }

  const { data: fall } = await klient
    .from('retorik_rost')
    .select('id, parti, talarens_krav, overensstammelse, eget_alternativ, partiets_rost, motivering, sakerhet, forslagspunkt_id, anforande(talare, avsnittsrubrik), forslagspunkt(id, rm, beteckning, punkt, punkt_klartext(sakfraga, ja_innebar, nej_innebar))')
    .eq('overensstammelse', filter ?? 'motsäger')
    .order('sakerhet')
    .limit(60)

  return { fordelning, perParti, fall: (fall ?? []) as any[], totalt: alla?.length ?? 0 }
}

export default async function Spanningar({
  searchParams,
}: {
  searchParams: Promise<{ typ?: string }>
}) {
  const { typ } = await searchParams
  const { fordelning, perParti, fall, totalt } = await hamta(typ)

  if (!totalt) {
    return (
      <main className="regel-tjock pt-8 pb-10">
        <h1 className="display text-[clamp(2rem,5vw,3.2rem)]">Sagt mot röstat</h1>
        <p className="mt-4 max-w-[52ch] text-[15px]" style={{ color: 'var(--black-mjuk)' }}>
          Analysen är inte klar än. När den är det visas här de fall där ett
          parti argumenterade för en sak och röstade för en annan.
        </p>
      </main>
    )
  }

  const partiRader = Object.entries(perParti)
    .map(([parti, v]) => ({ parti, ...v, andel: (100 * v.motsager) / v.totalt }))
    .sort((a, b) => b.andel - a.andel)

  return (
    <main className="pb-10">
      <div className="regel-tjock pt-8">
        <p className="text-[13px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          Mandatperioden 2022–2026
        </p>
        <h1 className="display mt-4 text-[clamp(2.2rem,6vw,4rem)]">Sagt mot röstat</h1>
        <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Vad partiets talare krävde i debatten, jämfört med hur partiet sedan
          röstade i samma ärende. {totalt.toLocaleString('sv-SE')} bedömningar.
        </p>
      </div>

      <section className="regel mt-10 pt-7">
        <h2 className="display text-2xl">Så fördelar det sig</h2>
        <p className="mt-3 max-w-[64ch] border-l-2 py-2 pl-4 text-[13px] leading-relaxed"
           style={{ borderColor: 'var(--accent)', background: 'var(--accent-svag)', color: 'var(--black-mjuk)' }}>
          <strong style={{ color: 'var(--black)' }}>Att rösta nej är oftast inte att vara emot.</strong>{' '}
          I riksdagen ställs utskottets förslag mot en reservation, så ett parti
          som röstar nej har nästan alltid röstat för sitt eget förslag i samma
          riktning. Det räknas här som <em>stämmer</em> eller <em>spänning</em> —
          aldrig som en motsägelse. Endast när partiet röstade emot det talaren
          argumenterade för <em>utan</em> att backa något eget alternativ
          rubriceras det som <em>motsäger</em>.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {Object.entries(ETIKETT).map(([nyckel, e]) => (
            <Link
              key={nyckel}
              href={`/spanningar?typ=${encodeURIComponent(nyckel)}`}
              className="rounded-sm px-3 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-70"
              style={{
                background: (typ ?? 'motsäger') === nyckel ? e.farg : 'transparent',
                color: (typ ?? 'motsäger') === nyckel ? '#fff' : 'var(--black-mjuk)',
                border: `1px solid ${(typ ?? 'motsäger') === nyckel ? e.farg : 'var(--linje)'}`,
              }}
            >
              {e.text} <span className="tabular opacity-70">{fordelning[nyckel] ?? 0}</span>
            </Link>
          ))}
        </div>
      </section>

      {partiRader.length > 0 && (
        <section className="regel mt-12 pt-7">
          <h2 className="display text-2xl">Andel motsägelser per parti</h2>
          <table className="mt-5 w-full max-w-lg text-[14px]">
            <tbody>
              {partiRader.map((p) => (
                <tr key={p.parti} className="regel">
                  <td className="py-2 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-3 w-1 rounded-sm"
                            style={{ background: PARTIFARG[p.parti] ?? 'var(--linje)' }} />
                      {p.parti}
                    </span>
                  </td>
                  <td className="tabular py-2 text-right">{p.motsager} av {p.totalt}</td>
                  <td className="tabular py-2 pl-6 text-right font-semibold">{p.andel.toFixed(1)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="regel mt-12 pt-7">
        <h2 className="display text-2xl">Fallen</h2>
        <ol className="mt-5">
          {fall.map((f) => {
            const p = f.forslagspunkt
            const e = ETIKETT[f.overensstammelse]
            return (
              <li key={f.id} className="regel py-5">
                <div className="flex flex-wrap items-baseline gap-x-3 text-[12px] uppercase tracking-[0.1em]"
                     style={{ color: 'var(--black-svag)' }}>
                  <span className="font-semibold" style={{ color: 'var(--black)' }}>{f.parti}</span>
                  <span>{p?.beteckning} punkt {p?.punkt}</span>
                  <span>{p?.rm}</span>
                  <span style={{ color: e?.farg }}>{e?.text.toLowerCase()} · säkerhet {f.sakerhet}</span>
                </div>

                <p className="mt-2 max-w-[70ch] text-[15px] leading-snug">
                  <strong>{f.anforande?.talare}</strong> krävde: {f.talarens_krav}
                </p>
                <p className="mt-1.5 max-w-[70ch] text-[14px] leading-snug" style={{ color: 'var(--black-mjuk)' }}>
                  {f.parti} röstade <strong>{f.partiets_rost}</strong>.{' '}
                  {f.eget_alternativ === false && 'Inget eget alternativ i samma riktning. '}
                  {f.motivering}
                </p>
                {p?.punkt_klartext?.sakfraga && (
                  <p className="mt-2 text-[13px]" style={{ color: 'var(--black-svag)' }}>
                    Voteringen gällde: {p.punkt_klartext.sakfraga}{' '}
                    <Link href={`/voteringar/${p.id}`} className="underline hover:opacity-60">
                      se voteringen
                    </Link>
                  </p>
                )}
              </li>
            )
          })}
        </ol>
        {fall.length === 0 && (
          <p className="regel py-8 text-[15px]" style={{ color: 'var(--black-svag)' }}>
            Inga fall i den här kategorin.
          </p>
        )}
      </section>
    </main>
  )
}
