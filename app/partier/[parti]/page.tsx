import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  db, heltal, lista, namn, partiFranSlug, rader, slug, tal,
  PARTIER, PARTIFARG, REGERINGSPARTIERNA,
} from '@/lib/db'
import { Stapel } from '@/components/stapel'
import { motparter, snitt, utbytbart, type Franvaro, type Par } from '@/lib/partier'
import AMNEN from '@/lib/amnen.json'

export const revalidate = 3600

/** Åtta sidor, kända i förväg. Prerendera dem i stället för vid första besöket. */
export function generateStaticParams() {
  return PARTIER.map((p) => ({ parti: slug(p) }))
}

export async function generateMetadata({ params }: { params: Promise<{ parti: string }> }) {
  const parti = partiFranSlug((await params).parti)
  if (!parti) return {}
  return {
    title: `${namn(parti)} — Riksdagsgranskning`,
    description: `Hur ${namn(parti)} röstade 2022–2026: vem partiet röstar med, var det avviker från sin egen normalnivå, hur ofta det stod ensamt och hur ofta det inte var på plats.`,
  }
}

type Ensam = { parti: string; ensam: number; av: number; andel: number }
type Exempel = {
  parti: string; linje: string; forslagspunkt_id: number; amne: string
  beteckning: string; punkt: string; datum: string; sakfraga: string
}
type Reservation = { parti: string; reservationer: number; ensamma: number }
type Utfall = { parti: string; voteringar: number; med_vinnaren: number; andel: number }

async function hamta(parti: string) {
  const klient = db()

  const [par, block, ensamma, exempel, franvaro, reservationer, utfall] = await Promise.all([
    // 119 rader: sju motparter i sexton ämnen plus 'alla'.
    rader<Par>(
      klient.from('partisamstammighet')
        .select('parti_1, parti_2, amne, gemensamma, lika, samstammighet')
        .or(`parti_1.eq.${parti},parti_2.eq.${parti}`)),
    // Regeringsblockets tre inbördes par, i en egen fråga.
    //
    // De går INTE att sila fram ur `par` ovan: den innehåller bara par där det
    // aktuella partiet ingår, så ett av de tre saknas alltid. På KD-sidan blev
    // spannet därför 99,9–99,9 % — paret L–M på 100,0 fanns inte med.
    rader<{ samstammighet: number }>(
      klient.from('partisamstammighet').select('samstammighet').eq('amne', 'alla')
        .in('parti_1', REGERINGSPARTIERNA).in('parti_2', REGERINGSPARTIERNA)),
    rader<Ensam>(klient.from('parti_ensam').select('*')),
    rader<Exempel>(
      klient.from('ensam_exempel').select('*').eq('parti', parti)
        .order('datum', { ascending: false })),
    // Alla partier, inte bara det här: kammarsnittet måste räknas ur samma
    // källa som partiets eget tal, annars jämförs två olika populationer.
    rader<Franvaro>(klient.from('parti_franvaro').select('parti, rm, roster, franvarande')),
    rader<Reservation>(klient.from('parti_reservation').select('*')),
    rader<Utfall>(klient.from('parti_utfall').select('*')),
  ])

  const mot = motparter(par, parti, 'alla')
  const normalt = snitt(mot)

  // Partiets samstämmighet med kammaren, ämne för ämne, mot sin EGEN normalnivå
  // — inte mot andra partier. Ett parti som ligger lågt överallt ska inte se
  // avvikande ut i varje ämne.
  const amnen = AMNEN.map((amne) => {
    const i = motparter(par, parti, amne)
    return {
      amne,
      har: snitt(i),
      // Avrundas här, inte vid utskriften: teckenprefixet väljs på talet som
      // faktiskt visas, så −0,04 inte blir "−0,0".
      delta: Math.round((snitt(i) - normalt) * 10) / 10,
      voteringar: i[0]?.gemensamma ?? 0,
    }
  })
    .filter((a) => a.voteringar > 0)
    .sort((a, b) => a.delta - b.delta)

  const summera = (poster: Franvaro[]) => {
    const roster = poster.reduce((n, r) => n + Number(r.roster), 0)
    const franvarande = poster.reduce((n, r) => n + Number(r.franvarande), 0)
    return { roster, franvarande, andel: roster > 0 ? (100 * franvarande) / roster : 0 }
  }

  const riksmoten = [...new Set(franvaro.map((f) => f.rm))].sort()

  return {
    mot,
    normalt,
    amnen,
    voteringar: mot[0]?.gemensamma ?? 0,
    ensam: ensamma.find((e) => e.parti === parti),
    // Partier med samma nolla som är värda att nämna: inte partiet självt, och
    // inte de tre meningen redan namnger. I dag blir listan tom — men den dagen
    // ett oppositionsparti aldrig står ensamt är det upplysningen som saknas.
    aldrigEnsamma: ensamma
      .filter((e) => Number(e.ensam) === 0)
      .map((e) => e.parti)
      .filter((p) => p !== parti && !REGERINGSPARTIERNA.some((r) => r === p)),
    exempel,
    franvaro: summera(franvaro.filter((f) => f.parti === parti)),
    kammaren: summera(franvaro),
    perRiksmote: riksmoten.map((rm) => ({
      rm,
      parti: summera(franvaro.filter((f) => f.parti === parti && f.rm === rm)).andel,
      kammaren: summera(franvaro.filter((f) => f.rm === rm)).andel,
    })),
    reservation: reservationer.find((r) => r.parti === parti),
    utfall: utfall.find((u) => u.parti === parti),
    likhetsspann: spann(block.map((b) => Number(b.samstammighet))),
  }
}

