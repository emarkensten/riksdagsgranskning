import Link from 'next/link'
import { antal, db, heltal, rader, rakna, tal, PARTIFARG } from '@/lib/db'
import { Stapel } from '@/components/stapel'

export const revalidate = 3600

export const metadata = {
  title: 'Vem var inte på plats? — Riksdagsgranskning',
  description:
    'Frånvaron i riksdagen 2022–2026, riksmöte för riksmöte och parti för parti. Räknat på rösterna, inte på voteringarna.',
}

/** Andelen av riksmötets voteringar en ledamot måste ha deltagit i för att listas. */
const HALVTID = 0.5

type Riksmote = { rm: string; roster: number; franvarande: number; franvaroandel: number }
type PartiRad = { parti: string; rm: string; roster: number; franvarande: number }
type LedamotRad = { intressent_id: string; parti: string; voteringar: number; franvarande: number; andel: number }
type Jamn = {
  votering_id: string; ja: number; nej: number; marginal: number; franvarande: number
}

/**
 * Voteringens förslagspunkt, för länk och sakfråga.
 *
 * punkt_klartext är en till-en-relation, men utan genererade databastyper kan
 * supabase-js inte veta det och infererar en array. PostgREST svarar med ett
 * objekt. Båda formerna hanteras här i stället för att typen castas bort — då
 * skulle ett formskifte bli ett tomt fält på sidan i stället för ett typfel.
 */
type Klartext = { sakfraga: string }
type Punkt = {
  id: number; rm: string; beteckning: string; punkt: string; votering_id: string
  punkt_klartext: Klartext | Klartext[] | null
}

function sakfragan(p: Punkt) {
  const k = p.punkt_klartext
  return (Array.isArray(k) ? k[0]?.sakfraga : k?.sakfraga) ?? '—'
}

