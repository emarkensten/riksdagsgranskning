import {
  antal, datum, db, heltal, lista, namn, rader, rakna, tal, REGERINGSPARTIERNA,
} from '@/lib/db'
import { Stapel } from '@/components/stapel'
import { Etikett, Forbehall, Nyckeltal, Textlank } from '@/components/system'
import { regeringsspann } from '@/lib/partier'
import { AVSANDARE, NYTT_ARENDE, REPO, sidmetadata } from '@/lib/sajt'
import AMNEN from '@/lib/amnen.json'

export const revalidate = 3600

export const metadata = sidmetadata({
  titel: 'Så räknar jag',
  beskrivning:
    'Svar på de frågor talen väcker: hur talen räknas, om ett nej betyder motstånd, vem som skrev klarspråket, varför två sidor säger olika många — och vad materialet inte kan svara på.',
  sokvag: '/metod',
})

/** Ordningen de redovisas i, inte den ordning databasen råkar returnera. */
const NIVAER = ['hög', 'medel', 'låg'] as const

/**
 * Sidans register, och därmed dess FAQ. Posterna är frågor därför att en läsare
 * som undrar om AI-texterna går att lita på inte letar efter uppslagsordet
 * "Klarspråket och ämnena" — den läsaren söker på sin fråga, inte på sajtens
 * begrepp.
 *
 * Ankarnamnen är oförändrade och får inte döpas om: sidhuvudets fot, /partier,
 * /amnen, /franvaro, /samstammighet och båda voteringssidorna länkar in i dem.
 * Varje avsnitts h2 upprepar frågan ordagrant — en läsare som klickar på en
 * fråga ska landa på den, inte på något som bara liknar den.
 */
const INNEHALL = [
  ['underlaget', 'Vad bygger siffrorna på?'],
  ['definitioner', 'Hur räknas samstämmighet, frånvaro och partilinje?'],
  ['ja-och-nej', 'Betyder ett nej att partiet är emot förslaget?'],
  ['klarsprak', 'Kan jag lita på AI-sammanfattningarna?'],
  ['olika-tal', 'Varför säger startsidan och voteringssidan olika många?'],
  ['regeringssidan', 'Fick regeringen igenom sin politik?'],
  ['tre-lika', 'Varför ser tre av partisidorna likadana ut?'],
  ['begransningar', 'Vad kan materialet inte svara på?'],
  ['avsandare', 'Vem ligger bakom sajten?'],
  ['fel', 'Hittar du ett fel?'],
  ['hyckleri', 'Säger politikerna en sak och röstar tvärtom?'],
] as const

type Utfall = { parti: string; voteringar: number; med_vinnaren: number; andel: number }
type Riksmote = { rm: string; roster: number; franvarande: number; franvaroandel: number }
/** Tre uteslutande fall som summerar till listade. Se migrationen. */
type Uppropstyp = { listade: number; sakfragan: number; motivfragan: number; utan_upprop: number }

