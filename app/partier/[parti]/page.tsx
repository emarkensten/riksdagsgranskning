import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  db, heltal, lista, namn, partiFranSlug, rader, slug, tal,
  PARTIER, PARTIFARG, REGERINGSPARTIERNA,
} from '@/lib/db'
import { Stapel } from '@/components/stapel'
import { Etikett, Forbehall, Partiprick, Textlank, Tillbaka } from '@/components/system'
import {
  motparter, regeringsspann, snitt, utbytbart, type Franvaro, type Par,
} from '@/lib/partier'
import { sidmetadata } from '@/lib/sajt'
import AMNEN from '@/lib/amnen.json'

export const revalidate = 3600

/** Åtta sidor, kända i förväg. Prerendera dem i stället för vid första besöket. */
export function generateStaticParams() {
  return PARTIER.map((p) => ({ parti: slug(p) }))
}

export async function generateMetadata({ params }: { params: Promise<{ parti: string }> }) {
  const parti = partiFranSlug((await params).parti)
  if (!parti) return {}
  return sidmetadata({
    titel: namn(parti),
    beskrivning: `Hur ${namn(parti)} röstade 2022–2026: vem partiet röstar med, var det avviker från sin egen normalnivå, hur ofta det stod ensamt och hur ofta det inte var på plats.`,
    sokvag: `/partier/${slug(parti)}`,
  })
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

  const [par, likhetsspann, ensamma, exempel, franvaro, reservationer, utfall] = await Promise.all([
    // 119 rader: sju motparter i sexton ämnen plus 'alla'.
    rader<Par>(
      klient.from('partisamstammighet')
        .select('parti_1, parti_2, amne, gemensamma, lika, samstammighet')
        .or(`parti_1.eq.${parti},parti_2.eq.${parti}`)),
    regeringsspann(),
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
    likhetsspann,
  }
}

export default async function Partisida({ params }: { params: Promise<{ parti: string }> }) {
  const parti = partiFranSlug((await params).parti)
  if (!parti) notFound()

  const d = await hamta(parti)
  // Listan är sorterad stigande på delta: första raden är ämnet där partiet
  // ligger längst under sin normalnivå, sista där det ligger högst över.
  const lagst = d.amnen[0]
  const hogst = d.amnen[d.amnen.length - 1]
  const ensamAntal = Number(d.ensam?.ensam ?? 0)

  return (
    <main>
      <div className="pt-10">
        <Tillbaka href="/partier">Alla partier</Tillbaka>
      </div>

      {/* Titelblocket: partifärgen som en stapel bredvid namnet. Färgen kodar
          vilket parti sidan gäller — den är data, inte dekor. */}
      <section className="flex items-start gap-5 pb-14 pt-7">
        <span
          aria-hidden
          className="mt-2 hidden shrink-0 rounded sm:block"
          style={{ width: 20, height: 76, background: PARTIFARG[parti] }}
        />
        <div>
          <h1 className="display text-[clamp(2.6rem,8vw,88px)]">{namn(parti)}</h1>
          <p className="mt-6 max-w-[54ch] text-[19px] leading-[1.5]" style={{ color: 'var(--black-mjuk)' }}>
            Mätt över {heltal(d.voteringar)} voteringar med namnupprop i
            mandatperioden 2022–2026. Partiets linje är det alternativ flest av
            dess närvarande ledamöter valde.
          </p>
        </div>
      </section>

      {/* Förbehållet öppnar sidan för M, KD och L. Utan det ser tre av åtta
          sidor närmast identiska ut, och läsaren drar slutsatsen att något är
          trasigt i stället för att detta ÄR fyndet. */}
      {utbytbart(parti) && (
        <Forbehall rubrik="Läs den här sidan tillsammans med de andra två." className="mb-14">
          {lista(REGERINGSPARTIERNA.map(namn))} röstar lika i {d.likhetsspann} av
          alla voteringar. Nästan varje tal nedan gäller därför alla tre, och
          skillnaderna mellan deras sidor handlar om tiondelar. Det är ett
          resultat, inte ett fel i mätningen.
        </Forbehall>
      )}

      {/* Fyra tal på rad, delade av hårlinjer */}
      <section
        className="grid border-y sm:grid-cols-2 lg:grid-cols-4"
        style={{ borderColor: 'var(--linje)' }}
      >
        <Nyckel etikett="Snitt mot övriga" varde={`${tal(d.normalt)} %`} />
        <Nyckel etikett="Ensam mot alla" varde={heltal(ensamAntal)} signal />
        <Nyckel
          etikett="På vinnande sida"
          varde={d.utfall ? `${tal(Number(d.utfall.andel))} %` : '—'}
        />
        <Nyckel etikett="Frånvaro" varde={`${tal(d.franvaro.andel)} %`} sist />
      </section>

      {/* Röstar med + avviker mest i */}
      <section className="grid gap-14 py-16 lg:grid-cols-2">
        <div>
          <h2 className="rubrik text-[clamp(1.6rem,3.6vw,32px)]">Röstar med</h2>
          <div className="mt-6">
            {d.mot.map((m) => (
              <div
                key={m.parti}
                className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[150px_1fr_72px]"
                style={{ borderBottom: '1px solid var(--linje)' }}
              >
                <Link
                  href={`/partier/${slug(m.parti)}`}
                  className="flex items-center gap-2.5 text-[15.5px] font-semibold transition-opacity duration-150 hover:opacity-70"
                >
                  <Partiprick parti={m.parti} storlek={10} />
                  {namn(m.parti)}
                </Link>
                <span className="order-3 col-span-2 sm:order-none sm:col-span-1">
                  <Stapel andel={m.samstammighet} hojd={10} />
                </span>
                <span className="tabular text-right text-[15px] font-bold">
                  {tal(m.samstammighet)} %
                </span>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-[52ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
            Andelen av {heltal(d.voteringar)} voteringar där partierna hamnade på
            samma linje. Genomsnittet mot de sju andra är {tal(d.normalt)} % — det
            är den normalnivå ämnena jämförs mot.
          </p>
        </div>

        <div>
          <h2 className="rubrik text-[clamp(1.6rem,3.6vw,32px)]">Avviker mest i</h2>
          <div className="mt-6 flex flex-col gap-3.5">
            {hogst && hogst.delta > 0 && (
              <Avvikelse
                amne={hogst.amne}
                delta={hogst.delta}
                text={`Samstämmigheten med kammaren är ${tal(Math.abs(hogst.delta))} procentenheter högre här än i partiets egen normalnivå.`}
              />
            )}
            {/* Villkoren är inte kosmetiska: med bara ett ämne i underlaget är
                lagst === hogst, och de två korten hade då påstått både "högre"
                och "längre ifrån" om samma ämne. */}
            {lagst && lagst !== hogst && lagst.delta < 0 && (
              <Avvikelse
                amne={lagst.amne}
                delta={lagst.delta}
                text={`Här står partiet längre från kammaren än i något annat ämne — ${tal(lagst.har)} % mot ${tal(d.normalt)} % normalt.`}
              />
            )}
          </div>
          <p className="mt-5 max-w-[52ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
            Jämförelsen görs mot partiets egen normalnivå, inte mot andra
            partier. Ett parti som ligger lågt överallt ska inte se avvikande ut
            i varje ämne.
          </p>
        </div>
      </section>

      {/* Alla ämnen */}
      <section className="regel py-16">
        <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">Ämne för ämne</h2>
        <p className="mt-5 max-w-[58ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          Procentenheter från partiets normalnivå på {tal(d.normalt)} %. Ämnen med
          få voteringar svänger mer — kolumnen längst till höger visar hur många
          beslut varje tal vilar på.
        </p>

        <div className="mt-8">
          <div
            className="etikett grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-5 pb-3 sm:grid-cols-[1fr_96px_110px_110px]"
            style={{ borderBottom: '1px solid var(--linje)' }}
          >
            <span>Ämne</span>
            <span className="text-right">I ämnet</span>
            <span className="text-right">Mot normalt</span>
            <span className="hidden text-right sm:block">Voteringar</span>
          </div>
          {d.amnen.map((a, i) => (
            <Link
              key={a.amne}
              href={`/samstammighet?amne=${encodeURIComponent(a.amne)}`}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-5 py-3.5 transition-opacity duration-150 hover:opacity-70 sm:grid-cols-[1fr_96px_110px_110px]"
              style={{ borderBottom: '1px solid var(--linje)' }}
            >
              <span className="text-[16px] font-semibold">{a.amne}</span>
              <span className="tabular text-right text-[16px]">{tal(a.har)} %</span>
              <span
                className="tabular text-right text-[16px] font-bold"
                style={{ color: i < 3 ? 'var(--accent)' : 'var(--black-svag)' }}
              >
                {a.delta > 0 && '+'}{a.delta < 0 && '−'}{tal(Math.abs(a.delta))}
              </span>
              <span className="tabular hidden text-right text-[15px] sm:block"
                    style={{ color: 'var(--black-svag)' }}>
                {heltal(a.voteringar)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Ensam mot alla */}
      <section className="regel py-16">
        <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">Ensam mot alla</h2>

        <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="siffra text-[clamp(3.4rem,10vw,92px)]"
               style={{ color: 'var(--accent-display)' }}>
            {heltal(ensamAntal)}
          </div>
          <p className="mb-2 max-w-[46ch] text-[18px] leading-[1.5]" style={{ color: 'var(--black-mjuk)' }}>
            {ensamAntal > 0 ? (
              <>
                gånger stod {namn(parti)} på en linje som inget av de sju andra
                partierna delade — {tal(Number(d.ensam?.andel ?? 0))} % av alla
                voteringar.
              </>
            ) : (
              <>gånger stod {namn(parti)} ensamt mot de sju andra partierna.</>
            )}
          </p>
        </div>

        {ensamAntal === 0 && (
          <Forbehall rubrik="Nollan är mekanisk." className="mt-8">
            {lista(REGERINGSPARTIERNA.map(namn))} röstar nästan alltid lika, så
            inget av dem kan gärna bli ensamt — de två andra står redan på samma
            linje.{' '}
            {d.aldrigEnsamma.length > 0 && <>Samma nolla gäller {lista(d.aldrigEnsamma.map(namn))}. </>}
            Talet mäter inte hur självständigt ett parti är, utan hur ofta det
            drev en linje utan att få sällskap.
          </Forbehall>
        )}

        {d.exempel.length > 0 && (
          <>
            <Etikett className="mt-12">
              {d.exempel.length === 1 ? 'Den enda gången' : `De ${d.exempel.length} senaste gångerna`}
            </Etikett>
            <ol className="mt-5">
              {d.exempel.map((e) => (
                <li key={e.forslagspunkt_id} className="regel py-5">
                  <Link href={`/voteringar/${e.forslagspunkt_id}`} className="group block">
                    <div className="mono flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] uppercase tracking-[0.1em]"
                         style={{ color: 'var(--etikett)' }}>
                      <span>{e.beteckning} · punkt {e.punkt}</span>
                      <span>{e.datum}</span>
                      <span style={{ color: 'var(--accent)' }}>{e.amne}</span>
                    </div>
                    <p className="mt-2.5 max-w-[56ch] text-[19px] font-semibold leading-[1.35] tracking-[-0.01em] transition-opacity duration-150 group-hover:opacity-70">
                      {e.sakfraga}
                    </p>
                  </Link>
                  <p className="mt-2.5 text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
                    {namn(parti)} röstade {e.linje.toLowerCase()} — ensamt.
                  </p>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {/* Frånvaro */}
      <section className="regel py-16">
        <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">Var partiet inte på plats?</h2>
        <p className="mt-5 max-w-[58ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          {namn(parti)} uteblev från{' '}
          <strong style={{ color: 'var(--black)' }}>{tal(d.franvaro.andel)} %</strong>{' '}
          av sina röstningstillfällen under mandatperioden. Kammaren som helhet
          låg på {tal(d.kammaren.andel)} %.
        </p>

        <div className="mt-8 max-w-2xl">
          <div
            className="etikett grid grid-cols-[1fr_auto_auto] gap-x-5 pb-3 sm:grid-cols-[1fr_100px_110px_1fr]"
            style={{ borderBottom: '1px solid var(--linje)' }}
          >
            <span>Riksmöte</span>
            <span className="text-right">{parti}</span>
            <span className="text-right">Kammaren</span>
            <span className="hidden sm:block" />
          </div>
          {d.perRiksmote.map((r) => (
            <div
              key={r.rm}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-5 py-3 sm:grid-cols-[1fr_100px_110px_1fr]"
              style={{ borderBottom: '1px solid var(--linje)' }}
            >
              <span className="text-[16px]">{r.rm}</span>
              <span className="tabular text-right text-[16px] font-bold">{tal(r.parti)} %</span>
              <span className="tabular text-right text-[15px]" style={{ color: 'var(--black-svag)' }}>
                {tal(r.kammaren)} %
              </span>
              {/* Accent, inte partifärg: varje rad på sidan gäller samma parti,
                  så färgen skulle inte koda något. Skalan är ×4 — frånvaro över
                  25 % fyller stapeln. */}
              <span className="hidden sm:block">
                <Stapel andel={r.parti * 4} hojd={10} />
              </span>
            </div>
          ))}
          <div
            className="grid grid-cols-[1fr_auto_auto] items-center gap-x-5 py-3 sm:grid-cols-[1fr_100px_110px_1fr]"
            style={{ borderBottom: '1px solid var(--linje)' }}
          >
            <span className="text-[16px] font-bold">hela perioden</span>
            <span className="tabular text-right text-[16px] font-bold" style={{ color: 'var(--accent)' }}>
              {tal(d.franvaro.andel)} %
            </span>
            <span className="tabular text-right text-[15px]" style={{ color: 'var(--black-svag)' }}>
              {tal(d.kammaren.andel)} %
            </span>
            <span className="hidden sm:block" />
          </div>
        </div>

        <Forbehall rubrik="Talet säger hur ofta ledamöterna inte deltog, inget annat." className="mt-8" litet>
          Skälet till frånvaron — föräldraledighet, sjukdom, tjänsteresor,
          utskottsarbete — finns inte i öppna data, och riksdagen kvittar
          dessutom frånvaro. Politiskt oberoende ledamöter ingår varken i
          partiets tal eller i kammarens.
        </Forbehall>
        <Textlank href="/franvaro" className="mt-8">Se frånvaron ledamot för ledamot</Textlank>
      </section>

      {d.reservation && (
        <section className="regel py-16">
          <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">Vad {namn(parti)} föreslog i stället</h2>
          <p className="mt-5 max-w-[60ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
            När ett parti inte får med sig utskottet skriver det en reservation —
            ett eget förslag som ställs mot utskottets i kammaren. {namn(parti)}{' '}
            stod bakom{' '}
            <strong style={{ color: 'var(--black)' }}>
              {heltal(Number(d.reservation.reservationer))}
            </strong>{' '}
            reservationer, varav {heltal(Number(d.reservation.ensamma))} som enda
            parti.
          </p>

          {/* Utan den här förklaringen läses ett lågt tal som passivitet, när
              det i själva verket mäter att partiet SATT i utskottsmajoriteten.
              Se docs/PLAN_EFTER_GRANSKNING.md. */}
          <Forbehall rubrik="Talet mäter maktposition, inte aktivitet." className="mt-8">
            {lista(REGERINGSPARTIERNA.map(namn))} skriver nästan inga
            reservationer eftersom de <em>är</em> utskottsmajoriteten — deras
            förslag blir utskottets. Ett oppositionsparti med tusentals
            reservationer är inte flitigare, det står bara på andra sidan. Jämför
            därför aldrig talet mellan partier i regering och opposition.
          </Forbehall>
        </section>
      )}

      {d.utfall && (
        <section className="regel py-16">
          <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">På den vinnande sidan</h2>
          <p className="mt-5 max-w-[60ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
            {namn(parti)} hade samma linje som den vinnande sidan i{' '}
            <strong style={{ color: 'var(--black)' }}>
              {heltal(Number(d.utfall.med_vinnaren))} av {heltal(Number(d.utfall.voteringar))}
            </strong>{' '}
            voteringar, alltså {tal(Number(d.utfall.andel))} %. Utskottets förslag
            ställs alltid som ja och reservationen som nej, så talet följer nära
            om partiet satt i utskottsmajoriteten eller inte.
          </p>
          <Textlank href="/metod#regeringssidan" className="mt-8">
            Se alla åtta partier och förbehållet
          </Textlank>
        </section>
      )}

      <nav className="regel flex flex-wrap gap-2 py-10">
        {PARTIER.filter((p) => p !== parti).map((p) => (
          <Link
            key={p}
            href={`/partier/${slug(p)}`}
            className="inline-flex items-center gap-2 rounded-full px-[14px] py-2 text-[13.5px] font-medium transition-colors duration-150 hover:bg-[var(--papper-djup)]"
            style={{ border: '1px solid var(--linje-stark)', color: 'var(--black-mjuk)' }}
          >
            <Partiprick parti={p} storlek={10} />
            {namn(p)}
          </Link>
        ))}
      </nav>
    </main>
  )
}

/** En cell i talremsan under titeln. */
function Nyckel({
  etikett,
  varde,
  signal = false,
  sist = false,
}: {
  etikett: string
  varde: string
  signal?: boolean
  sist?: boolean
}) {
  return (
    <div
      className={`p-8 ${sist ? '' : 'lg:border-r'}`}
      style={{ borderColor: 'var(--linje)' }}
    >
      <Etikett>{etikett}</Etikett>
      <div
        className="tabular mt-3.5 text-[clamp(2.2rem,5vw,46px)] font-extrabold tracking-[-0.04em]"
        style={{ color: signal ? 'var(--accent-display)' : 'var(--black)' }}
      >
        {varde}
      </div>
    </div>
  )
}

/** Ett ämne där partiet ligger längst från sin egen normalnivå. */
function Avvikelse({ amne, delta, text }: { amne: string; delta: number; text: string }) {
  return (
    <div className="px-6 py-5" style={{ background: 'var(--papper-djup)' }}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[18px] font-bold">{amne}</span>
        <span
          className="tabular shrink-0 text-[26px] font-extrabold"
          style={{ color: 'var(--accent-display)' }}
        >
          {delta > 0 ? '+' : '−'}{tal(Math.abs(delta))}
        </span>
      </div>
      <p className="mt-2 text-[14.5px] leading-[1.55]" style={{ color: 'var(--black-mjuk)' }}>
        {text}
      </p>
    </div>
  )
}