async function hamta() {
  const klient = db()

  const [riksmoten, perParti, jamna, avgjordeAntal] = await Promise.all([
    rader<Riksmote>(
      klient.from('riksmote_summering').select('rm, roster, franvarande, franvaroandel').order('rm')),
    // 32 rader: åtta partier gånger fyra riksmöten.
    rader<PartiRad>(klient.from('parti_franvaro').select('parti, rm, roster, franvarande')),
    // Voteringarna där frånvaron faktiskt kunde ha fällt avgörandet — samma
    // urval som startsidans femte fynd länkar hit med.
    rader<Jamn>(
      klient.from('jamn_votering')
        // franvaron_avgjorde selectas inte: frågan filtrerar redan på den, så
        // varje rad har samma värde.
        .select('votering_id, ja, nej, marginal, franvarande')
        .lte('marginal', 3).eq('franvaron_avgjorde', true).order('marginal')),
    // Räknas i databasen, inte som listans längd: en punkt som saknar klarspråk
    // faller bort i joinen nedan och skulle annars sänka talet tyst.
    rakna(
      antal(klient, 'jamn_votering').lte('marginal', 3).eq('franvaron_avgjorde', true),
      'voteringar där frånvaron avgjorde'),
  ])

  // Senaste riksmötet läses ur data. Stod tidigare som en konstant i filen och
  // hade blivit tyst inaktuell vid nästa import.
  const senaste = riksmoten[riksmoten.length - 1]?.rm ?? ''

  // punkter beror bara på jamna, som redan är upplöst — den behöver inte vänta
  // på ledamotsfrågan.
  const [ledamoter, punkter] = await Promise.all([
    rader<LedamotRad>(
      klient.from('ledamot_franvaro')
        .select('intressent_id, parti, voteringar, franvarande, andel')
        .eq('rm', senaste).order('andel', { ascending: false }).range(0, 4999)),
    rader<Punkt>(
      klient.from('forslagspunkt')
        .select('id, rm, beteckning, punkt, votering_id, punkt_klartext(sakfraga)')
        .in('votering_id', jamna.map((j) => j.votering_id))),
  ])

  // Hämta bara de ledamöter som faktiskt förekommer. Tabellen har 2 898 rader
  // och en rak select() skulle kapas vid takgränsen.
  const namn = new Map(
    (await rader<{ intressent_id: string; fornamn: string; efternamn: string; valkrets: string }>(
      klient.from('ledamot').select('intressent_id, fornamn, efternamn, valkrets')
        .in('intressent_id', ledamoter.map((l) => l.intressent_id)).range(0, 4999)))
      .map((l) => [l.intressent_id, l]))

  // Ledamöter som bara suttit en kort period får orimliga andelar. Kravet är
  // att de deltagit i minst hälften av riksmötets voteringar — utan det hamnar
  // en ersättare som tjänstgjort en vecka överst i listan.
  const flest = Math.max(...ledamoter.map((l) => Number(l.voteringar)), 0)
  const relevanta = ledamoter
    .filter((l) => Number(l.voteringar) >= flest * HALVTID)
    .flatMap((l) => {
      const person = namn.get(l.intressent_id)
      return person ? [{ ...l, person }] : []
    })

  const perVotering = new Map(punkter.map((p) => [p.votering_id?.toUpperCase(), p]))
  const jamnaMedText = jamna
    .map((j) => ({ ...j, punkt: perVotering.get(j.votering_id?.toUpperCase()) }))
    .filter((j) => j.punkt)

  const summa = (rows: { roster: number; franvarande: number }[]) => {
    const roster = rows.reduce((n, r) => n + Number(r.roster), 0)
    const franvarande = rows.reduce((n, r) => n + Number(r.franvarande), 0)
    return { roster, franvarande, andel: roster > 0 ? (100 * franvarande) / roster : 0 }
  }

  const partier = [...new Set(perParti.map((p) => p.parti))]
    .map((parti) => ({ parti, ...summa(perParti.filter((p) => p.parti === parti)) }))
    .sort((a, b) => b.andel - a.andel)

  return {
    riksmoten: riksmoten.map((r) => ({ ...r, franvaroandel: Number(r.franvaroandel) })),
    hela: summa(riksmoten),
    partier,
    senaste,
    relevanta,
    flest,
    jamnaMedText,
    avgjordeAntal,
  }
}

