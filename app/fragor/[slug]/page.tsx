import Link from 'next/link'
import { notFound } from 'next/navigation'
import { datum, heltal, lista, utskott } from '@/lib/db'
import { PARTIER, REGERINGSPARTIERNA, namn, partilinje, regeringslikhet } from '@/lib/parti'
import { FRAGOR, KOMPASS, fraga, hamtaFraga, utfall } from '@/lib/fragor'
import { rakneord } from '@/lib/text'
import { regeringsspann } from '@/lib/partier'
import { Rostrad, Rostnyckel } from '@/components/rostrad'
import { Kompasslank } from '@/components/kompasslank'
import { Etikett, Forbehall, Textlank, Tillbaka } from '@/components/system'
import { Bock, Kryss } from '@/components/ikoner'
import { korta, sidmetadata } from '@/lib/sajt'

export const revalidate = 3600

/** Nio kända adresser. Inga andra ska svara 200. */
export function generateStaticParams() {
  return FRAGOR.map((f) => ({ slug: f.slug }))
}
export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const f = fraga(slug)
  if (!f) return {}
  return sidmetadata({
    titel: korta(f.rubrik, 90),
    beskrivning: `${f.ingress} Så röstade de åtta partierna, och vad ett ja respektive ett nej innebar.`,
    sokvag: `/fragor/${slug}`,
    // Ritas av opengraph-image.tsx bredvid, med frågan som rubrik.
    egenBild: true,
  })
}

