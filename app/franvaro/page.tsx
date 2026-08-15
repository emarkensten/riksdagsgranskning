import Link from 'next/link'
import { antal, db, heltal, rakna, PARTIFARG, tal } from '@/lib/db'

export const revalidate = 3600

const RM = '2025/26'

async function hamta() {
  const klient = db()

  const [{ data: franvaro }, { data: summering }] = await Promise.all([
    klient.from('ledamot_franvaro')
      .select('intressent_id, parti, voteringar, franvarande, andel')
      .eq('rm', RM).order('andel', { ascending: false }).range(0, 999),
    klient.from('riksmote_summering').select('*').eq('rm', RM).maybeSingle(),
  ])

  // Hämta bara de ledamöter som faktiskt förekommer. Tabellen har 2 898 rader
  // och en rak select() skulle kapas vid 1000 — då tappas de flesta namnen.
  const { data: ledamoter } = await klient
    .from('ledamot').select('intressent_id, fornamn, efternamn, valkrets')
    .in('intressent_id', (franvaro ?? []).map((f) => f.intressent_id))
    .range(0, 999)

  const namn = new Map((ledamoter ?? []).map((l) => [l.intressent_id, l]))

  // Ledamöter som bara suttit en kort period får orimliga andelar; kräv att
  // de deltagit i minst hälften av riksmötets voteringar.
  const maxVoteringar = Math.max(...(franvaro ?? []).map((f) => f.voteringar), 0)
  const relevanta = (franvaro ?? [])
    .filter((f) => f.voteringar >= maxVoteringar * 0.5)
    .flatMap((f) => {
      const ledamot = namn.get(f.intressent_id)
      return ledamot ? [{ ...f, ledamot }] : []
    })

  // Voteringarna där frånvaron faktiskt kunde ha fällt avgörandet — samma
  // urval som startsidans femte fynd länkar hit med. Tidigare hämtades allt med
  // marginal <= 5 och listan kapades vid 60, vilket gjorde att avsnittet
  // rubricerat "När frånvaron avgjorde" räknade fram ett annat antal än
  // startsidan lovade.
  const { data: jamna } = await klient
    .from('jamn_votering')
    .select('votering_id, ja, nej, marginal, franvarande, franvaron_avgjorde')
    .lte('marginal', 3).eq('franvaron_avgjorde', true).order('marginal')

  // Räknas i databasen, inte som listans längd: en punkt som saknar klarspråk
  // faller bort i joinen nedan och skulle annars sänka talet tyst.
  const avgjordeAntal = await rakna(
    antal(klient, 'jamn_votering').lte('marginal', 3).eq('franvaron_avgjorde', true),
    'voteringar där frånvaron avgjorde',
  )

  const ider = (jamna ?? []).map((j) => j.votering_id)
  const { data: punkter } = await klient
    .from('forslagspunkt')
    .select('id, rm, beteckning, punkt, votering_id, punkt_klartext(sakfraga)')
    .in('votering_id', ider)

  const perVotering = new Map((punkter ?? []).map((p: any) => [p.votering_id?.toUpperCase(), p]))
  const jamnaMedText = (jamna ?? [])
    .map((j) => ({ ...j, punkt: perVotering.get(j.votering_id?.toUpperCase()) }))
    .filter((j) => j.punkt)

  // Partinivån räknas på alla ledamöter, inte bara de långtjänande — annars
  // skulle avhopp och ersättare snedvrida jämförelsen mellan partier.
  const summaPerParti = new Map<string, { franv: number; tot: number }>()
  for (const f of franvaro ?? []) {
    if (!f.parti || f.parti === '-') continue
    const s = summaPerParti.get(f.parti) ?? { franv: 0, tot: 0 }
    s.franv += f.franvarande
    s.tot += f.voteringar
    summaPerParti.set(f.parti, s)
  }
  const perParti = [...summaPerParti.entries()]
    .map(([parti, s]) => ({ parti, andel: (100 * s.franv) / s.tot }))
    .sort((a, b) => b.andel - a.andel)

  return { relevanta, summering, jamnaMedText, perParti, avgjordeAntal }
}

