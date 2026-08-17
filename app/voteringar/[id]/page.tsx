import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db, heltal, namn, rader, partilinje } from '@/lib/db'
import { Linjeetikett, Rostnyckel } from '@/components/rostrad'
import { Stapel } from '@/components/stapel'
import { Forbehall, Tillbaka } from '@/components/system'
import { Bock, Kryss } from '@/components/ikoner'
import { korta, sidmetadata } from '@/lib/sajt'
import { rubrik } from '@/lib/votering'
import { avkoda } from '@/lib/text'

export const revalidate = 3600

type Debatt = { parti: string; anforanden: number; talare: number }
type Rost = {
  parti: string; ja: number; nej: number; avstar: number
  franvarande: number; totalt: number
}
type Reservation = { nummer: string; partier: string[] | null; text: string }

async function hamta(id: number) {
  const klient = db()
  // maybeSingle() svarar med data: null både när raden saknas och när frågan
  // fallerar. Felet läses därför uttryckligen — en punkt som inte finns ska ge
  // 404, ett databasfel ska ge felsidan, och de två får inte se likadana ut.
  const { data: k, error } = await klient
    .from('punkt_klartext')
    .select(
      'forslagspunkt_id, sakfraga, ja_innebar, nej_innebar, amne, sakerhet, modell, forslagspunkt!inner(id, rm, beteckning, punkt, rubrik, forslag, votering_id, motforslag_nummer, motforslag_partier, vinnare, bet_dok_id, betankande!inner(titel, organ, datum))',
    )
    .eq('forslagspunkt_id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!k) return null

  const f = (k as any).forslagspunkt
  const [roster, reservationer, debatt] = await Promise.all([
    rader<Rost>(klient.from('parti_rost')
      .select('parti, ja, nej, avstar, franvarande, totalt')
      .eq('votering_id', f.votering_id ?? '')),
    rader<Reservation>(klient.from('reservation').select('nummer, partier, text')
      .eq('bet_dok_id', f.bet_dok_id).eq('punkt', f.punkt).order('nummer')),
    // Debatten hör till betänkandet, inte till den enskilda förslagspunkten.
    // Se kommentaren i vyn — och i copyn nedan, som måste skriva ut det.
    rader<Debatt>(
      klient.from('betankande_debatt').select('parti, anforanden, talare')
        .eq('bet_dok_id', f.bet_dok_id).order('anforanden', { ascending: false })),
  ])
  // Avkodas här och inte vid renderingen: riksdagens texter bär HTML-entiteter,
  // och varje ställe som glömmer avkoda visar "f&ouml;rslag" ordagrant.
  return {
    k: k as any,
    f: { ...f, forslag: avkoda(f.forslag), rubrik: avkoda(f.rubrik) },
    roster,
    reservationer: reservationer.map((r) => ({ ...r, text: avkoda(r.text) })),
    debatt,
  }
}

/**
 * 2 587 voteringar är lika många landningssidor, och var och en är den enda
 * sida på sajten som besvarar exakt sin fråga. Utan egen metadata delades de
 * alla som "Riksdagskammaren — så röstade riksdagen".
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await rubrik(Number(id))
  if (!r) return {}
  return sidmetadata({
    // Sakfrågan kapas till 90 tecken. Den är i snitt 126 och som längst 247,
    // vilket duger som rubrik på sidan men inte i en webbläsarflik.
    titel: korta(r.sakfraga, 90),
    // Sakfrågan upprepas inte här — den står redan i titeln, och de flesta
    // börjar med "Om riksdagen skulle", vilket gjorde varje inledning till
    // "partier om om riksdagen skulle".
    beskrivning: `Hur de åtta partierna röstade, vad ett ja innebar och vad ett nej innebar. ${r.beteckning} i riksmötet ${r.rm}, förklarad på vanlig svenska.`,
    sokvag: `/voteringar/${id}`,
    // Sakfrågan ritas i en egen delningsbild av opengraph-image.tsx bredvid.
    egenBild: true,
  })
}

export default async function Votering({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await hamta(Number(id))
  if (!data) notFound()
  const { k, f, roster, reservationer, debatt } = data
  const anforanden = debatt.reduce((n, d) => n + Number(d.anforanden), 0)
  const talare = debatt.reduce((n, d) => n + Number(d.talare), 0)
  const flestAnforanden = Math.max(...debatt.map((d) => Number(d.anforanden)), 0)

  // Utskottets förslag ställs som ja, reservationen som nej. Utfallet räknas
  // därför fram ur rösterna i stället för att läsas ur forslagspunkt.vinnare:
  // det fältet innehåller även etiketterna 'bifall' och 'Avslagen' för punkter
  // som utskottet faktiskt vann, och skulle visa fel vinnare för fyra av dem.
  const ja = roster.reduce((n, r) => n + Number(r.ja), 0)
  const nej = roster.reduce((n, r) => n + Number(r.nej), 0)
  const avstar = roster.reduce((n, r) => n + Number(r.avstar), 0)
  const franvarande = roster.reduce((n, r) => n + Number(r.franvarande), 0)
  const avlagda = ja + nej + avstar
  const rostades = ja + nej > 0
  // Lika röstetal avgörs genom lottning. Det har inte inträffat i underlaget,
  // men får inte tyst hamna på reservationssidan om det gör det.
  const oavgjort = rostades && ja === nej
  const utskottetVann = rostades && ja > nej

  return (
    <main>
      <div className="pt-10">
        <Tillbaka href="/">Alla beslut</Tillbaka>
      </div>

      <section className="pb-10 pt-7">
        <div className="mono flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] uppercase tracking-[0.1em]"
             style={{ color: 'var(--etikett)' }}>
          <span>{f.beteckning} · punkt {f.punkt}</span>
          <span>{f.rm}</span>
          <span style={{ color: 'var(--accent)' }}>{k.amne}</span>
        </div>
        <h1 className="mt-5 max-w-[22ch] text-[clamp(2rem,5.8vw,60px)] font-extrabold leading-[0.98] tracking-[-0.04em]">
          {f.rubrik ?? k.sakfraga}
        </h1>
        <p className="mt-6 max-w-[62ch] text-[17px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          {k.sakfraga}
        </p>
        <p className="mt-3 text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
          Ur betänkandet <em>{f.betankande?.titel}</em> ({f.betankande?.organ})
        </p>
      </section>

      {k.sakerhet !== 'hög' && (
        <Forbehall rubrik="Osäker tolkning." className="mb-10">
          Underlaget för den här voteringen är ovanligt svårtolkat
          {k.sakerhet === 'låg' ? '' : ' på någon punkt'}. Läs originaltexterna
          längst ned innan du drar slutsatser.
        </Forbehall>
      )}

      {/* Vad ett ja och ett nej innebar — sidans viktigaste upplysning */}
      <section className="grid border-y sm:grid-cols-2" style={{ borderColor: 'var(--linje)' }}>
        <Innebord
          etikett="Ett ja innebar"
          text={k.ja_innebar}
          farg="var(--ja)"
          vann={utskottetVann}
          ikon={<Bock storlek={18} />}
          delare
        />
        <Innebord
          etikett="Ett nej innebar"
          text={k.nej_innebar}
          farg="var(--nej)"
          vann={rostades && !utskottetVann && !oavgjort}
          ikon={<Kryss storlek={18} />}
        />
      </section>

      {/* Rösträkningen */}
      <section className="py-12" style={{ borderBottom: '1px solid var(--linje)' }}>
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <Tal antal={ja} ord="ja" />
          <Tal antal={nej} ord="nej" farg="var(--nej)" />
          <Tal antal={avstar} ord="avstår" dampad />
          <Tal antal={franvarande} ord="frånv." dampad />
        </div>

        {avlagda > 0 && (
          <div className="mt-6 flex h-5 overflow-hidden rounded" role="img"
               aria-label={`${ja} ja, ${nej} nej, ${avstar} avstår`}>
            <span style={{ width: `${(100 * ja) / avlagda}%`, background: 'var(--ja)' }} />
            <span style={{ width: `${(100 * nej) / avlagda}%`, background: 'var(--nej)' }} />
            <span style={{ width: `${(100 * avstar) / avlagda}%`, background: 'var(--avstar)' }} />
          </div>
        )}

        {roster.length > 0 && (
          <>
            <div className="mt-6 flex flex-wrap gap-1.5">
              {[...roster]
                .sort((a, b) => Number(b.totalt) - Number(a.totalt))
                .map((r) => {
                  const linje = partilinje(r)
                  return (
                    <Linjeetikett
                      key={r.parti}
                      parti={r.parti}
                      linje={linje}
                      titel={`${r.parti}: ${linje} (Ja ${r.ja}, Nej ${r.nej}, Avstår ${r.avstar}, Frånv. ${r.franvarande})`}
                    />
                  )
                })}
            </div>
            <div className="mt-3.5">
              <Rostnyckel />
            </div>
          </>
        )}

        <p className="mt-6 max-w-[70ch] text-[14.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          {!rostades
            ? 'Ingen omröstning med namnupprop på den här punkten.'
            : oavgjort
              ? `Lika röstetal, ${ja} mot ${nej}. Utfallet avgjordes genom lottning.`
              : utskottetVann
                ? `Utskottets förslag vann med ${ja} röster mot ${nej}.`
                : `Reservation ${f.motforslag_nummer} vann med ${nej} röster mot ${ja}.`}
          {f.motforslag_partier?.length
            ? ` Motförslaget stöddes av ${f.motforslag_partier.join(', ')}.`
            : ''}
        </p>

        {/* Full uppdelning per parti. Etikettraden ovan visar linjen; den här
            visar hur många ledamöter som faktiskt låg bakom den. */}
        {roster.length > 0 && (
          <details className="mt-6">
            <summary className="cursor-pointer text-[14px] font-semibold transition-opacity duration-150 hover:opacity-70">
              Ledamot för ledamot, per parti
            </summary>
            <div className="mt-4 max-w-2xl">
              <div className="etikett grid grid-cols-[1fr_repeat(4,minmax(0,56px))] gap-x-3 pb-2.5"
                   style={{ borderBottom: '1px solid var(--linje)' }}>
                <span>Parti</span>
                <span className="text-right">Ja</span>
                <span className="text-right">Nej</span>
                <span className="text-right">Avstår</span>
                <span className="text-right">Frånv.</span>
              </div>
              {[...roster]
                .sort((a, b) => Number(b.totalt) - Number(a.totalt))
                .map((r) => (
                  <div key={r.parti}
                       className="grid grid-cols-[1fr_repeat(4,minmax(0,56px))] items-center gap-x-3 py-2.5"
                       style={{ borderBottom: '1px solid var(--linje)' }}>
                    <span className="text-[15px] font-semibold">{namn(r.parti)}</span>
                    <span className="tabular text-right text-[15px]">{r.ja}</span>
                    <span className="tabular text-right text-[15px]">{r.nej}</span>
                    <span className="tabular text-right text-[15px]">{r.avstar}</span>
                    <span className="tabular text-right text-[15px]" style={{ color: 'var(--black-svag)' }}>
                      {r.franvarande}
                    </span>
                  </div>
                ))}
            </div>
          </details>
        )}
      </section>

      {/* Debatten och originalet, sida vid sida */}
      <section className="grid gap-12 py-12 lg:grid-cols-2">
        <div>
          <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">Debatten</h2>
          {anforanden > 0 ? (
            <>
              <p className="mt-4 max-w-[46ch] text-[15px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
                {heltal(anforanden)} anföranden av {heltal(talare)} talare hölls i
                kammardebatten om betänkandet <em>{f.betankande?.titel}</em>.
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                {debatt.map((rad) => (
                  <div key={rad.parti}
                       className="grid grid-cols-[56px_1fr_40px] items-center gap-3.5 text-[14.5px]">
                    <span className="font-bold">{rad.parti}</span>
                    <Stapel
                      andel={(100 * Number(rad.anforanden)) / (flestAnforanden || 1)}
                      hojd={10}
                    />
                    <span className="tabular text-right">{heltal(Number(rad.anforanden))}</span>
                  </div>
                ))}
              </div>
              {/* Nivåskillnaden måste stå utskriven. Anförandena hör till hela
                  betänkandet; att fördela dem på enskilda förslagspunkter kräver
                  tolkning, och sajten tolkar inte anföranden. */}
              <p className="mt-5 max-w-[52ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
                Antalet anföranden i <strong style={{ color: 'var(--black)' }}>hela
                betänkandets</strong> debatt, inte bara den här punkten. Säger något
                om engagemanget, inget om innehållet. Ett försök att jämföra tal mot
                röst redovisas på{' '}
                <Link href="/metod#hyckleri" className="underline hover:opacity-70">metodsidan</Link>,
                och det höll inte.
              </p>
            </>
          ) : (
            <p className="mt-4 max-w-[46ch] text-[15px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
              Inga anföranden är registrerade för betänkandets debatt.
            </p>
          )}
        </div>

        <div>
          <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">Originalet</h2>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
            Texterna klarspråket bygger på, ordagrant ur betänkandet.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <Kalla titel="Utskottets förslag" text={f.forslag} />
            {reservationer.map((r) => (
              <Kalla
                key={r.nummer}
                titel={`Reservation ${r.nummer}${r.partier?.length ? ` (${r.partier.join(', ')})` : ''}`}
                text={r.text}
              />
            ))}
          </div>

          <Forbehall className="mt-5" litet>
            Klarspråket är maskinsammanfattat ur utskottets text ({k.modell},
            självskattad säkerhet: {k.sakerhet}). Jämför alltid mot originalet.
          </Forbehall>
        </div>
      </section>
    </main>
  )
}