export default async function Fragesida({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const f = fraga(slug)
  if (!f) notFound()
  const d = await hamtaFraga(f.forslagspunkt)
  if (!d) notFound()

  const u = utfall(d.roster)
  const syskon = f.syskon ? fraga(f.syskon) : undefined
  const syskonData = syskon ? await hamtaFraga(syskon.forslagspunkt) : undefined
  const ovriga = FRAGOR.filter((x) => x.slug !== f.slug && x.slug !== f.syskon)

  // De tre som röstar närmast identiskt, med spannet räknat ur databasen och
  // inte skrivet för hand. Talet stod hårdkodat som "99,9–100 %" på tre sidor
  // innan regeringsspann() infördes, och en hårdkodad andel blir tyst osann
  // nästa gång ETL:n körs.
  //
  // Villkoret prövar den här voteringen och inte prosan nedan. Ett tidigare
  // utförande utlöste noten när ett av de tre stod på nej-sidan — vilket
  // aldrig inträffar i de nio, eftersom alla tre satt i regeringsunderlaget
  // och alltså alltid röstade med utskottet. Noten var därför död kod.
  // Risken ligger åt andra hållet: läsaren ser tre identiska etiketter i
  // röstraden och kan läsa in ett samförstånd i just den här frågan, när det
  // är så de röstar i praktiken varje gång.
  const utbytbara = REGERINGSPARTIERNA.map(namn)
  const spann = await regeringsspann()
  const tre = regeringslikhet(d.roster)

  // Partierna på motförslagets sida, med fulla namn. Räknas fram ur rösterna
  // och inte ur motforslag_partier: det fältet säger vilka som skrev under
  // reservationen, medan sidan påstår hur kammaren röstade. De två skiljer sig
  // åt — på tandvårdspunkten stod tre partier bakom motförslaget och exakt de
  // tre röstade nej, men det är inte en regel som håller överallt.
  //
  // Två fällor, båda utlösta:
  //
  // `parti_rost` innehåller gruppen `-`, de partilösa, som PARTIER inte
  // innehåller. Utan filtret läste DCA-sidan "På nej-sidan stod - och
  // Vänsterpartiet" — en av de partilösa röstade nej. Rösten finns kvar i
  // talen ovanför, där den hör hemma: det är kammarens röstetal och inte
  // partiernas.
  //
  // Linjen kommer ur partilinje() och inte ur en jämförelse skriven här.
  // Regeln finns redan två gånger, i SQL och i TypeScript, och `npm run
  // kontrollera` prövar dem mot varandra just därför att en tredje kopia
  // driver isär utan att något felar.
  const nejsidan = d.roster
    .filter((r) => (PARTIER as readonly string[]).includes(r.parti) && partilinje(r) === 'Nej')
    .map((r) => namn(r.parti))
    .sort((a, b) => a.localeCompare(b, 'sv'))

  return (
    <main>
      <div className="pt-10">
        <Tillbaka href="/fragor">Alla {rakneord(FRAGOR.length)} frågor</Tillbaka>
      </div>

      <section className="pb-9 pt-7">
        <Etikett ton="signal">{d.amne}</Etikett>
        <h1 className="mt-5 max-w-[20ch] text-[clamp(2rem,5.8vw,60px)] font-extrabold leading-[0.98] tracking-[-0.04em]">
          {f.rubrik}
        </h1>
        <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          {f.ingress}
        </p>
        {/* Svaret på rubrikens fråga, ovanför vecket.
            Rubriken ställer en fråga och delningskortet ställer samma fråga —
            då ska svaret inte ligga under två förbehåll och ett metodblock.
            Läxan från /fynd var förbehåll före TOLKNING, inte före fakta:
            utfallsraden är aritmetik utan tolkningsrisk och kan stå här, medan
            asymmetriförbehållet står kvar före partilistan, som är det som kan
            feltolkas. En journalist med fyrtio sekunder behöver rubrik → svar
            → siffra → källa, i den ordningen. */}
        {u.rostades && (
          <p className="tabular mt-5 text-[17px] font-semibold leading-[1.5]">
            {u.oavgjort
              ? `Lika röstetal, ${heltal(u.ja)} mot ${heltal(u.nej)} — avgjort genom lottning`
              : `Riksdagen röstade ${u.utskottetVann ? 'ja' : 'nej'} med ${heltal(
                  u.utskottetVann ? u.ja : u.nej,
                )} röster mot ${heltal(u.utskottetVann ? u.nej : u.ja)}`}{' '}
            <span className="font-normal" style={{ color: 'var(--black-svag)' }}>
              · {datum(d.datum)}
            </span>
          </p>
        )}
        {/* Källraden står i heron och inte i en fotnot: den som ska kunna lita
            på sidan behöver veta varifrån urvalet kommer innan hen läser
            listan, inte efter. */}
        <p className="mt-5 max-w-[58ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
          Den här frågan är en av {rakneord(FRAGOR.length)} som riksdagen
          avgjort i en enskild votering, av de {KOMPASS.ord} som{' '}
          <Kompasslank /> ställer. Formuleringen ovan är vår egen — vi lånar
          vilka frågor som ligger på bordet, inte hur de är ställda.
        </p>
      </section>

      {/* Asymmetrin står FÖRE listan, inte efter.
          Läxan från startsidan: ett förbehåll som kommer efter talet läses av
          den som redan dragit sin slutsats. Här är risken att sidan ser ut att
          visa oppositionen som drivande och regeringen som passiv — vilket är
          datans form och inte en mätning. */}
      <Forbehall rubrik="Läs listan med det här i minnet.">
        I en svensk votering ställs utskottets förslag som ja och motförslaget
        som nej, och motförslaget kommer nästan alltid från ett
        oppositionsparti — det är så en opposition gör sin linje synlig.
        Regeringens egen politik går oftast en annan väg, genom propositioner
        som riksdagen godkänner utan namnupprop, och lämnar därför inget avtryck
        alls i röstdata. Listan nedan visar vilka partier som ställde sig bakom
        just det här förslaget just den dagen. Den visar inte vem som drivit
        frågan hårdast, och att ett parti saknas på nej-sidan är inget bevis för
        vad partiet tycker.
      </Forbehall>

      {d.sakerhet !== 'hög' && (
        <Forbehall rubrik="Osäker tolkning." className="mt-4">
          Klarspråket för den här voteringen är ovanligt svårtolkat. Läs
          originaltexterna på voteringssidan innan du drar slutsatser.
        </Forbehall>
      )}

      {/* Vad riksdagen faktiskt röstade om. Bron mellan väljarens fråga och
          kammarens förslagspunkt, och den enda plats där sidan får säga att de
          två inte är samma sak. */}
      <section className="regel mt-12 py-12">
        <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">
          Det här stod på voteringen
        </h2>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          {d.sakfraga}
        </p>
        <div className="mono mt-5 flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] uppercase tracking-[0.1em]"
             style={{ color: 'var(--etikett)' }}>
          <span>{d.beteckning} · punkt {d.punkt}</span>
          <span>{datum(d.datum)}</span>
          <span>{d.rm}</span>
        </div>
        <p className="mt-3 max-w-[62ch] text-[13.5px] leading-[1.55]" style={{ color: 'var(--black-svag)' }}>
          Ur betänkandet <em>{d.betankande}</em>, {utskott(d.organ).toLowerCase()}.
          {/* Vem som skrev motförslaget är asymmetrin gjord konkret: förbehållet
              ovanför säger att nej-sidan nästan alltid är oppositionen, och det
              här är raden där läsaren kan se att det stämmer den här gången. */}
          {d.motforslag_nummer && d.motforslag_partier?.length
            ? ` Motförslaget var reservation ${d.motforslag_nummer}, skriven av ${lista(d.motforslag_partier.map(namn))}.`
            : ''}
        </p>
      </section>

      <section className="grid border-y sm:grid-cols-2" style={{ borderColor: 'var(--linje)' }}>
        <Innebord
          etikett="Ett ja innebar"
          text={d.ja_innebar}
          farg="var(--ja)"
          vann={u.utskottetVann}
          ikon={<Bock storlek={18} />}
          delare
        />
        <Innebord
          etikett="Ett nej innebar"
          text={d.nej_innebar}
          farg="var(--nej)"
          vann={u.rostades && !u.utskottetVann && !u.oavgjort}
          ikon={<Kryss storlek={18} />}
        />
      </section>

      {/* Hela sidan vilar på de två styckena ovanför, och de är maskinskrivna.
          Det måste stå intill dem och inte i en fotnot — en sida som ber en
          journalist att lita på den ska säga var texten kommer ifrån innan hon
          citerar den, och länken bredvid går till originalet ordagrant. */}
      <Forbehall className="mt-6" litet>
        De två styckena ovan är sammanfattade ur utskottets egen förslagstext
        med språkmodell ({d.modell}, självskattad säkerhet: {d.sakerhet}), inte
        skrivna för hand. Rösterna nedan är däremot riksdagens egna uppgifter.
        Originaltexterna ligger ordagrant på{' '}
        <Link href={`/voteringar/${f.forslagspunkt}`} className="underline hover:opacity-70">
          voteringssidan
        </Link>
        , och en frågesida som inte tål jämförelsen mot dem är fel.
      </Forbehall>

      <section className="py-12" style={{ borderBottom: '1px solid var(--linje)' }}>
        <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">Så röstade partierna</h2>

        <div className="mt-7 flex flex-col gap-3">
          <Rostrad rader={d.roster} />
          <Rostnyckel />
        </div>

        <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <Tal antal={u.ja} ord="ja" />
          <Tal antal={u.nej} ord="nej" farg="var(--nej)" />
          <Tal antal={u.avstar} ord="avstår" dampad />
          <Tal antal={u.franvarande} ord="frånv." dampad />
        </div>

        <p className="mt-7 max-w-[66ch] text-[15.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          {!u.rostades
            ? 'Ingen omröstning med namnupprop på den här punkten.'
            : u.oavgjort
              ? `Lika röstetal, ${heltal(u.ja)} mot ${heltal(u.nej)}. Utfallet avgjordes genom lottning.`
              : u.utskottetVann
                ? `Utskottets förslag vann med ${heltal(u.ja)} röster mot ${heltal(u.nej)}.`
                : `Motförslaget vann med ${heltal(u.nej)} röster mot ${heltal(u.ja)}.`}
          {nejsidan.length > 0 && ` På nej-sidan stod ${lista(nejsidan)}.`}
        </p>

        {/* Skrivs ut på varje sida där ett av de tre namnges, i klartext och
            inte som en fotnot. Se CLAUDE.md: vilket av dem som hamnar i en
            mening avgörs av tiondelar. */}
        {tre.lika && tre.linje && (
          <p className="mt-4 max-w-[66ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
            {lista(utbytbara)} landade alla på {tre.linje.toLowerCase()} här.
            Det säger inget särskilt om just den här frågan — de tre röstade
            lika i {spann} av mandatperiodens samtliga voteringar.
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          <Textlank href={`/voteringar/${f.forslagspunkt}`}>
            Se voteringen med originaltexterna
          </Textlank>
          <Textlank href={`/?amne=${encodeURIComponent(d.amne)}`}>
            Alla beslut om {d.amne}
          </Textlank>
        </div>
      </section>

      {/* Den andra skogsvoteringen. Två träffar på samma ställningstagande är
          svårare att vifta bort än en — men bara om sidan säger att de hör
          ihop. Talen räknas fram ur data, aldrig skrivna för hand. */}
      {syskon && syskonData && (
        <section className="regel py-12">
          <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">
            Samma sak prövades en gång till
          </h2>
          <p className="mt-4 max-w-[64ch] text-[16px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
            Kravet på att stoppa avverkning i skog med höga naturvärden restes
            också {datum(syskonData.datum)}, i {syskonData.beteckning} punkt{' '}
            {syskonData.punkt}. {utfallsmening(syskonData.roster)} Det är alltså
            inte ett enstaka utfall utan samma ställningstagande, prövat två
            gånger under mandatperioden.
          </p>
          <Textlank href={`/fragor/${syskon.slug}`} className="mt-6">
            {syskon.rubrik}
          </Textlank>
        </section>
      )}

      <section className="regel py-12">
        <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">Övriga frågor</h2>
        <ol className="mt-6 grid gap-x-10 sm:grid-cols-2">
          {ovriga.map((x) => (
            <li key={x.slug}>
              <Link
                href={`/fragor/${x.slug}`}
                className="block py-4 text-[16.5px] font-semibold leading-[1.4] transition-opacity duration-150 hover:opacity-70"
                style={{ borderTop: '1px solid var(--linje)' }}
              >
                {x.rubrik}
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}

/** En mening om hur en votering gick, räknad ur rösterna. */
function utfallsmening(roster: Parameters<typeof utfall>[0]) {
  const u = utfall(roster)
  if (!u.rostades) return 'Den punkten avgjordes utan namnupprop.'
  if (u.oavgjort) return `Då blev det lika röstetal, ${heltal(u.ja)} mot ${heltal(u.nej)}.`
  return u.utskottetVann
    ? `Då föll det med ${heltal(u.nej)} röster mot ${heltal(u.ja)}.`
    : `Då vann det med ${heltal(u.nej)} röster mot ${heltal(u.ja)}.`
}

/** En cell i "vad ett ja/nej innebar". Samma form som på voteringssidan. */
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
        {vann && <span className="etikett" style={{ color: 'var(--accent)' }}>· vann</span>}
      </div>
      <p className="mt-3.5 max-w-[46ch] text-[16.5px] leading-[1.55]" style={{ color: 'var(--black-mjuk)' }}>
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