async function hamta() {
  const klient = db()

  const [
    utfall,
    disciplin,
    klartext,
    riksmoten,
    likhetsspann,
    forsta,
    sista,
    hamtat,
    punkter,
    utanNamnupprop,
    betankanden,
    anforanden,
    forluster,
    retorik,
    uppropstyp,
  ] = await Promise.all([
    rader<Utfall>(klient.from('parti_utfall').select('*').order('andel', { ascending: false })),
    rader<{ avlagda: number; avvikande: number }>(
      klient.from('parti_disciplin').select('avlagda, avvikande')),
    rader<{ modell: string; sakerhet: string; antal: number }>(
      klient.from('klartext_summering').select('modell, sakerhet, antal')),
    rader<Riksmote>(
      klient.from('riksmote_summering').select('rm, roster, franvarande, franvaroandel').order('rm')),
    regeringsspann(),
    rader<{ datum: string }>(klient.from('betankande').select('datum').order('datum').limit(1)),
    rader<{ datum: string }>(
      klient.from('betankande').select('datum').order('datum', { ascending: false }).limit(1)),
    rader<{ uppdaterad: string }>(
      klient.from('ledamot').select('uppdaterad').order('uppdaterad', { ascending: false }).limit(1)),
    rakna(antal(klient, 'forslagspunkt'), 'förslagspunkter'),
    rakna(antal(klient, 'forslagspunkt').is('votering_id', null), 'punkter utan votering'),
    rakna(antal(klient, 'betankande'), 'betänkanden'),
    rakna(antal(klient, 'anforande'), 'anföranden'),
    rakna(antal(klient, 'utskottet_forlorade'), 'utskottsförluster'),
    rader<{ overensstammelse: string; antal: number }>(
      klient.from('retorik_summering').select('overensstammelse, antal')),
    // Voteringssidans tal och vad uppropen gällde, ur samma rad.
    //
    // Vyn räknar över votering_lista, alltså voteringssidans egen vy. Att räkna
    // om punkt_klartext i stället vore att bygga in precis den glidning
    // avsnittet #olika-tal finns för att förklara: votering_lista joinar mot
    // betankande, klartext_summering gör det inte, och en punkt vars betänkande
    // saknas faller ur den ena men inte ur den andra.
    //
    // Tre uteslutande fall, inte en subtraktion. Sidan påstår om punkterna utan
    // sakfrågeupprop att uppropet gällde motivfrågan, och det påståendet ska
    // vara räknat. Se migrationen 20260816094517.
    rader<Uppropstyp>(
      klient.from('punkt_uppropstyp').select('listade, sakfragan, motivfragan, utan_upprop').limit(1)),
  ])

  // PostgREST lämnar numeric som sträng. Talen måste därför gå genom Number()
  // innan de summeras, annars blir additionen konkatenering.
  const utfallRader = utfall.map((u) => ({ ...u, andel: Number(u.andel) }))
  const rm = riksmoten.map((r) => ({ ...r, franvaroandel: Number(r.franvaroandel) }))

  const avlagda = disciplin.reduce((n, p) => n + Number(p.avlagda), 0)
  const avvikande = disciplin.reduce((n, p) => n + Number(p.avvikande), 0)
  const roster = rm.reduce((n, r) => n + Number(r.roster), 0)
  const franvarande = rm.reduce((n, r) => n + Number(r.franvarande), 0)

  // Summeras per nivå, inte nycklas på den: klartext_summering grupperar på
  // modell OCH säkerhet, så två modeller ger två rader med samma nivå.
  const sakerhet = NIVAER.map((niva) => [
    niva,
    klartext.filter((k) => k.sakerhet === niva).reduce((n, k) => n + Number(k.antal), 0),
  ] as const)
  const forklarade = klartext.reduce((n, k) => n + Number(k.antal), 0)

  const retorikRader = retorik
    .map((r) => [r.overensstammelse, Number(r.antal)] as const)
    .sort((a, b) => b[1] - a[1])

  // Alla åtta rader i parti_utfall bär samma antal, eftersom varje parti har en
  // linje i varje votering. Läs det utan att förlita sig på sorteringen.
  //
  // Just den här vyn, inte en räkning på jamn_votering: parti_utfall är joinad
  // mot punkt_klartext och räknar alltså de voteringar sajten faktiskt kan
  // förklara. jamn_votering täcker varje votering_id i rost, och skillnaden
  // mellan de två universumen skulle göra utanRostdata negativ den dag en
  // votering importeras utan klarspråk.
  const voteringar = utfallRader.length
    ? Math.max(...utfallRader.map((u) => u.voteringar))
    : 0

  return {
    utfall: utfallRader,
    voteringar,
    avlagda,
    avvikande,
    avvikelseandel: avlagda > 0 ? (100 * avvikande) / avlagda : 0,
    riksmoten: rm,
    roster,
    franvarande,
    franvaroandel: roster > 0 ? (100 * franvarande) / roster : 0,
    modeller: [...new Set(klartext.map((k) => k.modell))],
    sakerhet,
    likhetsspann,
    forsta: forsta[0]?.datum,
    sista: sista[0]?.datum,
    hamtat: hamtat[0]?.uppdaterad,
    punkter,
    utanNamnupprop,
    forklarade,
    betankanden,
    anforanden,
    forluster,
    retorik: retorikRader,
    retorikTotalt: retorikRader.reduce((n, [, v]) => n + v, 0),
    // PostgREST lämnar count() som sträng. Number() innan de når sidan: heltal()
    // formaterar bara tal, och en sträng passerar rakt igenom som "2587" i
    // stället för "2 587".
    listade: Number(uppropstyp[0]?.listade ?? 0),
    motivupprop: Number(uppropstyp[0]?.motivfragan ?? 0),
    utanUpprop: Number(uppropstyp[0]?.utan_upprop ?? 0),
    sakfrageupprop: Number(uppropstyp[0]?.sakfragan ?? 0),
  }
}