/** En cell i "vad ett ja/nej innebar". Ikonen och etiketten delar röstfärg. */
function Innebord({ etikett, text, farg, vann, ikon, delare = false }: {
  etikett: string
  text: string
  farg: string
  vann: boolean
  ikon: React.ReactNode
  delare?: boolean
}) {
  return (
    <div
      className={`py-9 ${delare ? 'border-b sm:border-b-0 sm:border-r sm:pr-10' : 'sm:pl-10'}`}
      style={{ borderColor: 'var(--linje)' }}
    >
      <div className="flex items-center gap-2.5" style={{ color: farg }}>
        {ikon}
        <span className="etikett" style={{ color: farg }}>{etikett}</span>
        {vann && (
          <span className="etikett" style={{ color: 'var(--accent)' }}>· vann</span>
        )}
      </div>
      <p className="mt-3.5 max-w-[44ch] text-[17px] leading-[1.55]" style={{ color: 'var(--black-mjuk)' }}>
        {text}
      </p>
    </div>
  )
}

/** Ett tal i rösträkningen: siffran stor, enhetsordet litet bredvid. */
function Tal({ antal, ord, farg, dampad = false }: {
  antal: number
  ord: string
  farg?: string
  dampad?: boolean
}) {
  return (
    <span
      className="tabular text-[clamp(2rem,5vw,44px)] font-extrabold leading-none"
      style={{ color: farg ?? (dampad ? 'var(--black-svag)' : 'var(--black)') }}
    >
      {heltal(antal)}{' '}
      <span className="text-[20px] font-semibold" style={{ color: 'var(--black-svag)' }}>
        {ord}
      </span>
    </span>
  )
}

/** Originaltext som ett kort. Fälls ut — texterna är långa. */
function Kalla({ titel, text }: { titel: string; text: string }) {
  return (
    <details
      className="rounded-lg px-5 py-4"
      style={{ border: '1px solid var(--linje-stark)' }}
    >
      <summary className="cursor-pointer text-[15px] font-semibold transition-opacity duration-150 hover:opacity-70">
        {titel}
      </summary>
      <pre className="mt-3.5 whitespace-pre-wrap font-[inherit] text-[14px] leading-[1.6]"
           style={{ color: 'var(--black-mjuk)' }}>
        {text}
      </pre>
    </details>
  )
}
