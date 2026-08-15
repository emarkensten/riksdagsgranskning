import Link from 'next/link'
import {
  antal, datum, db, heltal, lista, namn, rader, rakna, tal, REGERINGSPARTIERNA,
} from '@/lib/db'
import { Stapel } from '@/components/stapel'
import AMNEN from '@/lib/amnen.json'

export const revalidate = 3600

export const metadata = {
  title: 'Så räknar vi — Riksdagsgranskning',
  description:
    'Definitionerna bakom varje siffra på sajten: partilinje, samstämmighet, ensam mot alla, frånvaro och ämnesklassning — och det öppna data inte kan svara på.',
}

/** Ordningen de redovisas i, inte den ordning databasen råkar returnera. */
const NIVAER = ['hög', 'medel', 'låg'] as const

type Utfall = { parti: string; voteringar: number; med_vinnaren: number; andel: number }
type Riksmote = { rm: string; roster: number; franvarande: number; franvaroandel: number }

async function hamta() {
  const klient = db()

  const [
    utfall,
    disciplin,
    klartext,
    riksmoten,
    mkdl,
    forsta,
    sista,
    hamtat,
    punkter,
    utanNamnupprop,
    voteringar,
    betankanden,
    anforanden,
    forluster,
    retorik,
  ] = await Promise.all([
    rader<Utfall>(klient.from('parti_utfall').select('*').order('andel', { ascending: false })),
    rader<{ avlagda: number; avvikande: number }>(
      klient.from('parti_disciplin').select('avlagda, avvikande')),
    rader<{ modell: string; sakerhet: string; antal: number }>(
      klient.from('klartext_summering').select('modell, sakerhet, antal')),
    rader<Riksmote>(
      klient.from('riksmote_summering').select('rm, roster, franvarande, franvaroandel').order('rm')),
    // De tre partier som röstar närmast identiskt. Spannet skrivs ut i klartext
    // på flera sidor och får inte stå hårdkodat på någon av dem.
    rader<{ samstammighet: number }>(
      klient.from('partisamstammighet').select('samstammighet').eq('amne', 'alla')
        .in('parti_1', REGERINGSPARTIERNA).in('parti_2', REGERINGSPARTIERNA)),
    rader<{ datum: string }>(klient.from('betankande').select('datum').order('datum').limit(1)),
    rader<{ datum: string }>(
      klient.from('betankande').select('datum').order('datum', { ascending: false }).limit(1)),
    rader<{ uppdaterad: string }>(
      klient.from('ledamot').select('uppdaterad').order('uppdaterad', { ascending: false }).limit(1)),
    rakna(antal(klient, 'forslagspunkt'), 'förslagspunkter'),
    rakna(antal(klient, 'forslagspunkt').is('votering_id', null), 'punkter utan votering'),
    // Sidans huvudsiffra räknas för sig, som startsidan redan gör. Att plocka
    // den ur första raden i en lista sorterad på andel gör den beroende av en
    // sorteringsordning som inget annat hänger på.
    //
    // Räknas på jamn_votering, inte på forslagspunkt.votering_id is not null.
    // Det senare ger 2 587 — punkter där en votering registrerats — medan
    // underlaget för varje mönster är de 2 569 som faktiskt har röstdata.
    rakna(antal(klient, 'jamn_votering'), 'voteringar'),
    rakna(antal(klient, 'betankande'), 'betänkanden'),
    rakna(antal(klient, 'anforande'), 'anföranden'),
    rakna(antal(klient, 'utskottet_forlorade'), 'utskottsförluster'),
    rader<{ overensstammelse: string; antal: number }>(
      klient.from('retorik_summering').select('overensstammelse, antal')),
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

  const likhet = mkdl.map((p) => Number(p.samstammighet))
  const retorikRader = retorik
    .map((r) => [r.overensstammelse, Number(r.antal)] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])

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
    likhetsspann: `${tal(Math.min(...likhet))}–${tal(Math.max(...likhet))} %`,
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
  }
}