/** Lägsta och högsta i en serie. Null när serien är tom, aldrig ±Infinity. */
function spann(v: number[]) {
  return v.length ? { lagst: Math.min(...v), hogst: Math.max(...v) } : null
}

export default async function Partisida({ params }: { params: Promise<{ parti: string }> }) {
  const parti = partiFranSlug((await params).parti)
  if (!parti) notFound()

  const d = await hamta(parti)
  // Ämnet där partiet ligger längst under sin egen normalnivå. Listan är
  // sorterad stigande på delta, så det är första raden.
  const avvikande = d.amnen[0]

  return (
    <main className="pb-10">
      <section className="regel-tjock pt-8">
        <p className="text-[13px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          <Link href="/partier" className="hover:opacity-60">Partier</Link>
          {' · '}Mandatperioden 2022–2026
        </p>
        <h1 className="display mt-5 flex items-baseline gap-4 text-[clamp(2.2rem,7vw,4.6rem)] leading-[1.02]">
          <span className="inline-block h-9 w-1.5 shrink-0 translate-y-1 rounded-sm"
                style={{ background: PARTIFARG[parti] }} aria-hidden />
          {namn(parti)}
        </h1>

        {/* Förbehållet öppnar sidan för M, KD och L. Utan det ser tre av åtta
            sidor närmast identiska ut, och läsaren drar slutsatsen att något
            är trasigt i stället för att detta ÄR fyndet. */}
        {utbytbart(parti) && d.likhetsspann && (
          <p className="mt-7 max-w-[60ch] border-l-2 py-3 pl-4 text-[15px] leading-relaxed"
             style={{ borderColor: 'var(--accent)', background: 'var(--accent-svag)', color: 'var(--black-mjuk)' }}>
            <strong style={{ color: 'var(--black)' }}>
              Läs den här sidan tillsammans med de andra två.
            </strong>{' '}
            {lista(REGERINGSPARTIERNA.map(namn))} röstar lika i{' '}
            {tal(d.likhetsspann.lagst)}–{tal(d.likhetsspann.hogst)} % av alla
            voteringar. Nästan varje tal nedan gäller därför alla tre, och
            skillnaderna mellan deras sidor handlar om tiondelar. Det är ett
            resultat, inte ett fel i mätningen.
          </p>
        )}

        <p className="mt-7 max-w-[52ch] text-[17px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          {heltal(d.voteringar)} voteringar med namnupprop ligger bakom talen
          nedan. Partiets linje är det alternativ flest av dess närvarande
          ledamöter valde.
        </p>
      </section>

      <section className="regel mt-16 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Vem {namn(parti)} röstar med</h2>
        <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Andelen voteringar där partierna hamnade på samma linje. Måttet säger
          vad de gjorde, inte varför — två partier kan rösta lika av rakt
          motsatta skäl.
        </p>

        <table className="mt-8 w-full max-w-2xl text-[15px]">
          <tbody>
            {d.mot.map((m, i) => (
              <tr key={m.parti} className="regel">
                <td className="py-3">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span className="inline-block h-3.5 w-1 rounded-sm"
                          style={{ background: PARTIFARG[m.parti] }} aria-hidden />
                    <Link href={`/partier/${slug(m.parti)}`} className="hover:opacity-60">
                      {namn(m.parti)}
                    </Link>
                  </span>
                </td>
                <td className="tabular py-3 pl-4 text-right" style={{ color: 'var(--black-svag)' }}>
                  {heltal(m.lika)}
                </td>
                <td className="tabular whitespace-nowrap py-3 pl-5 text-right font-semibold"
                    style={{ color: i === 0 ? 'var(--accent)' : 'var(--black)' }}>
                  {tal(m.samstammighet)} %
                </td>
                <td className="hidden w-1/2 py-3 pl-5 sm:table-cell">
                  <Stapel andel={m.samstammighet} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-5 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Antalet voteringar med samma linje, av {heltal(d.voteringar)}.
          Genomsnittet mot de sju andra är {tal(d.normalt)} % — det är den
          normalnivå ämnena nedan jämförs mot.
        </p>
      </section>

      {avvikande && (
        <section className="regel-tjock mt-20 pt-8">
          <h2 className="display max-w-[24ch] text-[clamp(1.7rem,4.5vw,2.8rem)] leading-[1.05]">
            I frågor om {avvikande.amne} röstar {namn(parti)} med kammaren i
            <span style={{ color: 'var(--accent)' }}> {tal(avvikande.har)} % </span>
            av voteringarna — mot {tal(d.normalt)} % i alla frågor.
          </h2>
          <p className="mt-5 max-w-[58ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
            Jämförelsen görs mot partiets egen normalnivå, inte mot andra
            partier. Ett parti som ligger lågt överallt ska inte se avvikande ut
            i varje ämne.
          </p>

          <table className="mt-9 w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-[0.1em]"
                  style={{ color: 'var(--black-svag)' }}>
                <th className="pb-2 font-medium">Ämne</th>
                <th className="pb-2 text-right font-medium">I ämnet</th>
                <th className="pb-2 pl-4 text-right font-medium">Mot normalt</th>
                <th className="hidden pb-2 pl-4 text-right font-medium sm:table-cell">Voteringar</th>
              </tr>
            </thead>
            <tbody>
              {d.amnen.map((a, i) => (
                <tr key={a.amne} className="regel">
                  <td className="py-2.5">
                    <Link href={`/samstammighet?amne=${encodeURIComponent(a.amne)}`}
                          className="hover:opacity-60">
                      {a.amne}
                    </Link>
                  </td>
                  <td className="tabular whitespace-nowrap py-2.5 text-right">{tal(a.har)} %</td>
                  <td className="tabular whitespace-nowrap py-2.5 pl-4 text-right font-semibold"
                      style={{ color: i < 3 ? 'var(--accent)' : 'var(--black-svag)' }}>
                    {a.delta > 0 && '+'}{a.delta < 0 && '−'}{tal(Math.abs(a.delta))}
                  </td>
                  <td className="tabular hidden py-2.5 pl-4 text-right sm:table-cell"
                      style={{ color: 'var(--black-svag)' }}>
                    {heltal(a.voteringar)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
            Procentenheter från partiets normalnivå på {tal(d.normalt)} %. Ämnen
            med få voteringar svänger mer — kolumnen längst till höger visar hur
            många beslut varje tal vilar på.
          </p>
        </section>
      )}

      <section className="regel mt-20 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Ensam mot alla</h2>

        {d.ensam && Number(d.ensam.ensam) > 0 ? (
          <>
            <div className="mt-8">
              <div className="display tabular text-[clamp(3rem,11vw,6.5rem)] leading-[0.85]"
                   style={{ color: 'var(--accent)' }}>
                {heltal(Number(d.ensam.ensam))}
              </div>
              <p className="mt-5 max-w-[46ch] text-[18px] leading-snug">
                gånger stod {namn(parti)} på en linje som inget av de sju andra
                partierna delade — {tal(Number(d.ensam.andel))} % av alla
                voteringar.
              </p>
            </div>

            {d.exempel.length > 0 && (
              <>
                <h3 className="mt-12 text-[13px] uppercase tracking-[0.12em]"
                    style={{ color: 'var(--black-svag)' }}>
                  {d.exempel.length === 1 ? 'Den enda gången' : `De ${d.exempel.length} senaste gångerna`}
                </h3>
                <ol className="mt-3">
                  {d.exempel.map((e) => (
                    <li key={e.forslagspunkt_id} className="regel py-4">
                      <Link href={`/voteringar/${e.forslagspunkt_id}`} className="group block">
                        <div className="flex flex-wrap items-baseline gap-x-3 text-[12px] uppercase tracking-[0.1em]"
                             style={{ color: 'var(--black-svag)' }}>
                          <span>{e.beteckning} · punkt {e.punkt}</span>
                          <span>{e.datum}</span>
                          <span style={{ color: 'var(--accent)' }}>{e.amne}</span>
                        </div>
                        <p className="mt-1.5 max-w-[68ch] text-[16px] leading-snug transition-opacity group-hover:opacity-60">
                          {e.sakfraga}
                        </p>
                      </Link>
                      <p className="mt-2 text-[13px]" style={{ color: 'var(--black-svag)' }}>
                        {namn(parti)} röstade {e.linje.toLowerCase()} — ensamt.
                      </p>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        ) : (
          <>
            <div className="mt-8">
              <div className="display tabular text-[clamp(3rem,11vw,6.5rem)] leading-[0.85]"
                   style={{ color: 'var(--accent)' }}>
                0
              </div>
              <p className="mt-5 max-w-[46ch] text-[18px] leading-snug">
                gånger stod {namn(parti)} ensamt mot de sju andra partierna.
              </p>
            </div>
            <p className="mt-7 max-w-[62ch] border-l-2 py-3 pl-4 text-[14px] leading-relaxed"
               style={{ borderColor: 'var(--accent)', background: 'var(--accent-svag)', color: 'var(--black-mjuk)' }}>
              <strong style={{ color: 'var(--black)' }}>Nollan är mekanisk.</strong>{' '}
              {lista(REGERINGSPARTIERNA.map(namn))} röstar nästan alltid lika, så
              inget av dem kan gärna bli ensamt — de två andra står redan på
              samma linje.{' '}
              {d.aldrigEnsamma.length > 0 && (
                <>Samma nolla gäller {lista(d.aldrigEnsamma.map(namn))}. </>
              )}
              Talet mäter inte hur självständigt ett parti är, utan hur ofta det
              drev en linje utan att få sällskap.
            </p>
          </>
        )}
      </section>

      <section className="regel mt-20 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Var partiet inte på plats?</h2>
        <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          {namn(parti)} uteblev från{' '}
          <strong style={{ color: 'var(--black)' }}>{tal(d.franvaro.andel)} %</strong>{' '}
          av sina röstningstillfällen under mandatperioden. Kammaren som helhet
          låg på {tal(d.kammaren.andel)} %.
        </p>

        <table className="mt-7 w-full max-w-xl text-[14px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-[0.1em]"
                style={{ color: 'var(--black-svag)' }}>
              <th className="pb-2 font-medium">Riksmöte</th>
              <th className="pb-2 text-right font-medium">{parti}</th>
              <th className="pb-2 pl-5 text-right font-medium">Kammaren</th>
              <th className="hidden pb-2 pl-5 font-medium sm:table-cell">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {d.perRiksmote.map((r) => (
              <tr key={r.rm} className="regel">
                <td className="py-2.5">{r.rm}</td>
                <td className="tabular whitespace-nowrap py-2.5 text-right font-semibold">
                  {tal(r.parti)} %
                </td>
                <td className="tabular whitespace-nowrap py-2.5 pl-5 text-right"
                    style={{ color: 'var(--black-svag)' }}>
                  {tal(r.kammaren)} %
                </td>
                {/* Accent, inte partifärg: varje rad på sidan gäller samma
                    parti, så färgen skulle inte koda något. Skalan är ×4 —
                    frånvaro över 25 % fyller stapeln. */}
                <td className="hidden w-1/2 py-2.5 pl-5 sm:table-cell">
                  <Stapel andel={r.parti * 4} />
                </td>
              </tr>
            ))}
            <tr className="regel">
              <td className="py-2.5 font-semibold">hela perioden</td>
              <td className="tabular whitespace-nowrap py-2.5 text-right font-semibold"
                  style={{ color: 'var(--accent)' }}>
                {tal(d.franvaro.andel)} %
              </td>
              <td className="tabular whitespace-nowrap py-2.5 pl-5 text-right"
                  style={{ color: 'var(--black-svag)' }}>
                {tal(d.kammaren.andel)} %
              </td>
              <td className="hidden sm:table-cell" />
            </tr>
          </tbody>
        </table>

        <p className="mt-5 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Partiets samlade siffra är stabilare än enskilda ledamöters. Skälet
          till frånvaron — föräldraledighet, sjukdom, tjänsteresor,
          utskottsarbete — finns inte i öppna data, och riksdagen kvittar
          dessutom frånvaro. Talet säger hur ofta ledamöterna inte deltog, inget
          annat. Politiskt oberoende ledamöter ingår varken i partiets tal eller
          i kammarens.
        </p>
        <Link href="/franvaro"
              className="mt-6 inline-block border-b pb-1 text-[14px] transition-opacity hover:opacity-60"
              style={{ borderColor: 'var(--linje)', color: 'var(--black-mjuk)' }}>
          Se frånvaron ledamot för ledamot →
        </Link>
      </section>

      {d.reservation && (
        <section className="regel mt-20 pt-8">
          <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Vad {namn(parti)} föreslog i stället</h2>
          <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
            När ett parti inte får med sig utskottet skriver det en reservation —
            ett eget förslag som ställs mot utskottets i kammaren.{' '}
            {namn(parti)} stod bakom{' '}
            <strong style={{ color: 'var(--black)' }}>
              {heltal(Number(d.reservation.reservationer))}
            </strong>{' '}
            reservationer, varav {heltal(Number(d.reservation.ensamma))} som enda
            parti.
          </p>

          {/* Utan den här förklaringen läses ett lågt tal som passivitet, när
              det i själva verket mäter att partiet SATT i utskottsmajoriteten.
              Se docs/PLAN_EFTER_GRANSKNING.md. */}
          <p className="mt-6 max-w-[64ch] border-l-2 py-3 pl-4 text-[14px] leading-relaxed"
             style={{ borderColor: 'var(--accent)', background: 'var(--accent-svag)', color: 'var(--black-mjuk)' }}>
            <strong style={{ color: 'var(--black)' }}>
              Talet mäter maktposition, inte aktivitet.
            </strong>{' '}
            {lista(REGERINGSPARTIERNA.map(namn))} skriver nästan inga
            reservationer eftersom de <em>är</em> utskottsmajoriteten — deras
            förslag blir utskottets. Ett oppositionsparti med tusentals
            reservationer är inte flitigare, det står bara på andra sidan.
            Jämför därför aldrig talet mellan partier i regering och opposition.
          </p>
        </section>
      )}

      {d.utfall && (
        <section className="regel mt-20 pt-8">
          <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">På den vinnande sidan</h2>
          <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
            {namn(parti)} hade samma linje som den vinnande sidan i{' '}
            <strong style={{ color: 'var(--black)' }}>
              {heltal(Number(d.utfall.med_vinnaren))} av {heltal(Number(d.utfall.voteringar))}
            </strong>{' '}
            voteringar, alltså {tal(Number(d.utfall.andel))} %. Utskottets
            förslag ställs alltid som ja och reservationen som nej, så talet
            följer nära om partiet satt i utskottsmajoriteten eller inte.
          </p>
          <Link href="/metod#regeringssidan"
                className="mt-6 inline-block border-b pb-1 text-[14px] transition-opacity hover:opacity-60"
                style={{ borderColor: 'var(--accent)' }}>
            Se alla åtta partier och förbehållet →
          </Link>
        </section>
      )}

      <nav className="regel mt-20 flex flex-wrap gap-x-5 gap-y-2 pt-6 text-[14px]">
        {PARTIER.filter((p) => p !== parti).map((p) => (
          <Link key={p} href={`/partier/${slug(p)}`}
                className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-60"
                style={{ color: 'var(--black-mjuk)' }}>
            <span className="inline-block h-3 w-1 rounded-sm"
                  style={{ background: PARTIFARG[p] }} aria-hidden />
            {namn(p)}
          </Link>
        ))}
      </nav>
    </main>
  )
}
