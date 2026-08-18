import Link from 'next/link'
import { antal, db, heltal, rader, rakna, tal } from '@/lib/db'
import { namn, PARTIFARG } from '@/lib/parti'
import { Stapel } from '@/components/stapel'
import { Etikett, Forbehall, Partiprick, Textlank } from '@/components/system'
import { sidmetadata } from '@/lib/sajt'

export const revalidate = 3600

export const metadata = sidmetadata({
  titel: 'Vem var inte på plats?',
  beskrivning:
    'Frånvaron i riksdagen 2022–2026, riksmöte för riksmöte och parti för parti. Räknat på rösterna, inte på voteringarna.',
  sokvag: '/franvaro',
})

/** Andelen av riksmötets voteringar en ledamot måste ha deltagit i för att listas. */
const HALVTID = 0.5

/** Staplarnas skala. Frånvaro på 25 % fyller bredden — annars syns inga skillnader. */
const TAK = 25

type Riksmote = { rm: string; roster: number; franvarande: number; franvaroandel: number }
type PartiRad = { parti: string; rm: string; roster: number; franvarande: number }
type LedamotRad = { intressent_id: string; parti: string; voteringar: number; franvarande: number; andel: number }
type Jamn = {
  votering_id: string; ja: number; nej: number; marginal: number; franvarande: number
  /** Ja minus nej om alla frånvarande röstat med sitt parti. Noll = lika röstetal. */
  marginal_fullsatt: number
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
        // marginal_fullsatt skiljer ett byte av segrare från ett lika röstetal.
        .select('votering_id, ja, nej, marginal, franvarande, marginal_fullsatt')
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
  const namnkarta = new Map(
    (await rader<{ intressent_id: string; fornamn: string; efternamn: string; valkrets: string }>(
      klient.from('ledamot').select('intressent_id, fornamn, efternamn, valkrets')
        .in('intressent_id', ledamoter.map((l) => l.intressent_id)).range(0, 4999)))
      .map((l) => [l.intressent_id, l]))

  // Ledamöter som bara suttit en kort period får orimliga andelar. Kravet mäter
  // tjänstgöringstid, inte närvaro: ledamot_franvaro.voteringar är count(*) över
  // röstlängden och räknar frånvaron med. Det är avsiktligt — annars skulle
  // urvalet sålla bort just de frånvarande listan handlar om. Utan kravet hamnar
  // en ersättare som tjänstgjort en vecka överst.
  const flest = Math.max(...ledamoter.map((l) => Number(l.voteringar)), 0)
  const relevanta = ledamoter
    .filter((l) => Number(l.voteringar) >= flest * HALVTID)
    .flatMap((l) => {
      const person = namnkarta.get(l.intressent_id)
      return person ? [{ ...l, person }] : []
    })

  const perVotering = new Map(punkter.map((p) => [p.votering_id?.toUpperCase(), p]))
  const jamnaMedText = jamna
    .map((j) => ({ ...j, punkt: perVotering.get(j.votering_id?.toUpperCase()) }))
    .filter((j) => j.punkt)

  // franvaron_avgjorde är sann när tecknet på marginalen byts av de frånvarande,
  // och noll har inget tecken. En fullsatt marginal på noll betyder därför inte
  // att den andra sidan vunnit utan att röstetalen blivit lika — och lika
  // röstetal avgörs genom lottning. Utfallet hade kunnat bli ett annat, inte
  // blivit det. Ett fall av tolv, och det ska inte räknas som ett byte.
  const lottning = jamna.filter((j) => Number(j.marginal_fullsatt) === 0).length

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
    lottning,
    byten: avgjordeAntal - lottning,
  }
}