export default async function Franvaro() {
  const { relevanta, summering, jamnaMedText, perParti, avgjordeAntal } = await hamta()
  const topp = relevanta.slice(0, 20)

  return (
    <main className="pb-10">
      <div className="regel-tjock pt-8">
        <p className="text-[13px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          Riksmöte {RM}
        </p>
        <h1 className="display mt-4 text-[clamp(2.2rem,6vw,4rem)]">
          Vem var inte på plats<span style={{ color: 'var(--accent)' }}>?</span>
        </h1>
        <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Att rösta i kammaren är riksdagsledamotens mest grundläggande uppgift.
          I riksmötet {RM} uteblev ledamöterna från{' '}
          <strong style={{ color: 'var(--black)' }}>
            {summering ? `${tal(Number(summering.franvaroandel))} %` : '—'}
          </strong>{' '}
          av röstningstillfällena.
        </p>
      </div>

      <section className="regel mt-14 pt-7">
        <h2 className="display text-2xl">Frånvaro per parti</h2>
        <p className="mt-2 text-[13px]" style={{ color: 'var(--black-svag)' }}>
          Partiets samlade frånvaro säger mer om partikulturen än enskilda
          ledamöters siffror gör.
        </p>
        <table className="mt-5 w-full max-w-lg text-[14px]">
          <tbody>
            {perParti.map((p) => (
              <tr key={p.parti} className="regel">
                <td className="py-2 font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-1 rounded-sm"
                          style={{ background: PARTIFARG[p.parti] ?? 'var(--linje)' }} />
                    {p.parti}
                  </span>
                </td>
                <td className="tabular py-2 text-right font-semibold">{tal(p.andel)} %</td>
                <td className="w-1/2 py-2 pl-4">
                  <span className="block h-1.5 rounded-sm" style={{
                    width: `${Math.min(100, p.andel * 4)}%`,
                    background: PARTIFARG[p.parti] ?? 'var(--linje)',
                    minWidth: '2px',
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="regel mt-16 pt-7">
        <h2 className="display text-2xl">Störst frånvaro</h2>
        <p className="mt-3 max-w-[64ch] border-l-2 py-2 pl-4 text-[13px] leading-relaxed"
           style={{ borderColor: 'var(--accent)', background: 'var(--accent-svag)', color: 'var(--black-mjuk)' }}>
          <strong style={{ color: 'var(--black)' }}>Läs den här listan varsamt.</strong>{' '}
          Partiledare och partiernas talespersoner har systematiskt hög frånvaro
          eftersom uppdraget för dem ofta ligger utanför kammaren. Skälen till
          frånvaro — föräldraledighet, sjukdom, tjänsteresor, utskottsarbete —
          finns inte i riksdagens öppna data, så en hög siffra är inte i sig ett
          påstående om försummelse. Den säger bara hur ofta ledamoten inte
          deltog i en omröstning.
        </p>

        <table className="mt-6 w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-[0.1em]"
                style={{ color: 'var(--black-svag)' }}>
              <th className="pb-2 font-medium">Ledamot</th>
              <th className="pb-2 font-medium">Parti</th>
              <th className="pb-2 text-right font-medium">Frånvarande</th>
              <th className="pb-2 text-right font-medium">Andel</th>
              <th className="pb-2 pl-4 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {topp.map((f) => (
              <tr key={f.intressent_id + f.parti} className="regel">
                <td className="py-2">
                  {f.ledamot.fornamn} {f.ledamot.efternamn}
                  <span className="ml-2 text-[12px]" style={{ color: 'var(--black-svag)' }}>
                    {f.ledamot.valkrets}
                  </span>
                </td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span className="inline-block h-3 w-1 rounded-sm"
                          style={{ background: PARTIFARG[f.parti] ?? 'var(--linje)' }} />
                    {f.parti}
                  </span>
                </td>
                <td className="tabular py-2 text-right">
                  {f.franvarande} <span style={{ color: 'var(--black-svag)' }}>/ {f.voteringar}</span>
                </td>
                <td className="tabular py-2 text-right font-semibold">{f.andel} %</td>
                <td className="w-[30%] py-2 pl-4">
                  <span className="block h-1.5 rounded-sm" style={{
                    width: `${Math.min(100, Number(f.andel))}%`,
                    background: 'var(--accent)',
                    minWidth: '2px',
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="avgjorde" className="regel mt-16 scroll-mt-6 pt-7">
        <h2 className="display text-2xl">När frånvaron avgjorde</h2>
        <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          {/* "fall" böjs inte i plural på svenska — den ternär som stod här
              gav tom sträng i båda grenarna. */}
          I {avgjordeAntal === 0 ? 'inget' : heltal(avgjordeAntal)} fall hade
          utfallet blivit ett annat om varje frånvarande ledamot hade röstat med
          sitt parti. Det är ren aritmetik — men den bygger på antagandet att de
          frånvarande hade följt partilinjen.
        </p>

        <ol className="mt-6">
          {jamnaMedText.map((j: any) => (
            <li key={j.votering_id} className="regel py-4">
              <Link href={`/voteringar/${j.punkt.id}`} className="group block">
                <div className="flex flex-wrap items-baseline gap-x-3 text-[12px] uppercase tracking-[0.1em]"
                     style={{ color: 'var(--black-svag)' }}>
                  <span>{j.punkt.beteckning} · punkt {j.punkt.punkt}</span>
                  <span>{j.punkt.rm}</span>
                  {j.franvaron_avgjorde && (
                    <span style={{ color: 'var(--accent)' }}>frånvaron avgjorde</span>
                  )}
                </div>
                <p className="mt-1.5 max-w-[68ch] text-[15px] leading-snug transition-opacity group-hover:opacity-60">
                  {j.punkt.punkt_klartext?.sakfraga ?? '—'}
                </p>
                <p className="tabular mt-2 text-[13px]" style={{ color: 'var(--black-svag)' }}>
                  {j.ja} ja mot {j.nej} nej — marginal {j.marginal}. {j.franvarande} frånvarande.
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