export default async function Franvaro() {
  const d = await hamta()
  const topp = d.relevanta.slice(0, 20)
  const hogsta = d.riksmoten.reduce((a, b) => (b.franvaroandel > a.franvaroandel ? b : a), d.riksmoten[0])
  const lagsta = d.riksmoten.reduce((a, b) => (b.franvaroandel < a.franvaroandel ? b : a), d.riksmoten[0])

  return (
    <main className="pb-10">
      <section className="regel-tjock pt-8">
        <p className="stig text-[13px] uppercase tracking-[0.18em]"
           style={{ color: 'var(--accent)', animationDelay: '0ms' }}>
          Mandatperioden 2022–2026
        </p>
        <h1 className="display stig mt-5 text-[clamp(2.4rem,7vw,4.6rem)]"
            style={{ animationDelay: '80ms' }}>
          Vem var inte på plats<span style={{ color: 'var(--accent)' }}>?</span>
        </h1>

        <div className="stig mt-10" style={{ animationDelay: '160ms' }}>
          <div className="display tabular text-[clamp(3.2rem,13vw,7.5rem)] leading-[0.82]"
               style={{ color: 'var(--accent)' }}>
            {tal(d.hela.andel)} %
          </div>
          <p className="mt-6 max-w-[46ch] text-[19px] leading-snug">
            av {heltal(d.hela.roster)} röstningstillfällen stod tomma. Att rösta i
            kammaren är riksdagsledamotens mest grundläggande uppgift.
          </p>
        </div>
      </section>

      <section className="regel mt-16 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Riksmöte för riksmöte</h2>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Talet för hela perioden döljer en stor skillnad mellan åren:{' '}
          {tal(hogsta?.franvaroandel ?? 0)} % i {hogsta?.rm} mot{' '}
          {tal(lagsta?.franvaroandel ?? 0)} % i {lagsta?.rm}. Den som kommer hit
          från en annan siffra på sajten hittar den i tabellen nedan.
        </p>

        <table className="mt-7 w-full max-w-2xl text-[15px]">
          <tbody>
            {d.riksmoten.map((r) => (
              <tr key={r.rm} className="regel">
                <td className="py-3 font-medium">{r.rm}</td>
                <td className="tabular py-3 pl-4 text-right" style={{ color: 'var(--black-svag)' }}>
                  {heltal(Number(r.franvarande))} av {heltal(Number(r.roster))}
                </td>
                <td className="tabular whitespace-nowrap py-3 pl-5 text-right font-semibold">
                  {tal(r.franvaroandel)} %
                </td>
                <td className="hidden w-1/3 py-3 pl-5 sm:table-cell">
                  <Stapel andel={r.franvaroandel * 4} />
                </td>
              </tr>
            ))}
            <tr className="regel">
              <td className="py-3 font-semibold">hela perioden</td>
              <td className="tabular py-3 pl-4 text-right" style={{ color: 'var(--black-svag)' }}>
                {heltal(d.hela.franvarande)} av {heltal(d.hela.roster)}
              </td>
              <td className="tabular whitespace-nowrap py-3 pl-5 text-right font-semibold"
                  style={{ color: 'var(--accent)' }}>
                {tal(d.hela.andel)} %
              </td>
              <td className="hidden sm:table-cell" />
            </tr>
          </tbody>
        </table>
        <p className="mt-5 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Räknat på rösterna, inte på voteringarna: varje ledamot och votering är
          en rad. Stapeln är skalad så att 25 % fyller bredden.
        </p>
      </section>

      <section className="regel mt-16 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Frånvaro per parti</h2>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Hela mandatperioden. Partiets samlade siffra är stabilare än enskilda
          ledamöters.
        </p>
        <table className="mt-6 w-full max-w-2xl text-[15px]">
          <tbody>
            {d.partier.map((p) => (
              <tr key={p.parti} className="regel">
                <td className="py-2.5 font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-1 rounded-sm" aria-hidden
                          style={{ background: PARTIFARG[p.parti] ?? 'var(--linje)' }} />
                    <Link href={`/partier/${p.parti.toLowerCase()}`} className="hover:opacity-60">
                      {p.parti}
                    </Link>
                  </span>
                </td>
                <td className="tabular whitespace-nowrap py-2.5 pl-4 text-right font-semibold">
                  {tal(p.andel)} %
                </td>
                <td className="hidden w-1/2 py-2.5 pl-5 sm:table-cell">
                  <Stapel andel={p.andel * 4} farg={PARTIFARG[p.parti] ?? 'var(--linje)'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="regel mt-16 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Störst frånvaro i {d.senaste}</h2>
        <p className="mt-4 max-w-[64ch] border-l-2 py-2 pl-4 text-[13px] leading-relaxed"
           style={{ borderColor: 'var(--accent)', background: 'var(--accent-svag)', color: 'var(--black-mjuk)' }}>
          <strong style={{ color: 'var(--black)' }}>Läs den här listan varsamt.</strong>{' '}
          Partiledare och partiernas talespersoner har systematiskt hög frånvaro
          eftersom uppdraget för dem ofta ligger utanför kammaren. Skälen till
          frånvaro — föräldraledighet, sjukdom, tjänsteresor, utskottsarbete —
          finns inte i riksdagens öppna data, så en hög siffra är inte i sig ett
          påstående om försummelse. Den säger bara hur ofta ledamoten inte
          deltog i en omröstning.
        </p>
        <p className="mt-4 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Listan gäller de {heltal(d.relevanta.length)} ledamöter som deltagit i
          minst hälften av riksmötets voteringar, alltså {heltal(Math.ceil(d.flest * HALVTID))} av{' '}
          {heltal(d.flest)}. Utan den regeln hamnar ersättare som tjänstgjort
          någon vecka överst med andelar som inte går att jämföra.
        </p>

        <table className="mt-6 w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-[0.1em]"
                style={{ color: 'var(--black-svag)' }}>
              <th className="pb-2 font-medium">Ledamot</th>
              <th className="pb-2 font-medium">Parti</th>
              <th className="pb-2 text-right font-medium">Frånvarande</th>
              <th className="pb-2 text-right font-medium">Andel</th>
              <th className="hidden pb-2 pl-4 font-medium sm:table-cell">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {topp.map((f) => (
              <tr key={f.intressent_id + f.parti} className="regel">
                <td className="py-2">
                  {f.person.fornamn} {f.person.efternamn}
                  <span className="ml-2 text-[12px]" style={{ color: 'var(--black-svag)' }}>
                    {f.person.valkrets}
                  </span>
                </td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span className="inline-block h-3 w-1 rounded-sm" aria-hidden
                          style={{ background: PARTIFARG[f.parti] ?? 'var(--linje)' }} />
                    {f.parti}
                  </span>
                </td>
                <td className="tabular py-2 text-right">
                  {heltal(Number(f.franvarande))}{' '}
                  <span style={{ color: 'var(--black-svag)' }}>/ {heltal(Number(f.voteringar))}</span>
                </td>
                <td className="tabular whitespace-nowrap py-2 text-right font-semibold">
                  {tal(Number(f.andel))} %
                </td>
                <td className="hidden w-[30%] py-2 pl-4 sm:table-cell">
                  <Stapel andel={Number(f.andel)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="avgjorde" className="regel mt-16 scroll-mt-6 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">När frånvaron avgjorde</h2>
        <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          {/* "fall" böjs inte i plural på svenska — den ternär som stod här
              gav tom sträng i båda grenarna. */}
          I {d.avgjordeAntal === 0 ? 'inget' : heltal(d.avgjordeAntal)} fall hade
          utfallet blivit ett annat om varje frånvarande ledamot hade röstat med
          sitt parti. Det är ren aritmetik — men den bygger på antagandet att de
          frånvarande hade följt partilinjen, och riksdagen kvittar frånvaro:
          när en ledamot uteblir avstår ofta en ledamot från motsatt sida
          frivilligt. Vilka voteringar som kvittades framgår inte av öppna data.
        </p>

        <ol className="mt-7">
          {d.jamnaMedText.map((j: any) => (
            <li key={j.votering_id} className="regel py-4">
              <Link href={`/voteringar/${j.punkt.id}`} className="group block">
                <div className="flex flex-wrap items-baseline gap-x-3 text-[12px] uppercase tracking-[0.1em]"
                     style={{ color: 'var(--black-svag)' }}>
                  <span>{j.punkt.beteckning} · punkt {j.punkt.punkt}</span>
                  <span>{j.punkt.rm}</span>
                </div>
                <p className="mt-1.5 max-w-[68ch] text-[15px] leading-snug transition-opacity group-hover:opacity-60">
                  {sakfragan(j.punkt)}
                </p>
                <p className="tabular mt-2 text-[13px]" style={{ color: 'var(--black-svag)' }}>
                  {heltal(Number(j.ja))} ja mot {heltal(Number(j.nej))} nej — marginal{' '}
                  {heltal(Number(j.marginal))}. {heltal(Number(j.franvarande))} frånvarande.
                </p>
              </Link>
            </li>
          ))}
        </ol>

        <Link href="/metod#definitioner"
              className="mt-8 inline-block border-b pb-1 text-[14px] transition-opacity hover:opacity-60"
              style={{ borderColor: 'var(--accent)' }}>
          Så räknas frånvaron →
        </Link>
      </section>
    </main>
  )
}