export default async function Franvaro() {
  const d = await hamta()
  const topp = d.relevanta.slice(0, 20)
  const hogsta = d.riksmoten.reduce((a, b) => (b.franvaroandel > a.franvaroandel ? b : a), d.riksmoten[0])
  const lagsta = d.riksmoten.reduce((a, b) => (b.franvaroandel < a.franvaroandel ? b : a), d.riksmoten[0])

  return (
    <main>
      {/* Sidans enda mörka fält. Lime får bara förekomma här. */}
      <section className="panel helbredd py-16 sm:py-[72px]">
        <div className="mx-auto grid max-w-5xl items-center gap-y-14 px-5 sm:px-8 md:grid-cols-[1.1fr_1fr] md:gap-x-14">
        <div>
          <h1 className="stig text-[clamp(2.4rem,7vw,64px)] font-extrabold leading-[0.92] tracking-[-0.04em]">
            Vem var inte på plats?
          </h1>
          <div className="siffra stig mt-8 text-[clamp(4rem,13vw,148px)]"
               style={{ color: 'var(--lime)', animationDelay: '80ms' }}>
            {tal(d.hela.andel)} %
          </div>
          <p className="stig mt-7 max-w-[40ch] text-[20px] leading-[1.45]"
             style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}>
            av {heltal(d.hela.roster)} röstningstillfällen stod tomma. Skälen —
            kvittning, uppdrag, ledighet, sjukdom — syns inte i öppna data.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          <Etikett>Per riksmöte</Etikett>
          {d.riksmoten.map((r) => (
            <div key={r.rm} className="grid grid-cols-[104px_1fr_64px] items-center gap-3.5 text-[15px]">
              <span style={{ color: 'var(--black-mjuk)' }}>{r.rm}</span>
              <Stapel andel={(100 * r.franvaroandel) / TAK} hojd={10} />
              <span className="tabular text-right font-semibold">{tal(r.franvaroandel)} %</span>
            </div>
          ))}
          <div className="grid grid-cols-[104px_1fr_64px] items-center gap-3.5 pt-3 text-[15px]"
               style={{ borderTop: '1px solid var(--linje)' }}>
            <span className="whitespace-nowrap font-semibold">hela perioden</span>
            <Stapel andel={(100 * d.hela.andel) / TAK} hojd={10} />
            <span className="tabular text-right font-bold" style={{ color: 'var(--lime)' }}>
              {tal(d.hela.andel)} %
            </span>
          </div>
          <p className="mt-2 max-w-[44ch] text-[13.5px] leading-[1.55]" style={{ color: 'var(--black-svag)' }}>
            Räknat på rösterna, inte på voteringarna: varje ledamot och votering
            är en rad. Stapeln är skalad så att {TAK} % fyller bredden.
          </p>
        </div>
        </div>
      </section>

      <section className="py-16">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <h2 className="rubrik text-[clamp(1.8rem,4.2vw,36px)]">Frånvaro per parti</h2>
          <p className="max-w-[46ch] text-[14.5px] sm:text-right" style={{ color: 'var(--black-mjuk)' }}>
            Hela mandatperioden. Talet döljer en skillnad mellan åren:{' '}
            {tal(hogsta?.franvaroandel ?? 0)} % i {hogsta?.rm} mot{' '}
            {tal(lagsta?.franvaroandel ?? 0)} % i {lagsta?.rm}.
          </p>
        </div>

        <div className="mt-7">
          {d.partier.map((p) => (
            <Link
              key={p.parti}
              href={`/partier/${p.parti.toLowerCase()}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 py-3.5 transition-opacity duration-150 hover:opacity-70 sm:grid-cols-[minmax(180px,240px)_90px_1fr]"
              style={{ borderBottom: '1px solid var(--linje)' }}
            >
              <span className="flex items-center gap-3 text-[16px] font-bold sm:text-[17px]">
                <Partiprick parti={p.parti} />
                {namn(p.parti)}
              </span>
              <span className="tabular text-right text-[17px] font-bold sm:text-left sm:text-[18px]">
                {tal(p.andel)} %
              </span>
              {/* Partifärgen bär vilket parti raden gäller — det är data, och
                  varje rad gäller ett eget parti. */}
              <span className="col-span-2 sm:col-span-1">
                <Stapel andel={(100 * p.andel) / TAK} hojd={12}
                        farg={PARTIFARG[p.parti] ?? 'var(--accent)'} />
              </span>
            </Link>
          ))}
        </div>

        <Forbehall rubrik="Läs listan varsamt." className="mt-7">
          Partiledare och talespersoner har systematiskt hög frånvaro eftersom
          uppdraget ofta ligger utanför kammaren. Skälen — föräldraledighet,
          sjukdom, tjänsteresor, utskottsarbete — finns inte i öppna data, så en
          hög siffra är inte i sig ett påstående om försummelse.
        </Forbehall>
      </section>

      <section className="regel py-16">
        <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">Störst frånvaro i {d.senaste}</h2>
        <p className="mt-5 max-w-[64ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          Listan gäller de {heltal(d.relevanta.length)} ledamöter som stått i
          röstlängden för minst hälften av riksmötets voteringar, alltså{' '}
          {heltal(Math.ceil(d.flest * HALVTID))} av {heltal(d.flest)}. Kravet
          gäller tjänstgöringstid och inte närvaro — hade det gällt hur många
          voteringar de faktiskt deltog i skulle urvalet sålla bort just de
          frånvarande listan handlar om. Utan regeln hamnar ersättare som
          tjänstgjort någon vecka överst med andelar som inte går att jämföra.
        </p>

        <div className="mt-8">
          <div className="etikett grid grid-cols-[1fr_auto_auto] gap-x-5 pb-3 sm:grid-cols-[1fr_64px_120px_100px_1fr]"
               style={{ borderBottom: '1px solid var(--linje)' }}>
            <span>Ledamot</span>
            <span className="hidden sm:block">Parti</span>
            <span className="hidden text-right sm:block">Frånvarande</span>
            <span className="text-right">Andel</span>
            <span className="hidden sm:block" />
          </div>
          {topp.map((f) => (
            <div
              key={f.intressent_id + f.parti}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-5 gap-y-1 py-3 sm:grid-cols-[1fr_64px_120px_100px_1fr]"
              style={{ borderBottom: '1px solid var(--linje)' }}
            >
              <span className="text-[15.5px]">
                {f.person.fornamn} {f.person.efternamn}
                <span className="ml-2 text-[13px]" style={{ color: 'var(--black-svag)' }}>
                  {f.person.valkrets}
                </span>
              </span>
              <span className="flex items-center gap-2 text-[14px] font-bold">
                <Partiprick parti={f.parti} storlek={10} />
                {f.parti}
              </span>
              <span className="tabular hidden text-right text-[15px] sm:block">
                {heltal(Number(f.franvarande))}{' '}
                <span style={{ color: 'var(--black-svag)' }}>/ {heltal(Number(f.voteringar))}</span>
              </span>
              <span className="tabular text-right text-[16px] font-bold">
                {tal(Number(f.andel))} %
              </span>
              <span className="hidden sm:block">
                <Stapel andel={Number(f.andel)} hojd={10} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="avgjorde" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">När frånvaron avgjorde</h2>
        <p className="mt-5 max-w-[62ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          {/* "fall" böjs inte i plural på svenska — den ternär som stod här
              gav tom sträng i båda grenarna. */}
          I {d.avgjordeAntal === 0 ? 'inget' : heltal(d.avgjordeAntal)} fall hade
          voteringen slutat annorlunda om varje frånvarande ledamot hade röstat
          med sitt parti.
          {d.lottning > 0 && (
            <>
              {' '}I {heltal(d.byten)} av dem hade den andra sidan vunnit. I{' '}
              {d.lottning === 1 ? 'det återstående' : `de återstående ${heltal(d.lottning)}`}{' '}
              hade röstetalen blivit lika, och lika röstetal avgörs genom
              lottning — utfallet hade alltså kunnat bli ett annat, inte
              nödvändigtvis blivit det.
            </>
          )}
        </p>

        <Forbehall rubrik="Aritmetik, inte anklagelse." className="mt-7">
          Beräkningen bygger på antagandet att de frånvarande hade följt
          partilinjen, och riksdagen kvittar frånvaro: när en ledamot uteblir
          avstår ofta en ledamot från motsatt sida frivilligt, just för att
          styrkeförhållandet ska hålla. Vilka voteringar som kvittades framgår
          inte av öppna data.
        </Forbehall>

        <ol className="mt-9">
          {d.jamnaMedText.map((j: any) => (
            <li key={j.votering_id}>
              <Link
                href={`/voteringar/${j.punkt.id}`}
                className="block py-5 transition-opacity duration-150 hover:opacity-70"
                style={{ borderTop: '1px solid var(--linje)' }}
              >
                <div className="mono flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] uppercase tracking-[0.1em]"
                     style={{ color: 'var(--etikett)' }}>
                  <span>{j.punkt.beteckning} · punkt {j.punkt.punkt}</span>
                  <span>{j.punkt.rm}</span>
                </div>
                <p className="mt-2.5 max-w-[56ch] text-[19px] font-semibold leading-[1.35] tracking-[-0.01em]">
                  {sakfragan(j.punkt)}
                </p>
                <p className="tabular mt-3 text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
                  {heltal(Number(j.ja))} ja mot {heltal(Number(j.nej))} nej — marginal{' '}
                  {heltal(Number(j.marginal))}. {heltal(Number(j.franvarande))} frånvarande.
                </p>
              </Link>
            </li>
          ))}
        </ol>

        <Textlank href="/metod#definitioner" className="mt-9">Så räknas frånvaron</Textlank>
      </section>
    </main>
  )
}