export default async function Metod() {
  const d = await hamta()

  // Spann och inte det bästa partiets tal. Meningen namnger alla tre, och de
  // ligger inte lika: M och L på 2 558, KD på 2 555. Att skriva ut det högsta
  // som allas gjorde påståendet osant mot tabellen tio rader längre ned.
  const regeringens = d.utfall
    .filter((u) => REGERINGSPARTIERNA.some((p) => p === u.parti))
    .map((u) => u.med_vinnaren)
  const hogst = regeringens.length ? Math.max(...regeringens) : 0
  const samst = regeringens.length ? Math.min(...regeringens) : 0
  // Skillnaden mellan förklarade punkter och voteringar är punkter som fick en
  // klarspråksförklaring men aldrig ett namnupprop om sakfrågan.
  const utanRostdata = d.forklarade - d.voteringar
  // Avsnittet #olika-tal finns när voteringssidan listar fler beslut än
  // startsidan räknar mönster på — oavsett vilket av de två skälen som gör det.
  // Att bara fråga efter motivfrågorna hade dolt avsnittet, och därmed
  // varningen, precis den gång punkter saknar röstdata utan att någon
  // motivfråga finns kvar att hänga förklaringen på.
  const olikaTal = d.motivupprop > 0 || d.utanUpprop > 0

  return (
    <main>
      <section className="pb-10 pt-16">
        <Etikett className="stig" ton="signal">Metod och källor</Etikett>
        <h1 className="display stig mt-6 text-[clamp(2.8rem,8.5vw,96px)]" style={{ animationDelay: '80ms' }}>
          Så räknar jag.
        </h1>
        <p className="stig mt-7 max-w-[52ch] text-[clamp(17px,2.2vw,20px)] leading-[1.45]"
           style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}>
          Varje tal på den här sajten kommer ur riksdagens egna öppna data och
          går att räkna om. Nedan står frågorna talen väcker, med
          svaret först i varje avsnitt.
        </p>
      </section>

      {/* Frågan om de två talen försvinner med sitt avsnitt den dag talen är
          lika. Ett navpiller som lovar en förklaring till en skillnad som inte
          finns är värre än inget piller alls. */}
      <nav aria-label="Frågor på sidan" className="regel flex flex-wrap gap-2 py-7">
        {INNEHALL.filter(([id]) => id !== 'olika-tal' || olikaTal).map(([id, text]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-full px-[14px] py-2 text-[13.5px] font-medium transition-colors duration-150 hover:bg-[var(--papper-djup)]"
            style={{ border: '1px solid var(--linje-stark)', color: 'var(--black-mjuk)' }}
          >
            {text}
          </a>
        ))}
      </nav>

      <section id="underlaget" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">Vad bygger siffrorna på?</h2>

        <div className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-4">
          <Nyckeltal ton="signal">{heltal(d.voteringar)}</Nyckeltal>
          <p className="mb-2 max-w-[46ch] text-[18px] leading-[1.5]" style={{ color: 'var(--black-mjuk)' }}>
            voteringar med namnupprop ligger bakom varje mönster på sajten. Det
            är samtliga voteringar i mandatperioden där namnuppropet gällde
            sakfrågan — alltså vad som skulle beslutas.
          </p>
        </div>

        <div className="mt-12 max-w-3xl">
          <Rad tal={d.forklarade} text="förslagspunkter har en klarspråksförklaring" />
          {/* Kort här med flit. Varför de 18 inte räknas är en egen fråga med
              eget avsnitt — den här raden ska bara få talen att gå ihop. */}
          <Rad
            tal={utanRostdata}
            text="av dem fick namnupprop om motivfrågan i stället för om sakfrågan, och räknas därför inte in i något mönster"
          />
          <Rad
            tal={d.utanNamnupprop}
            text={`av totalt ${heltal(d.punkter)} förslagspunkter avgjordes helt utan omröstning`}
          />
          <Rad tal={d.roster} text="röstningstillfällen — en rad per ledamot och votering, frånvaro inräknad" />
          <Rad tal={d.betankanden} text="betänkanden från riksdagens utskott" />
          <Rad tal={d.anforanden} text="anföranden är hämtade och sparade, men sammanfattas inte av sajten" />
        </div>

        <p className="mt-8 max-w-[64ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
          Källa:{' '}
          <a href="https://data.riksdagen.se" className="underline hover:opacity-70"
             target="_blank" rel="noreferrer">data.riksdagen.se</a>. Hämtat{' '}
          {datum(d.hamtat)}, och sedan dess oförändrat — sajten uppdateras inte
          automatiskt. Materialet täcker riksmötena {d.riksmoten[0]?.rm} till{' '}
          {d.riksmoten[d.riksmoten.length - 1]?.rm}, med betänkanden daterade{' '}
          {datum(d.forsta)} till {datum(d.sista)}.
        </p>

        {/* Sidans inledning påstår att varje tal går att räkna om. Utan en väg
            till rådata är det ett påstående läsaren får ta på förtroende —
            alltså precis det sajten annars vägrar be om. Länken står därför här,
            intill påståendet, och inte i en fotnot. */}
        <div className="regel mt-12 pt-9">
          <h3 className="text-[26px] font-extrabold tracking-[-0.025em]">Räkna om det själv</h3>
          <p className="mt-3 max-w-[64ch] text-[15.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
            En rad per votering och parti, med ja, nej, avstår och frånvarande —
            samma tal som varje mått på sajten räknas ur. Partilinje,
            samstämmighet, frånvaro per parti, ensam mot alla och utfall går alla
            att härleda ur den här filen och{' '}
            <a href="#definitioner" className="underline hover:opacity-70">
              definitionerna i nästa avsnitt
            </a>.
          </p>
          <p className="mt-3 max-w-[64ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
            De {heltal(utanRostdata)} punkter vars namnupprop gällde motivfrågan
            ingår inte, av samma skäl som de inte räknas in i något mått.
          </p>
          <Textlank href="/underlag" className="mt-6">
            Hämta partirösterna som CSV
          </Textlank>
        </div>
      </section>

      <section id="definitioner" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik max-w-[24ch] text-[clamp(1.8rem,4.4vw,44px)]">
          Hur räknas samstämmighet, frånvaro och partilinje?
        </h2>
        <p className="mt-5 max-w-[58ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          Efter sex regler, och de står allihop nedan — regeln först, förbehållet
          efter. De är valda för att vara enkla nog att kontrollera, inte för att
          vara raffinerade.
        </p>

        <div className="mt-12 grid gap-12">
          <Definition rubrik="Partiets linje" regel="Det alternativ flest av partiets närvarande ledamöter valde.">
            <p>
              Frånvaro räknas inte in. Ett parti med 30 ja-röster och 40
              frånvarande hade linjen ja — att redovisa <em>frånvarande</em> som
              partiets hållning vore ett sakfel. Avstår är en egen linje och
              behandlas som ett ställningstagande, inte som ett uteblivet svar.
            </p>
            <p>
              Enskilda ledamöter som röstar annorlunda ändrar inte partiets
              linje. De är också sällsynta: {heltal(d.avvikande)} av{' '}
              {heltal(d.avlagda)} avlagda röster avviker, alltså{' '}
              {tal(d.avvikelseandel, 3)} %.
            </p>
          </Definition>

          <Definition
            rubrik="Samstämmighet"
            regel="Andelen voteringar där två partier hamnade på samma linje."
          >
            <p>
              Alla 28 partipar räknas likadant, i alla {AMNEN.length} ämnen, utan
              att något par valts ut i förväg och utan höger–vänsteraxel. Ett par
              som båda röstade avstår räknas som eniga, eftersom avstår är en
              linje.
            </p>
            <p>
              Måttet säger vad partierna gjorde, inte varför. Två partier kan
              rösta lika av rakt motsatta skäl, och en hög siffra är inte i sig
              ett påstående om samarbete.
            </p>
          </Definition>

          <Definition
            rubrik="Ensam mot alla"
            regel="En votering där partiet var det enda med sin linje — de sju andra stod någon annanstans."
          >
            <p>
              Kravet är att alla åtta partier har en linje i voteringen. Punkter
              där något parti saknar linje räknas inte, eftersom ett parti annars
              kunde se ensamt ut bara för att en jämförelse saknades.
            </p>
            <p>
              En nolla betyder inte att partiet aldrig går sin egen väg. Den
              betyder att partiet aldrig gjorde det <em>utan sällskap</em> — och
              för {lista(REGERINGSPARTIERNA.map(namn))} är det nästan mekaniskt
              omöjligt, eftersom{' '}
              <a href="#tre-lika" className="underline hover:opacity-70">
                de tre röstar lika i nästan allt
              </a>.
            </p>
          </Definition>

          <Definition
            rubrik="Frånvaro"
            regel="Andelen röstningstillfällen där ledamoten står som frånvarande i riksdagens protokoll."
          >
            <p>
              Räknat på rösterna, inte på voteringarna. Talet för hela
              mandatperioden är {tal(d.franvaroandel)} %, men det skiljer sig
              kraftigt mellan riksmötena — den vanligaste förväxlingen i det här
              materialet.
            </p>
            <div className="max-w-md">
              {d.riksmoten.map((r) => (
                <div key={r.rm}
                     className="tabular grid grid-cols-[1fr_auto_auto] items-baseline gap-x-6 py-2.5 text-[14.5px]"
                     style={{ borderBottom: '1px solid var(--linje)' }}>
                  <span>{r.rm}</span>
                  <span style={{ color: 'var(--black-svag)' }}>
                    {heltal(Number(r.franvarande))} av {heltal(Number(r.roster))}
                  </span>
                  <span className="whitespace-nowrap text-right font-bold">
                    {tal(r.franvaroandel)} %
                  </span>
                </div>
              ))}
              <div className="tabular grid grid-cols-[1fr_auto_auto] items-baseline gap-x-6 py-2.5 text-[14.5px]"
                   style={{ borderBottom: '1px solid var(--linje)' }}>
                <span className="font-bold">hela perioden</span>
                <span style={{ color: 'var(--black-svag)' }}>
                  {heltal(d.franvarande)} av {heltal(d.roster)}
                </span>
                <span className="whitespace-nowrap text-right font-bold" style={{ color: 'var(--accent)' }}>
                  {tal(d.franvaroandel)} %
                </span>
              </div>
            </div>
            <p>
              Skälet till frånvaron finns inte i öppna data. En hög siffra är
              därför inte ett påstående om försummelse — bara om hur ofta
              ledamoten inte deltog.
            </p>
          </Definition>

          <Definition
            rubrik="Jämn votering, och när frånvaron avgjorde"
            regel="En votering avgjord med tre rösters marginal eller mindre."
          >
            <p>
              <em>Frånvaron avgjorde</em> betyder att utfallet hade blivit det
              motsatta om varje frånvarande ledamot röstat med sitt parti.
              Räkningen lägger alltså tillbaka de frånvarande på partiets linje
              och ser efter om segraren byts.
            </p>
            <p>
              Det är aritmetik, inte en anklagelse. Riksdagen kvittar frånvaro,
              och vilka voteringar som kvittades framgår inte av öppna data — se
              begränsningarna nedan.
            </p>
          </Definition>

          <Definition
            rubrik="Ämnets enighet"
            regel="Genomsnittet av alla 28 partipars samstämmighet inom ämnet."
          >
            <p>
              Talet är sannolikheten att två slumpvis valda partier röstade lika
              i ämnet. Ett lågt tal betyder att kammaren spänner brett, inte att
              en viss konflikt är skarp.
            </p>
            <p>
              Jämförelsen mot <em>normalt</em> är samma partipars samstämmighet i
              alla frågor. Skillnaden mellan de två talen är det ämnessidan
              rangordnar på.
            </p>
          </Definition>
        </div>
      </section>

      <section id="ja-och-nej" className="regel scroll-mt-6 py-16">
        {/* Frågan sätts i display-skalan, inte i .rubrik: det här är sidans
            farligaste missförstånd och avsnittet ska synas i ögonvrån. Signalen
            sitter på frågetecknet, där punkten satt förut. */}
        <h2 className="rubrik max-w-[22ch] text-[clamp(1.9rem,5.5vw,46px)] leading-[1.05]">
          Betyder ett nej att partiet är emot förslaget
          <span style={{ color: 'var(--accent)' }}>?</span>
        </h2>
        <div className="mt-7 grid max-w-[66ch] gap-4 text-[16.5px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Oftast tvärtom. I en svensk votering ställs utskottets förslag som ja
            och en reservation som nej, så ett parti som röstar nej till mer
            pengar till skolan har nästan alltid röstat för sitt eget förslag om
            mer pengar till skolan.
          </p>
          <p>
            Det är den enskilt viktigaste fällan i det här materialet. Ett
            verktyg som läser varje nej som motstånd mot sakfrågan producerar
            hundratals falska anklagelser. Därför står det på varje voteringssida
            utskrivet vad reservationen ville, och vilka partier som stod bakom
            den.
          </p>
          <p>
            Av samma skäl räknas vinnaren ur ja- och nej-rösterna, inte ur
            riksdagens fält <code className="mono" style={{ color: 'var(--black)' }}>vinnare</code>.
            Det fältet innehåller etiketterna <em>bifall</em> och <em>Avslagen</em>{' '}
            även för punkter där utskottets förslag vann, och den som räknar på
            det får fler förluster än som inträffat. Nej-sidan vann{' '}
            <strong style={{ color: 'var(--black)' }}>{heltal(d.forluster)} gånger</strong>{' '}
            under hela mandatperioden.
          </p>
        </div>
        <Textlank href="/#forlorade" className="mt-8">Se de {heltal(d.forluster)} fallen</Textlank>
      </section>

      <section id="klarsprak" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik max-w-[20ch] text-[clamp(1.8rem,4.4vw,44px)]">
          Kan jag lita på AI-sammanfattningarna?
        </h2>
        <div className="mt-7 grid max-w-[66ch] gap-4 text-[16.5px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Så långt som du själv kan kontrollera dem — och det är meningen att du ska.
            Sakfrågan, <em>ja innebar</em> och <em>nej innebar</em> står inte i
            riksdagens data, utan är skrivna av språkmodellen{' '}
            <strong style={{ color: 'var(--black)' }}>{lista(d.modeller)}</strong>{' '}
            utifrån utskottets förslag och reservationstexterna på samma
            förslagspunkt. Båda originaltexterna ligger öppna på voteringens egen
            sida. Ämnestaggen sattes i samma anrop, ur en fast lista på{' '}
            {AMNEN.length} ämnen.
          </p>
          <p>
            Uppgiften är översättning av procedur, inte omdöme. Modellen är
            instruerad att aldrig värdera ett förslag, aldrig antyda vilken sida
            som har rätt, och alltid skriva ut vad reservationen faktiskt ville.
            Den instruktionen prövades på 30 punkter som lästes igenom manuellt
            innan hela batchen kördes.
          </p>
          <p>
            Modellen skattar själv hur väl underlaget räckte. Punkter under{' '}
            <em>hög</em> säkerhet är märkta både i voteringslistan och på sin
            egen sida, där originaltexterna ligger öppna för jämförelse.
          </p>
        </div>

        <div className="mt-8 max-w-md">
          {d.sakerhet.map(([niva, punkter]) => (
            <div key={niva}
                 className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-6 py-3 text-[15px]"
                 style={{ borderBottom: '1px solid var(--linje)' }}>
              <span>säkerhet {niva}</span>
              <span className="tabular font-bold">{heltal(punkter)}</span>
              <span className="tabular whitespace-nowrap text-right" style={{ color: 'var(--black-svag)' }}>
                {tal(d.forklarade > 0 ? (100 * punkter) / d.forklarade : 0)} %
              </span>
            </div>
          ))}
        </div>

        <Forbehall rubrik="Ämnesindelningen är automatisk och därför trubbig." className="mt-8" litet>
          <em>Övrigt</em> samlar det som inte föll inom någon av de{' '}
          {AMNEN.length - 1} övriga kategorierna, och en förslagspunkt kan höra
          hemma i två ämnen men får bara ett.
        </Forbehall>
      </section>

      {olikaTal && (
        <section id="olika-tal" className="regel scroll-mt-6 py-16">
          <h2 className="rubrik max-w-[24ch] text-[clamp(1.8rem,4.4vw,44px)]">
            Varför säger startsidan och voteringssidan olika många?
          </h2>
          <div className="mt-7 grid max-w-[66ch] gap-4 text-[16.5px] leading-[1.6]"
               style={{ color: 'var(--black-mjuk)' }}>
            <p>
              Därför att de räknar två olika saker. Voteringssidan listar{' '}
              <strong style={{ color: 'var(--black)' }}>{heltal(d.listade)}</strong>{' '}
              förslagspunkter med klarspråksförklaring.{' '}
              {/* Sakfrågetalet ur samma rad som listade och motivupprop, inte ur
                  parti_utfall. De är lika i dag — kontrollerat 2026-08-16, 2 569
                  i båda — men bara den här vyn garanterar att de tre talen i
                  stycket faktiskt delar upp varandra. */}
              <strong style={{ color: 'var(--black)' }}>{heltal(d.sakfrageupprop)}</strong>{' '}
              av dem avgjordes med namnupprop om sakfrågan, och det är de som bär
              varje mönster på startsidan.
            </p>
            {/* Vart och ett av de två skälen skrivs ut bara när det finns.
                Stycket nedan har hela avsnittets historia bakom sig — 18 av 18
                punkter i dag — men det är det andra stycket som är poängen med
                att räkna tre uteslutande fall i stället för att subtrahera: en
                ny orsak dyker upp som en egen mening i stället för att tyst
                räknas in bland motivfrågorna. */}
            {d.motivupprop > 0 && (
              <p>
                De {heltal(d.motivupprop)} övriga fick också namnupprop, och
                rösterna är hämtade — varje ledamot har sin rad, precis som i de
                andra. Men uppropet gällde motivfrågan: hur beslutet skulle
                motiveras, inte vad som beslutades. Rösterna säger alltså inget
                om partiernas hållning i sakfrågan, och räknas därför inte in i
                någon partilinje, samstämmighet eller frånvarosiffra.
              </p>
            )}
            {d.utanUpprop > 0 && (
              <p>
                {heltal(d.utanUpprop)} punkter har varken sakfråge- eller
                motivfrågeröster i materialet. Det är inte en tredje sorts
                beslut utan ett tecken på att något saknas i hämtningen, och de
                ska inte läsas som något annat.
              </p>
            )}
            {/* Sista meningen gäller motivfrågepunkterna och bara dem. En punkt
                utan röstdata alls HAR saknade röster, och att då skriva att
                uttrycket vore fel vore att ta tillbaka varningen ovan. */}
            <p>
              Punkterna är inte borttagna för det. De ligger kvar i
              voteringslistan, med sin klarspråksförklaring och utan partiernas
              linjer.{d.motivupprop > 0 && (
                <> Att kalla motivfrågepunkterna <em>saknade röster</em> vore
                fel — det är röster om en annan fråga.</>
              )}
            </p>
          </div>
          <Textlank href="/voteringar" className="mt-8">
            Se alla {heltal(d.listade)} beslut i listan
          </Textlank>
        </section>
      )}

      <section id="regeringssidan" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik max-w-[20ch] text-[clamp(1.9rem,5.5vw,46px)] leading-[1.05]">
          Fick regeringen igenom sin politik
          <span style={{ color: 'var(--accent)' }}>?</span>
        </h2>
        <div className="mt-7 grid max-w-[66ch] gap-4 text-[16.5px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
          <p className="text-[19px] leading-[1.5]">
            Ja, nästan undantagslöst. {lista(REGERINGSPARTIERNA.map(namn))} stod
            på den vinnande sidan i{' '}
            <strong style={{ color: 'var(--accent)' }}>
              {samst === hogst ? heltal(hogst) : `${heltal(samst)}–${heltal(hogst)}`} av{' '}
              {heltal(d.voteringar)}
            </strong>{' '}
            voteringar.
          </p>
          <p>
            Men talet är till stor del strukturellt. Utskottsmajoriteten <em>är</em>{' '}
            regeringssidan, så att dess linje vinner är nästan samma påstående som
            att utskottets förslag vinner. Talet beskriver hur riksdagen fungerar
            — inte hur skickliga regeringspartierna varit. Det är skälet till att
            det står här och inte som ett fynd på startsidan.
          </p>
        </div>

        <div className="mt-10 max-w-2xl">
          {d.utfall.map((u) => (
            <div key={u.parti}
                 className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 py-3.5 sm:grid-cols-[80px_96px_1fr_80px]"
                 style={{ borderBottom: '1px solid var(--linje)' }}>
              <span className="text-[17px] font-bold">{u.parti}</span>
              <span className="tabular text-right text-[16px] font-bold sm:text-left sm:text-[19px]">
                {tal(u.andel)} %
              </span>
              {/* Stapeln är en upprepning av procenttalet och offras först när
                  utrymmet tryter — annars radbryts talen på mobil. */}
              <span className="hidden sm:block">
                <Stapel andel={u.andel} />
              </span>
              <span className="tabular col-span-2 text-[14px] sm:col-span-1 sm:text-right"
                    style={{ color: 'var(--black-svag)' }}>
                {heltal(u.med_vinnaren)} st
              </span>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-[64ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
          Antalet av {heltal(d.voteringar)} voteringar där partiets linje
          sammanföll med den vinnande sidan. Ett parti som avstod räknas aldrig
          som vinnare, eftersom avstår varken är ja eller nej.
        </p>
      </section>

      <section id="tre-lika" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik max-w-[20ch] text-[clamp(1.8rem,4.4vw,44px)]">
          Varför ser tre av partisidorna likadana ut?
        </h2>
        <div className="mt-7 grid max-w-[66ch] gap-4 text-[16.5px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Därför att {lista(REGERINGSPARTIERNA.map(namn))} röstar lika i{' '}
            <strong style={{ color: 'var(--black)' }}>{d.likhetsspann}</strong>{' '}
            av alla voteringar. Sidorna säger nästan samma sak för att partierna
            gjorde nästan samma sak — det är ett resultat, inte ett fel i
            beräkningen.
          </p>
          <p>
            Det får två följder som är lätta att läsa fel. Varje fynd som namnger
            ett av de tre gäller i praktiken alla tre, och vilket av dem som
            hamnar i rubriken avgörs av tiondelar. Och inget av dem kan gärna bli{' '}
            <em>ensamt mot alla</em>: de två andra står redan på samma linje.
          </p>
          <p>
            Likheten räknas fram ur rösterna varje gång, den står inte skriven
            någonstans. Skulle de tre glida isär kommande mandatperiod följer
            talet med — men vad de röstade lika <em>om</em>, och varför, svarar
            materialet inte på.
          </p>
        </div>
        <Textlank href="/samstammighet" className="mt-8">
          Se vem som röstar med vem
        </Textlank>
      </section>

      <section id="begransningar" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik max-w-[20ch] text-[clamp(1.8rem,4.4vw,44px)]">
          Vad kan materialet inte svara på?
        </h2>
        <p className="mt-5 max-w-[58ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          Det här begränsar varje slutsats på sajten. Listan står här därför att
          en siffra utan sitt förbehåll är ett påstående sajten inte kan försvara.
        </p>

        <div className="mt-12 grid gap-10">
          <Begransning rubrik="Kvittningen syns inte">
            Riksdagen kvittar frånvaro: när en ledamot uteblir avstår ofta en
            ledamot från motsatt sida frivilligt, just för att styrkeförhållandet
            ska hålla. Vilka voteringar som kvittades framgår inte av öppna data.
            Varje beräkning av vad frånvaron kunde ha ändrat antar därför att alla
            frånvarande hade röstat med sitt parti — vilket överdriver effekten.
          </Begransning>

          {/* Att de tre är utbytbara stod länge här, som en av begränsningarna.
              Det är en fråga läsaren ställer när partisidorna ser likadana ut,
              och har därför en egen adress ovan i stället — samma påstående på
              två ställen på samma sida driver isär. */}
          <Begransning rubrik="De flesta besluten togs utan omröstning">
            {heltal(d.utanNamnupprop)} av {heltal(d.punkter)} förslagspunkter
            avgjordes genom acklamation, alltså utan att någon begärde namnupprop.
            Sajten kan bara säga något om de {heltal(d.voteringar)} där rösterna
            räknades. Enighet i kammaren är därför systematiskt underrepresenterad
            här.
          </Begransning>

          <Begransning rubrik="Förluster i utskottet syns inte">
            En regering kan förlora en fråga i utskottet innan den når kammaren,
            och sådana nederlag lämnar inga spår i röstdata. Att nej-sidan bara
            vann {heltal(d.forluster)} gånger säger alltså något om kammaren, inte
            om regeringens hela framgång.
          </Begransning>

          <Begransning rubrik="Skälet till frånvaro saknas">
            Föräldraledighet, sjukdom, tjänsteresor och utskottsarbete registreras
            inte i de öppna rösterna. Partiledare och talespersoner har
            systematiskt hög frånvaro därför att uppdraget ligger utanför
            kammaren. En hög siffra är ett faktum om deltagande, inte ett omdöme
            om ledamoten.
          </Begransning>

          <Begransning rubrik="Enskilda ledamöter bär ingen berättelse">
            {tal(d.avvikelseandel, 3)} % av de avlagda rösterna avviker från det
            egna partiets linje — {heltal(d.avvikande)} av {heltal(d.avlagda)}.
            Det finns ingen population av ledamöter som röstar mot sitt parti, och
            därför ingen jämförelse att göra mellan dem. Sajten mäter partier,
            inte personer.
          </Begransning>

          <Begransning rubrik="Anförandena är inte tolkade">
            {heltal(d.anforanden)} anföranden ligger i databasen och går att läsa
            mot voteringen de hör till. Men ingen automatisk sammanfattning av vad
            som sades publiceras — försöket redovisas längst ned på den här sidan,
            och det höll inte.
          </Begransning>
        </div>
      </section>

      {/* Svaret i korthet, med hela redogörelsen på /om. Frågan står här därför
          att sidan är sajtens FAQ — den som undrar vem som räknat söker på sin
          fråga, inte i sidfoten. */}
      <section id="avsandare" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">Vem ligger bakom sajten?</h2>
        <div className="mt-7 grid max-w-[66ch] gap-4 text-[16.5px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            <strong style={{ color: 'var(--black)' }}>{AVSANDARE}</strong>,
            privatperson. Sajten har ingen koppling till Sveriges riksdag, till
            något parti eller till någon myndighet. Namnet är riksdagens ord för
            förfarandet när rösterna räknas ledamot för ledamot — inte en
            avsändare.
          </p>
          <p>
            Ingen finansiering, inget partiuppdrag, ingen annonsering. Källkoden
            är öppen, så räkningen bakom varje tal på sajten går att läsa
            och göra om.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          <Textlank href="/om">Om sajten och den som byggt den</Textlank>
          <Textlank href={REPO} extern>Läs källkoden på GitHub</Textlank>
        </div>
      </section>

      <section id="fel" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">Hittar du ett fel?</h2>
        <div className="mt-6 grid max-w-[66ch] gap-4 text-[16.5px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Anmäl det, gärna med länk till voteringen och vad som borde ha stått.
            Rättelser i underlaget kräver en ny körning och syns därför inte
            samma dag, men de görs.
          </p>
          <p>
            Börja med voteringens egen sida. Där ligger utskottets förslag och
            reservationerna i originaltext, och säger klarspråket något annat än
            underlaget är det klarspråket som har fel.
          </p>
        </div>
        <a
          href={NYTT_ARENDE}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block rounded-full px-[26px] py-[15px] text-[15px] font-semibold transition-[filter] duration-150 hover:brightness-[0.94]"
          style={{ background: 'var(--accent)', color: '#ffffff' }}
        >
          Anmäl ett fel på GitHub
        </a>
      </section>

      {/* Sidans enda mörka fält. Ett negativt resultat är metodsidans starkaste
          innehåll och får därför bära det. */}
      <section id="hyckleri" className="panel helbredd scroll-mt-6 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Etikett>Ett negativt resultat</Etikett>
        <h2 className="display mt-6 max-w-[17ch] text-[clamp(2.2rem,6.5vw,72px)]">
          Säger politikerna en sak och röstar tvärtom?
        </h2>
        <p className="mt-7 max-w-[54ch] text-[19px] leading-[1.5]" style={{ color: 'var(--black-mjuk)' }}>
          Jag prövade att mäta det, och måttet höll inte. Det är den vanligaste
          idén om granskning av riksdagen, så här är de tre stegen där den föll.
        </p>

        <ol className="mt-14 grid gap-10">
          <Steg
            nummer="1"
            rubrik="Enskilda ledamöter avviker inte"
            tal={`${tal(d.avvikelseandel, 2)} %`}
            text={`Av ${heltal(d.avlagda)} avlagda röster avvek ${heltal(d.avvikande)} från det egna partiets linje. Det finns ingen population av ledamöter som röstar mot sitt parti — därmed ingen berättelse på individnivå.`}
          />
          <Steg
            nummer="2"
            rubrik="På partinivå avgörs svaret av frågans formulering"
            tal="0,3–12,7 %"
            text="Samma modell och samma underlag gav fyrtio gånger fler träffar när
                  instruktionen bad om vaksamhet i stället för försiktighet. Ett mått
                  som svänger så kraftigt med formuleringen mäter formuleringen, inte
                  riksdagen."
          />
          <Steg
            nummer="3"
            rubrik="Ingen träff överlevde granskning"
            tal="0 av 9"
            text="De starkaste fallen granskades av en oberoende bedömare med uppgift
                  att motbevisa dem. Sju föll, två blev osäkra, inget höll. Oftast för
                  att talaren formellt yrkat bifall till en annan reservation — det
                  påstådda kravet var en bisats i förbifarten."
          />
        </ol>

        <div className="mt-16 grid max-w-[66ch] gap-4 text-[16.5px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Skälet är detsamma som gör ja och nej svårlästa: ett parti som talar
            varmt för mer resurser till skolan och sedan röstar nej har nästan
            alltid röstat för sitt eget förslag om mer resurser till skolan.
          </p>
          <p>
            Ett verktyg som räknar det som en motsägelse producerar hundratals
            falska anklagelser. Jag valde att inte bygga det.
          </p>
        </div>
        <Textlank href="/samstammighet" className="mt-8">
          Se vem som röstar med vem i stället
        </Textlank>

        {d.retorikTotalt > 0 && (
          <div className="regel mt-14 pt-9">
            <h3 className="text-[26px] font-extrabold tracking-[-0.025em]">Underlaget, öppet</h3>
            <p className="mt-2 text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
              {heltal(d.retorikTotalt)} bedömningar av anföranden mot partiets
              röst i samma ärende.
            </p>
            <div className="mt-6 max-w-md">
              {d.retorik.map(([k, v]) => (
                <div key={k}
                     className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-6 py-2.5 text-[14.5px]"
                     style={{ borderBottom: '1px solid var(--linje)' }}>
                  <span>{k}</span>
                  <span className="tabular font-bold">{heltal(v)}</span>
                  <span className="tabular whitespace-nowrap text-right" style={{ color: 'var(--black-svag)' }}>
                    {tal((100 * v) / d.retorikTotalt)} %
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 max-w-[64ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
              Siffrorna blandar två promptformuleringar och ska inte läsas som
              ett mått på riksdagen. De redovisas för att visa hur känsligt måttet
              är.
            </p>
          </div>
        )}
        </div>
      </section>
    </main>
  )
}

/** En rad i underlagstabellen: tal till vänster, hel mening till höger. */
function Rad({ tal: n, text }: { tal: number; text: string }) {
  return (
    <div
      className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 py-4"
      style={{ borderBottom: '1px solid var(--linje)' }}
    >
      <span className="tabular min-w-[5ch] text-right text-[clamp(1.5rem,4vw,34px)] font-extrabold tracking-[-0.04em] leading-none">
        {heltal(n)}
      </span>
      <span className="text-[15.5px] leading-[1.5]" style={{ color: 'var(--black-mjuk)' }}>
        {text}
      </span>
    </div>
  )
}

function Definition({ rubrik, regel, children }: {
  rubrik: string; regel: string; children: React.ReactNode
}) {
  return (
    <div className="grid gap-x-10 gap-y-4 sm:grid-cols-[minmax(0,15rem)_1fr]">
      <h3 className="rubrik text-[clamp(1.25rem,2.8vw,26px)]">{rubrik}</h3>
      <div className="max-w-[58ch]">
        <p className="text-[17px] font-semibold leading-[1.4]">{regel}</p>
        <div className="mt-4 grid gap-4 text-[15.5px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function Begransning({ rubrik, children }: { rubrik: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-10 gap-y-2 sm:grid-cols-[minmax(0,15rem)_1fr]">
      <h3 className="text-[16px] font-bold leading-snug">{rubrik}</h3>
      <p className="max-w-[58ch] text-[15.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
        {children}
      </p>
    </div>
  )
}

function Steg({ nummer, rubrik, tal, text }: {
  nummer: string; rubrik: string; tal: string; text: string
}) {
  return (
    // 12 rem och 34 px, inte displayskalans 46: talen har tre olika former
    // ("0,14 %", "0,3–12,7 %", "0 av 9") och den bredaste får inte brytas.
    // Fast spår, inte minmax: med min 0 krymper kolumnen till min-content och
    // bryter "0,3–12,7 %" mitt itu.
    <li className="grid gap-x-10 gap-y-3 sm:grid-cols-[12rem_1fr]">
      <div className="siffra text-[clamp(1.8rem,4vw,34px)]" style={{ color: 'var(--lime)' }}>
        {tal}
      </div>
      <div>
        <h3 className="text-[17px] font-bold">
          <span style={{ color: 'var(--black-svag)' }}>{nummer}. </span>
          {rubrik}
        </h3>
        <p className="mt-2 max-w-[60ch] text-[15.5px] leading-[1.6]"
           style={{ color: 'var(--black-mjuk)' }}>
          {text}
        </p>
      </div>
    </li>
  )
}
