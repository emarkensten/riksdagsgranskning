import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db, PARTIFARG, ROSTFARG, partilinje } from '@/lib/db'

export const revalidate = 3600

async function hamta(id: number) {
  const klient = db()
  const { data: k } = await klient
    .from('punkt_klartext')
    .select(
      'forslagspunkt_id, sakfraga, ja_innebar, nej_innebar, amne, sakerhet, modell, forslagspunkt!inner(id, rm, beteckning, punkt, rubrik, forslag, votering_id, motforslag_nummer, motforslag_partier, vinnare, bet_dok_id, betankande!inner(titel, organ, datum))',
    )
    .eq('forslagspunkt_id', id)
    .maybeSingle()
  if (!k) return null

  const f = (k as any).forslagspunkt
  const [{ data: roster }, { data: reservationer }] = await Promise.all([
    klient.from('parti_rost').select('*').eq('votering_id', f.votering_id ?? ''),
    klient.from('reservation').select('nummer, partier, text')
      .eq('bet_dok_id', f.bet_dok_id).eq('punkt', f.punkt).order('nummer'),
  ])
  return { k: k as any, f, roster: roster ?? [], reservationer: reservationer ?? [] }
}

export default async function Votering({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await hamta(Number(id))
  if (!data) notFound()
  const { k, f, roster, reservationer } = data

  // Utskottets förslag ställs som ja, reservationen som nej. Utfallet räknas
  // därför fram ur rösterna i stället för att läsas ur forslagspunkt.vinnare:
  // det fältet innehåller även etiketterna 'bifall' och 'Avslagen' för punkter
  // som utskottet faktiskt vann, och skulle visa fel vinnare för fyra av dem.
  const ja = roster.reduce((n: number, r: any) => n + r.ja, 0)
  const nej = roster.reduce((n: number, r: any) => n + r.nej, 0)
  const rostades = ja + nej > 0
  const utskottetVann = !rostades || ja > nej

  return (
    <main className="pb-10">
      <div className="regel-tjock pt-8">
        <div className="flex flex-wrap items-baseline gap-x-3 text-[12px] uppercase tracking-[0.12em]"
             style={{ color: 'var(--black-svag)' }}>
          <Link href="/voteringar" className="hover:opacity-60">Voteringar</Link>
          <span>·</span>
          <span>{f.beteckning} punkt {f.punkt}</span>
          <span>·</span>
          <span>{f.rm}</span>
          <span style={{ color: 'var(--accent)' }}>{k.amne}</span>
        </div>

        <h1 className="display mt-5 max-w-[24ch] text-[clamp(1.9rem,4.6vw,3rem)]">
          {f.rubrik ?? k.sakfraga}
        </h1>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          {k.sakfraga}
        </p>
        <p className="mt-3 text-[13px]" style={{ color: 'var(--black-svag)' }}>
          Ur betänkandet <em>{f.betankande?.titel}</em> ({f.betankande?.organ})
        </p>
      </div>

      {k.sakerhet !== 'hög' && (
        <p
          className="mt-8 border-l-2 py-2 pl-4 text-[14px] leading-relaxed"
          style={{ borderColor: 'var(--accent)', background: 'var(--accent-svag)', color: 'var(--black-mjuk)' }}
        >
          <strong style={{ color: 'var(--black)' }}>Osäker tolkning.</strong>{' '}
          Underlaget för den här voteringen är ovanligt svårtolkat
          {k.sakerhet === 'låg' ? '' : ' på någon punkt'}. Läs originaltexterna längst
          ned innan du drar slutsatser.
        </p>
      )}

      <section className="mt-12 grid gap-px sm:grid-cols-2">
        <Innebord etikett="Ja innebar" text={k.ja_innebar} farg="var(--ja)"
                  vann={rostades && utskottetVann} />
        <Innebord etikett="Nej innebar" text={k.nej_innebar} farg="var(--nej)"
                  vann={rostades && !utskottetVann} />
      </section>

      <section className="regel mt-12 pt-7">
        <h2 className="display text-2xl">Så röstade partierna</h2>
        <table className="mt-5 w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-[0.1em]"
                style={{ color: 'var(--black-svag)' }}>
              <th className="pb-2 font-medium">Parti</th>
              <th className="pb-2 font-medium">Linje</th>
              <th className="pb-2 text-right font-medium">Ja</th>
              <th className="pb-2 text-right font-medium">Nej</th>
              <th className="pb-2 text-right font-medium">Avstår</th>
              <th className="pb-2 text-right font-medium">Frånv.</th>
            </tr>
          </thead>
          <tbody>
            {roster
              .sort((a: any, b: any) => b.totalt - a.totalt)
              .map((r: any) => {
                const linje = partilinje(r)
                return (
                  <tr key={r.parti} className="regel">
                    <td className="py-2 font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-3 w-1 rounded-sm"
                              style={{ background: PARTIFARG[r.parti] ?? 'var(--linje)' }} />
                        {r.parti}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className="rounded-sm px-1.5 py-0.5 text-[12px] font-semibold text-white"
                            style={{ background: ROSTFARG[linje] }}>
                        {linje}
                      </span>
                    </td>
                    <td className="tabular py-2 text-right">{r.ja}</td>
                    <td className="tabular py-2 text-right">{r.nej}</td>
                    <td className="tabular py-2 text-right">{r.avstar}</td>
                    <td className="tabular py-2 text-right" style={{ color: 'var(--black-svag)' }}>
                      {r.franvarande}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
        <p className="mt-3 text-[13px]" style={{ color: 'var(--black-svag)' }}>
          {!rostades
            ? 'Ingen omröstning med namnupprop på den här punkten.'
            : utskottetVann
              ? `Utskottets förslag vann med ${ja} röster mot ${nej}.`
              : `Reservation ${f.motforslag_nummer} vann med ${nej} röster mot ${ja}.`}
          {f.motforslag_partier?.length
            ? ` Motförslaget stöddes av ${f.motforslag_partier.join(', ')}.`
            : ''}
        </p>
      </section>

      <section className="regel mt-12 pt-7">
        <h2 className="display text-2xl">Underlaget</h2>
        <p className="mt-2 text-[13px]" style={{ color: 'var(--black-svag)' }}>
          Sammanfattningen ovan är gjord automatiskt ({k.modell}, säkerhet: {k.sakerhet}).
          Här är originaltexterna den bygger på.
        </p>

        <details className="regel mt-5 py-3">
          <summary className="cursor-pointer text-[14px] font-medium">Utskottets förslag</summary>
          <pre className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed"
               style={{ color: 'var(--black-mjuk)' }}>{f.forslag}</pre>
        </details>

        {reservationer.map((r: any) => (
          <details key={r.nummer} className="regel py-3">
            <summary className="cursor-pointer text-[14px] font-medium">
              Reservation {r.nummer}
              {r.partier?.length ? ` (${r.partier.join(', ')})` : ''}
            </summary>
            <pre className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed"
                 style={{ color: 'var(--black-mjuk)' }}>{r.text}</pre>
          </details>
        ))}
      </section>
    </main>
  )
}

function Innebord({ etikett, text, farg, vann }: {
  etikett: string; text: string; farg: string; vann: boolean
}) {
  return (
    <div className="regel py-6 sm:pr-8">
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: farg }} />
        <span className="text-[13px] uppercase tracking-[0.12em]">{etikett}</span>
        {vann && (
          <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: 'var(--accent)' }}>
            vann
          </span>
        )}
      </div>
      <p className="mt-3 text-[15px] leading-relaxed">{text}</p>
    </div>
  )
}