export default async function Metod() {
  const d = await hamta()

  // Listan är sorterad fallande på andel, så det första regeringspartiet är
  // också det som klarade sig bäst.
  const basta = d.utfall.find((u) => REGERINGSPARTIERNA.includes(u.parti))
  // Skillnaden mellan förklarade punkter och voteringar är punkter som fick en
  // klarspråksförklaring men aldrig ett namnupprop.
  const utanRostdata = d.forklarade - d.voteringar

  return (
    <main className="pb-10">
      <section className="regel-tjock pt-8">
        <p className="stig text-[13px] uppercase tracking-[0.18em]"
           style={{ color: 'var(--accent)', animationDelay: '0ms' }}>
          Metod och källor
        </p>
        <h1 className="display stig mt-5 text-[clamp(2.6rem,8vw,5.5rem)]"
            style={{ animationDelay: '80ms' }}>
          Så räknar vi<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <p className="stig mt-7 max-w-[52ch] text-[17px] leading-relaxed"
           style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}>
          Varje tal på den här sajten kommer ur riksdagens egna öppna data och går
          att räkna om. Här står definitionerna bakom dem, vilken modell som skrev
          klarspråket, och vad materialet inte kan svara på.
        </p>
      </section>

      <nav aria-label="Innehåll" className="regel mt-12 pt-5">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]"
            style={{ color: 'var(--black-mjuk)' }}>
          {[
            ['underlaget', 'Underlaget'],
            ['definitioner', 'Så räknas talen'],
            ['ja-och-nej', 'Ett ja är utskottets förslag'],
            ['klarsprak', 'Klarspråket och ämnena'],
            ['regeringssidan', 'Regeringssidan vann nästan allt'],
            ['begransningar', 'Vad materialet inte kan svara på'],
            ['fel', 'Hittar du ett fel'],
            ['hyckleri', 'Vi letade efter hyckleri'],
          ].map(([id, text]) => (
            <li key={id}>
              <a href={`#${id}`} className="border-b pb-0.5 transition-opacity hover:opacity-60"
                 style={{ borderColor: 'var(--linje)' }}>
                {text}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="underlaget" className="regel mt-16 scroll-mt-6 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Underlaget</h2>

        <div className="mt-8">
          <div className="display tabular text-[clamp(3.2rem,13vw,7.5rem)] leading-[0.82]"
               style={{ color: 'var(--accent)' }}>
            {heltal(d.voteringar)}
          </div>
          <p className="mt-6 max-w-[46ch] text-[19px] leading-snug">
            voteringar med namnupprop ligger bakom varje mönster på sajten. Det är
            samtliga voteringar i mandatperioden där riksdagen räknade rösterna
            ledamot för ledamot.
          </p>
        </div>

        <table className="mt-10 w-full max-w-2xl text-[15px]">
          <tbody>
            <Rad tal={d.forklarade} text="förslagspunkter har en klarspråksförklaring" />
            <Rad
              tal={utanRostdata}
              text="av dem saknar röstdata — voteringen finns registrerad, men inga röster är protokollförda"
            />
            <Rad
              tal={d.utanNamnupprop}
              text={`av totalt ${heltal(d.punkter)} förslagspunkter avgjordes helt utan omröstning`}
            />
            <Rad tal={d.roster} text="röstningstillfällen — en rad per ledamot och votering, frånvaro inräknad" />
            <Rad tal={d.betankanden} text="betänkanden från riksdagens utskott" />
            <Rad tal={d.anforanden} text="anföranden är hämtade och sparade, men sammanfattas inte av sajten" />
          </tbody>
        </table>

        <p className="mt-7 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Källa: <a href="https://data.riksdagen.se" className="underline hover:opacity-60"
                    rel="noreferrer">data.riksdagen.se</a>. Hämtat {datum(d.hamtat)}, och sedan dess
          oförändrat — sajten uppdateras inte automatiskt. Materialet täcker
          riksmötena {d.riksmoten[0]?.rm} till {d.riksmoten[d.riksmoten.length - 1]?.rm},
          med betänkanden daterade {datum(d.forsta)} till {datum(d.sista)}.
        </p>
      </section>

      <section id="definitioner" className="regel mt-20 scroll-mt-6 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Så räknas talen</h2>
        <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Sex definitioner bär hela sajten. De är valda för att vara enkla nog att
          kontrollera, inte för att vara raffinerade.
        </p>

        <div className="mt-10 grid gap-12">
          <Definition rubrik="Partiets linje" regel="Det alternativ flest av partiets närvarande ledamöter valde.">
            <p>
              Frånvaro räknas inte in. Ett parti med 30 ja-röster och 40
              frånvarande hade linjen ja — att redovisa <em>frånvarande</em> som
              partiets hållning vore ett sakfel. Avstår är en egen linje och
              behandlas som ett ställningstagande, inte som ett uteblivet svar.
            </p>
            <p>
              Enskilda ledamöter som röstar annorlunda ändrar inte partiets linje.
              De är också sällsynta: {heltal(d.avvikande)} av{' '}
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
              som båda röstade avstår räknas som eniga, eftersom avstår är en linje.
            </p>
            <p>
              Måttet säger vad partierna gjorde, inte varför. Två partier kan rösta
              lika av rakt motsatta skäl, och en hög siffra är inte i sig ett
              påstående om samarbete.
            </p>
          </Definition>

          <Definition
            rubrik="Ensam mot alla"
            regel="En votering där partiet var det enda med sin linje — de sju andra stod någon annanstans."
          >
            <p>
              Kravet är att alla åtta partier har en linje i voteringen. Punkter där
              något parti saknar linje räknas inte, eftersom ett parti annars kunde
              se ensamt ut bara för att en jämförelse saknades.
            </p>
            <p>
              En nolla betyder inte att partiet aldrig går sin egen väg. Den betyder
              att partiet aldrig gjorde det <em>utan sällskap</em> — och för{' '}
              {lista(REGERINGSPARTIERNA.map(namn))} är det nästan mekaniskt omöjligt. Se
              begränsningarna nedan.
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
            <table className="tabular mt-2 w-full max-w-md text-[14px]">
              <tbody>
                {d.riksmoten.map((r) => (
                  <tr key={r.rm} className="regel">
                    <td className="py-2">{r.rm}</td>
                    <td className="py-2 text-right" style={{ color: 'var(--black-svag)' }}>
                      {heltal(Number(r.franvarande))} av{' '}
                      {heltal(Number(r.roster))}
                    </td>
                    <td className="whitespace-nowrap py-2 pl-6 text-right font-semibold">
                      {tal(r.franvaroandel)} %
                    </td>
                  </tr>
                ))}
                <tr className="regel">
                  <td className="py-2 font-semibold">hela perioden</td>
                  <td className="py-2 text-right" style={{ color: 'var(--black-svag)' }}>
                    {heltal(d.franvarande)} av {heltal(d.roster)}
                  </td>
                  <td className="whitespace-nowrap py-2 pl-6 text-right font-semibold"
                      style={{ color: 'var(--accent)' }}>
                    {tal(d.franvaroandel)} %
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              Skälet till frånvaron finns inte i öppna data. En hög siffra är därför
              inte ett påstående om försummelse — bara om hur ofta ledamoten inte
              deltog.
            </p>
          </Definition>

          <Definition
            rubrik="Jämn votering, och när frånvaron avgjorde"
            regel="En votering avgjord med tre rösters marginal eller mindre."
          >
            <p>
              <em>Frånvaron avgjorde</em> betyder att utfallet hade blivit det
              motsatta om varje frånvarande ledamot röstat med sitt parti. Räkningen
              lägger alltså tillbaka de frånvarande på partiets linje och ser efter
              om segraren byts.
            </p>
            <p>
              Det är aritmetik, inte en anklagelse. Riksdagen kvittar frånvaro, och
              vilka voteringar som kvittades framgår inte av öppna data — se
              begränsningarna nedan.
            </p>
          </Definition>

          <Definition
            rubrik="Ämnets enighet"
            regel="Genomsnittet av alla 28 partipars samstämmighet inom ämnet."
          >
            <p>
              Talet är sannolikheten att två slumpvis valda partier röstade lika i
              ämnet. Ett lågt tal betyder att kammaren spänner brett, inte att en
              viss konflikt är skarp.
            </p>
            <p>
              Jämförelsen mot <em>normalt</em> är samma partipars samstämmighet i
              alla frågor. Skillnaden mellan de två talen är det ämnessidan
              rangordnar på.
            </p>
          </Definition>
        </div>
      </section>

      <section id="ja-och-nej" className="regel mt-20 scroll-mt-6 pt-8">
        <h2 className="display max-w-[20ch] text-[clamp(1.7rem,4.5vw,2.8rem)] leading-[1.05]">
          Ett ja är alltid utskottets förslag<span style={{ color: 'var(--accent)' }}>.</span>
        </h2>
        <div className="mt-6 grid max-w-[66ch] gap-4 text-[16px] leading-relaxed"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            I en svensk votering ställs utskottets förslag som ja och en reservation
            som nej. Ett parti som röstar nej till mer pengar till skolan har därför
            oftast röstat för sitt eget förslag om mer pengar till skolan.
          </p>
          <p>
            Det är den enskilt viktigaste fällan i det här materialet. Ett verktyg
            som läser varje nej som motstånd mot sakfrågan producerar hundratals
            falska anklagelser. Därför står det på varje voteringssida utskrivet vad
            reservationen ville, och vilka partier som stod bakom den.
          </p>
          <p>
            Av samma skäl räknas vinnaren ur ja- och nej-rösterna, inte ur
            riksdagens fält <code style={{ color: 'var(--black)' }}>vinnare</code>.
            Det fältet innehåller etiketterna <em>bifall</em> och <em>Avslagen</em>{' '}
            även för punkter där utskottets förslag vann, och den som räknar på det
            får fler förluster än som inträffat. Nej-sidan vann{' '}
            <strong style={{ color: 'var(--black)' }}>{d.forluster} gånger</strong>{' '}
            under hela mandatperioden.
          </p>
        </div>
        <Link href="/#forlorade"
              className="mt-6 inline-block border-b pb-1 text-[14px] transition-opacity hover:opacity-60"
              style={{ borderColor: 'var(--accent)' }}>
          Se de {d.forluster} fallen →
        </Link>
      </section>

      <section id="klarsprak" className="regel mt-20 scroll-mt-6 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Klarspråket och ämnena</h2>
        <div className="mt-6 grid max-w-[66ch] gap-4 text-[16px] leading-relaxed"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Sakfrågan, <em>ja innebar</em> och <em>nej innebar</em> står inte i
            riksdagens data. De är skrivna av språkmodellen{' '}
            <strong style={{ color: 'var(--black)' }}>{lista(d.modeller)}</strong>{' '}
            utifrån utskottets förslag och reservationstexterna på samma
            förslagspunkt. Ämnestaggen sattes i samma anrop, ur en fast lista på{' '}
            {AMNEN.length} ämnen.
          </p>
          <p>
            Uppgiften är översättning av procedur, inte omdöme. Modellen är
            instruerad att aldrig värdera ett förslag, aldrig antyda vilken sida som
            har rätt, och alltid skriva ut vad reservationen faktiskt ville. Den
            instruktionen prövades på 30 punkter som lästes igenom manuellt innan
            hela batchen kördes.
          </p>
          <p>
            Modellen skattar själv hur väl underlaget räckte. Punkter under <em>hög</em>{' '}
            säkerhet är märkta både i voteringslistan och på sin egen sida, där
            originaltexterna ligger öppna för jämförelse.
          </p>
        </div>

        <table className="mt-7 w-full max-w-md text-[15px]">
          <tbody>
            {d.sakerhet.map(([niva, punkter]) => (
              <tr key={niva} className="regel">
                <td className="py-2.5">säkerhet {niva}</td>
                <td className="tabular py-2.5 text-right font-semibold">{heltal(punkter)}</td>
                <td className="tabular whitespace-nowrap py-2.5 pl-6 text-right"
                    style={{ color: 'var(--black-svag)' }}>
                  {tal(d.forklarade > 0 ? (100 * punkter) / d.forklarade : 0)} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-5 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Ämnesindelningen är automatisk och därför trubbig. <em>Övrigt</em> samlar
          det som inte föll inom någon av de {AMNEN.length - 1} övriga kategorierna,
          och en förslagspunkt kan höra hemma i två ämnen men får bara ett.
        </p>
      </section>

      <section id="regeringssidan" className="regel mt-20 scroll-mt-6 pt-8">
        <h2 className="display max-w-[22ch] text-[clamp(1.7rem,4.5vw,2.8rem)] leading-[1.05]">
          Regeringssidans linje vann{' '}
          <span style={{ color: 'var(--accent)' }}>
            {heltal(basta?.med_vinnaren ?? 0)} av {heltal(d.voteringar)}
          </span>{' '}
          voteringar.
        </h2>
        <div className="mt-6 grid max-w-[66ch] gap-4 text-[16px] leading-relaxed"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Siffran gäller {lista(REGERINGSPARTIERNA.map(namn))} och besvarar en fråga som
            faktiskt ställs: fick regeringen igenom sin politik? Svaret är ja, nästan
            undantagslöst.
          </p>
          <p>
            Men den är till stor del strukturell. Utskottsmajoriteten <em>är</em>{' '}
            regeringssidan, så att dess linje vinner är nästan samma påstående som
            att utskottets förslag vinner. Talet beskriver hur riksdagen fungerar —
            inte hur skickliga regeringspartierna varit. Det är skälet till att det
            står här och inte som ett fynd på startsidan.
          </p>
        </div>

        <table className="mt-8 w-full max-w-xl text-[14px]">
          <tbody>
            {d.utfall.map((u) => (
              <tr key={u.parti} className="regel">
                <td className="py-2.5 font-semibold">{u.parti}</td>
                <td className="tabular py-2.5 pl-4 text-right" style={{ color: 'var(--black-svag)' }}>
                  {heltal(u.med_vinnaren)}
                </td>
                <td className="tabular whitespace-nowrap py-2.5 pl-5 text-right font-semibold">
                  {tal(u.andel)} %
                </td>
                {/* Stapeln är en upprepning av procenttalet och offras först när
                    utrymmet tryter — annars radbryts talen på mobil. */}
                <td className="hidden w-1/2 py-2.5 pl-5 sm:table-cell">
                  <Stapel andel={u.andel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-5 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Antalet av {heltal(d.voteringar)} voteringar där partiets
          linje sammanföll med den vinnande sidan. Ett parti som avstod räknas
          aldrig som vinnare, eftersom avstår varken är ja eller nej.
        </p>
      </section>

      <section id="begransningar" className="regel-tjock mt-20 scroll-mt-6 pt-8">
        <h2 className="display text-[clamp(1.7rem,4.5vw,2.8rem)]">
          Vad materialet inte kan svara på
        </h2>
        <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Sju saker som begränsar varje slutsats på sajten. De står här därför att
          en siffra utan sitt förbehåll är ett påstående vi inte kan försvara.
        </p>

        <div className="mt-10 grid gap-10">
          <Begransning rubrik="Kvittningen syns inte">
            Riksdagen kvittar frånvaro: när en ledamot uteblir avstår ofta en ledamot
            från motsatt sida frivilligt, just för att styrkeförhållandet ska hålla.
            Vilka voteringar som kvittades framgår inte av öppna data. Varje
            beräkning av vad frånvaron kunde ha ändrat antar därför att alla
            frånvarande hade röstat med sitt parti — vilket överdriver effekten.
          </Begransning>

          <Begransning rubrik={`${lista(REGERINGSPARTIERNA.map(namn))} är utbytbara i statistiken`}>
            De röstar lika i {d.likhetsspann} av alla voteringar. Varje fynd som
            namnger ett av dem gäller i praktiken alla tre, och vilket som hamnar i
            rubriken avgörs av tiondelar. Det gör också att inget av dem gärna kan
            bli <em>ensamt mot alla</em>: de två andra står redan på samma linje.
          </Begransning>

          <Begransning rubrik="De flesta besluten togs utan omröstning">
            {heltal(d.utanNamnupprop)} av{' '}
            {heltal(d.punkter)} förslagspunkter avgjordes genom
            acklamation, alltså utan att någon begärde namnupprop. Sajten kan bara
            säga något om de {heltal(d.voteringar)} där rösterna
            räknades. Enighet i kammaren är därför systematiskt underrepresenterad
            här.
          </Begransning>

          <Begransning rubrik="Förluster i utskottet syns inte">
            En regering kan förlora en fråga i utskottet innan den når kammaren, och
            sådana nederlag lämnar inga spår i röstdata. Att nej-sidan bara vann{' '}
            {d.forluster} gånger säger alltså något om kammaren, inte om regeringens
            hela framgång.
          </Begransning>

          <Begransning rubrik="Skälet till frånvaro saknas">
            Föräldraledighet, sjukdom, tjänsteresor och utskottsarbete registreras
            inte i de öppna rösterna. Partiledare och talespersoner har systematiskt
            hög frånvaro därför att uppdraget ligger utanför kammaren. En hög siffra
            är ett faktum om deltagande, inte ett omdöme om ledamoten.
          </Begransning>

          <Begransning rubrik="Enskilda ledamöter bär ingen berättelse">
            {tal(d.avvikelseandel, 3)} % av de avlagda rösterna avviker från det egna
            partiets linje — {heltal(d.avvikande)} av{' '}
            {heltal(d.avlagda)}. Det finns ingen population av
            ledamöter som röstar mot sitt parti, och därför ingen jämförelse att göra
            mellan dem. Sajten mäter partier, inte personer.
          </Begransning>

          <Begransning rubrik="Anförandena är inte tolkade">
            {heltal(d.anforanden)} anföranden ligger i databasen och
            går att läsa mot voteringen de hör till. Men ingen automatisk
            sammanfattning av vad som sades publiceras — försöket redovisas längst
            ned på den här sidan, och det höll inte.
          </Begransning>
        </div>
      </section>

      <section id="fel" className="regel mt-20 scroll-mt-6 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Hittar du ett fel?</h2>
        <div className="mt-5 grid max-w-[66ch] gap-4 text-[16px] leading-relaxed"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Varje votering på sajten har en egen sida med utskottets förslag och
            reservationerna i originaltext. Börja där: om klarspråket säger något
            annat än underlaget, är det klarspråket som har fel.
          </p>
          <p>
            Rapportera det, gärna med länk till voteringen och vad som borde stått.
            Rättelser i underlaget kräver en ny körning och syns därför inte samma
            dag, men de görs.
          </p>
        </div>
        <a
          href="https://github.com/emarkensten/riksdagsgranskning/issues/new"
          rel="noreferrer"
          className="mt-6 inline-block border-b pb-1 text-[14px] transition-opacity hover:opacity-60"
          style={{ borderColor: 'var(--accent)' }}
        >
          Anmäl ett fel på GitHub →
        </a>
      </section>

      <section id="hyckleri" className="regel-tjock mt-24 scroll-mt-6 pt-8">
        <p className="text-[13px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          Ett negativt resultat
        </p>
        <h2 className="display mt-4 text-[clamp(2rem,5.5vw,3.4rem)]">
          Vi letade efter hyckleri<span style={{ color: 'var(--accent)' }}>.</span>
        </h2>
        <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Den vanligaste idén om riksdagsgranskning är att hitta politiker som säger
          en sak i talarstolen och röstar tvärtom. Vi prövade den. Den håller inte —
          och här är varför.
        </p>

        <ol className="mt-12 grid gap-8">
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

        <div className="mt-14 grid max-w-[66ch] gap-4 text-[16px] leading-relaxed"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Skälet är detsamma som gör ja och nej svårlästa: ett parti som talar varmt
            för mer resurser till skolan och sedan röstar nej har nästan alltid röstat
            för sitt eget förslag om mer resurser till skolan.
          </p>
          <p>
            Ett verktyg som räknar det som en motsägelse producerar hundratals falska
            anklagelser. Vi valde att inte bygga det.{' '}
            <Link href="/samstammighet" className="underline hover:opacity-60">
              Vem som röstar med vem
            </Link>{' '}
            säger betydligt mer om svensk politik — och bygger på rådata som vem som
            helst kan räkna om.
          </p>
        </div>

        {d.retorikTotalt > 0 && (
          <div className="regel mt-12 pt-7">
            <h3 className="display text-2xl">Underlaget, öppet</h3>
            <p className="mt-2 text-[13px]" style={{ color: 'var(--black-svag)' }}>
              {heltal(d.retorikTotalt)} bedömningar av anföranden mot
              partiets röst i samma ärende.
            </p>
            <table className="mt-5 w-full max-w-md text-[14px]">
              <tbody>
                {d.retorik.map(([k, v]) => (
                  <tr key={k} className="regel">
                    <td className="py-2">{k}</td>
                    <td className="tabular py-2 text-right font-semibold">{v}</td>
                    <td className="tabular whitespace-nowrap py-2 pl-6 text-right"
                        style={{ color: 'var(--black-svag)' }}>
                      {tal((100 * v) / d.retorikTotalt)} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
              Siffrorna blandar två promptformuleringar och ska inte läsas som ett
              mått på riksdagen. De redovisas för att visa hur känsligt måttet är.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

/** En rad i underlagstabellen: tal till vänster, hel mening till höger. */
function Rad({ tal: n, text }: { tal: number; text: string }) {
  return (
    <tr className="regel">
      <td className="tabular display py-3 pr-5 text-right align-baseline text-[clamp(1.5rem,4vw,2.1rem)] leading-none">
        {heltal(n)}
      </td>
      <td className="py-3 align-baseline leading-snug" style={{ color: 'var(--black-mjuk)' }}>
        {text}
      </td>
    </tr>
  )
}

function Definition({ rubrik, regel, children }: {
  rubrik: string; regel: string; children: React.ReactNode
}) {
  return (
    <div className="grid gap-x-10 gap-y-3 sm:grid-cols-[minmax(0,15rem)_1fr]">
      <h3 className="display text-[clamp(1.25rem,2.8vw,1.6rem)] leading-tight">{rubrik}</h3>
      <div className="max-w-[58ch]">
        <p className="text-[17px] leading-snug">{regel}</p>
        <div className="mt-3 grid gap-3 text-[15px] leading-relaxed"
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
      <h3 className="text-[15px] font-semibold leading-snug">{rubrik}</h3>
      <p className="max-w-[58ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
        {children}
      </p>
    </div>
  )
}

function Steg({ nummer, rubrik, tal, text }: {
  nummer: string; rubrik: string; tal: string; text: string
}) {
  return (
    <li className="grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
      <div className="display tabular text-[clamp(2rem,5vw,3rem)] leading-none"
           style={{ color: 'var(--accent)' }}>
        {tal}
      </div>
      <div>
        <h3 className="text-[16px] font-semibold">
          <span style={{ color: 'var(--black-svag)' }}>{nummer}. </span>
          {rubrik}
        </h3>
        <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed"
           style={{ color: 'var(--black-mjuk)' }}>
          {text}
        </p>
      </div>
    </li>
  )
}
