import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'
import { antal, db, datum, heltal, rader, rakna, tal } from '@/lib/db'
import AMNEN from '@/lib/amnen.json'
import { FRAGOR, rakneord } from '@/lib/fragor'
import { Rostrad, Rostnyckel, type PartiRad } from '@/components/rostrad'
import { Chip, Etikett, Nyckeltal, Textlank } from '@/components/system'
import { Forstoringsglas } from '@/components/ikoner'
import { regeringsspann } from '@/lib/partier'

// Ingen revalidate: sidan läser searchParams och renderas därför alltid
// dynamiskt. En deklaration här hade sett ut som en cache som inte finns.

const PER_SIDA = 40

type Sok = { amne?: string; q?: string; rm?: string; sida?: string }
type Valt = { amne?: string; rm?: string; q?: string }

type Rad = {
  forslagspunkt_id: number
  rm: string
  beteckning: string
  punkt: string
  votering_id: string | null
  datum: string
  sakfraga: string
  amne: string
  sakerhet: string
}

/**
 * De fem frågor som inte beror på sökningen.
 *
 * Sidan är dynamisk — den läser searchParams — så utan den här inramningen
 * körs de vid *varje* anrop, inklusive varje unik sökning. Uppmätt i
 * utveckling: en sökning som ingen ställt förut kostade 300–700 ms, och fyra
 * sjundedelar av rundresorna gick till tal som är desamma för alla besökare.
 * De ändras bara när ETL:n körts, alltså långt mer sällan än en gång i
 * timmen — samma `revalidate` som resten av sajten använder.
 *
 * `unstable_cache` och inte fetch-cachen: supabase-js går visserligen genom
 * fetch, men vilken cache den hamnar i beror på Next-version och på vad
 * sidan råkar göra i övrigt. Det här säger ut vad som ska cachas.
 */
const stommen = unstable_cache(
  async () => {
    const klient = db()
    const [riksmoten, totalt, medRoster, disciplin, likhetsspann] = await Promise.all([
      rader<{ rm: string }>(
        klient.from('riksmote_summering').select('rm').order('rm', { ascending: false })),
      // Hela listans storlek, oberoende av filtren. Ingressen påstår hur många
      // beslut sajten förklarar, och det talet får inte stå hårdkodat.
      rakna(antal(klient, 'votering_lista'), 'voteringar'),
      // votering_lista är varje förslagspunkt med klarspråk — den filtrerar inte
      // på röstdata. jamn_votering har en rad per votering_id i parti_rost, alltså
      // de punkter som faktiskt fick protokollförda röster. Skillnaden är liten
      // (18 av 2 587) men den förklarar varför /fynd säger ett annat tal än den
      // här sidan, och då ska den stå utskriven i stället för att förvirra.
      rakna(antal(klient, 'jamn_votering'), 'voteringar med röstdata'),
      // Åtta rader. Summeras i JS och inte i SQL därför att PostgREST inte har
      // någon aggregatform som `rader()` kan felkontrollera på samma sätt.
      rader<{ avlagda: number; avvikande: number }>(
        klient.from('parti_disciplin').select('avlagda, avvikande')),
      regeringsspann(),
    ])
    const avlagda = disciplin.reduce((n, r) => n + Number(r.avlagda), 0)
    const avvikande = disciplin.reduce((n, r) => n + Number(r.avvikande), 0)
    return {
      riksmoten: riksmoten.map((r) => r.rm),
      totalt,
      medRoster,
      avlagda,
      // Andelen som följde, inte andelen som avvek. Tesen handlar om vad man kan
      // lita på — 0,139 % avvikande är samma tal, men läses som en felmarginal.
      foljde: avlagda > 0 ? (100 * (avlagda - avvikande)) / avlagda : 0,
      likhetsspann,
    }
  },
  ['startsidans-stomme'],
  { revalidate: 3600 },
)

async function hamta({ amne, q, rm, sida }: Sok) {
  const klient = db()
  const stom = await stommen()
  const { riksmoten } = stom

  // Filtren valideras mot kända värden. Ett okänt ämne eller riksmöte ska ge
  // hela listan, inte noll träffar utan förklaring.
  const valtAmne = amne && AMNEN.includes(amne) ? amne : undefined
  const valtRm = rm && riksmoten.includes(rm) ? rm : undefined
  const sok = q?.trim() || undefined
  /**
   * Söksträngen som ett citerat ilike-mönster.
   *
   * PostgREST läser kommatecken och parenteser i or() som syntax. En sökning på
   * "el, gas och värme" hade annars delats i tre villkor mot kolumner som inte
   * finns, och gett ett fel i stället för träffar. Citattecken runt värdet
   * stänger av tolkningen; de citattecken som står i söksträngen escapas.
   */
  const somMonster = (s: string) => `"%${s.replace(/[\\"]/g, (c) => `\\${c}`)}%"`
  // Golvas, inte bara klampas nedåt. Ett decimaltal skulle ge ett radfönster
  // som inte börjar på en sidgräns, och föras vidare in i sidlänkarna som
  // sida=3.7 → sida=4.7 — rader hoppas då över mellan sidor.
  const nr = Math.max(1, Math.floor(Number(sida)) || 1)

  /** Samma filter på både räkningen och sidhämtningen. */
  const filtrera = <T extends { eq: any; or: any }>(f: T): T => {
    let x: any = f
    if (valtAmne) x = x.eq('amne', valtAmne)
    if (valtRm) x = x.eq('rm', valtRm)
    // Sökfältet lovar sakfråga, beteckning och utskott. Frågan sökte bara i
    // sakfraga, så "FiU12" gav tyst noll träffar trots att fältet stod där.
    // Betänkandets titel tas med på köpet: den som söker på ett ärendenamn
    // menar rimligen det, och kolumnen finns redan i vyn.
    if (sok) {
      const v = somMonster(sok)
      x = x.or(['sakfraga', 'beteckning', 'betankande', 'organ']
        .map((kolumn) => `${kolumn}.ilike.${v}`).join(','))
    }
    return x
  }

  // Räknas före hämtningen. PostgREST svarar 416 när range() börjar bortom
  // sista raden, så sidnumret måste vara känt giltigt innan frågan ställs —
  // annars blir /?sida=999 ett 500-fel i stället för ett 404.
  const traffar = await rakna(filtrera(antal(klient, 'votering_lista')), 'voteringar')
  const sidor = Math.max(1, Math.ceil(traffar / PER_SIDA))
  if (nr > sidor) return null

  const punkter = await rader<Rad>(
    filtrera(
      klient.from('votering_lista')
        .select('forslagspunkt_id, rm, beteckning, punkt, votering_id, datum, sakfraga, amne, sakerhet'))
      // Datum, inte forslagspunkt_id: id-ordningen är importordning, och 2024/25
      // ligger på de lägsta id:na trots att det är periodens tredje riksmöte.
      .order('datum', { ascending: false })
      .order('forslagspunkt_id', { ascending: false })
      .range((nr - 1) * PER_SIDA, nr * PER_SIDA - 1))

  // Partiernas röster för de voteringar som faktiskt visas — som mest 40 rader
  // gånger åtta partier.
  const roster = await rader<PartiRad & { votering_id: string }>(
    klient.from('parti_rost').select('votering_id, parti, ja, nej, avstar, franvarande')
      .in('votering_id', punkter.map((p) => p.votering_id).filter(Boolean) as string[]))

  const perVotering = new Map<string, PartiRad[]>()
  for (const r of roster) {
    if (!perVotering.has(r.votering_id)) perVotering.set(r.votering_id, [])
    perVotering.get(r.votering_id)!.push(r)
  }

  // Stommen bär riksmoten, totalt, medRoster, avlagda, foljde och
  // likhetsspann — alltså allt som är lika för varje besökare.
  return {
    ...stom,
    punkter,
    perVotering,
    traffar,
    sidor,
    nr,
    valt: { amne: valtAmne, rm: valtRm, q: sok } as Valt,
  }
}

/** Adress till samma sökning med ett filter eller sidnummer utbytt. */
function lank(valt: Valt, andring: Partial<Valt & { sida: number }>) {
  const slut = { ...valt, sida: 1, ...andring }
  const p = new URLSearchParams()
  if (slut.q) p.set('q', slut.q)
  if (slut.amne) p.set('amne', slut.amne)
  if (slut.rm) p.set('rm', slut.rm)
  if (slut.sida && slut.sida > 1) p.set('sida', String(slut.sida))
  const s = p.toString()
  return s ? `/?${s}` : '/'
}

/**
 * Sidnumren som ska synas: alltid första och sista, plus ett fönster runt den
 * aktuella. `null` är ett hopp och renderas som ett ellipstecken.
 */
function sidnummer(nr: number, sidor: number): (number | null)[] {
  const visa = new Set([1, sidor, nr - 1, nr, nr + 1])
  const lista = [...visa].filter((n) => n >= 1 && n <= sidor).sort((a, b) => a - b)
  return lista.flatMap((n, i) => (i > 0 && n - lista[i - 1] > 1 ? [null, n] : [n]))
}

export default async function Start({ searchParams }: { searchParams: Promise<Sok> }) {
  const d = await hamta(await searchParams)
  // Ett sidnummer bortom sista sidan är inte en tom lista, det är en adress
  // som inte finns.
  if (!d) notFound()
  const forsta = d.traffar === 0 ? 0 : (d.nr - 1) * PER_SIDA + 1
  const sista = Math.min(d.nr * PER_SIDA, d.traffar)
  const amnen = [...AMNEN].sort((a, b) => a.localeCompare(b, 'sv'))
  // Sökningen och filtren är sidans hero. Är någon av dem satt har läsaren
  // redan gjort sitt val, och då ska träffarna ligga högst upp i stället för
  // en ingress som förklarar vad sajten är.
  const soker = Boolean(d.valt.q || d.valt.amne || d.valt.rm)

  return (
    <main>
      {/* Luftigt nog att bära en display-rubrik, stramt nog att första träffen
          ryms över vecket på 1280×720 — den fanns på y=724 med magasinets
          rytm, och en söksida som inte visar ett enda resultat ser ut som en
          startsida med ett sökfält på. */}
      <section className={soker ? 'pb-6 pt-10' : 'pb-7 pt-12'}>
        <Etikett className="stig" ton="signal">Mandatperioden 2022–2026</Etikett>

        <h1
          className="display stig mt-5 max-w-[14ch] text-[clamp(2.6rem,7.5vw,80px)]"
          style={{ animationDelay: '80ms' }}
        >
          Vad gjorde de?
        </h1>

        {!soker && (
          <p
            className="stig mt-6 max-w-[54ch] text-[clamp(18px,2.2vw,21px)] leading-[1.45]"
            style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}
          >
            Valkompasserna frågar vad partierna vill göra. Här står vad de
            gjorde: {heltal(d.totalt)} beslut med namnupprop, vart och ett
            förklarat på vanlig svenska — vad frågan gällde, vad ett ja innebar
            och vad ett nej innebar.
          </p>
        )}
      </section>

      {/* Sökfältet är ett vanligt GET-formulär. Filtren följer med som dolda
          fält, annars nollställs de av en sökning. */}
      {/* Samma beat som ingressen, inte ett fjärde steg. Sökfältet är sidans
          uppgift och ska inte vara det sista som infinner sig. */}
      <form className="stig flex flex-col gap-3.5 pb-6" style={{ animationDelay: '160ms' }}>
        {d.valt.amne && <input type="hidden" name="amne" value={d.valt.amne} />}
        {d.valt.rm && <input type="hidden" name="rm" value={d.valt.rm} />}
        {/* Knappen sitter inne i pillret, därav den lilla högermarginalen mot
            den stora vänstra: 7 px runt knappen, 26 px in till texten. */}
        <label
          className="flex w-full max-w-[680px] items-center gap-3 rounded-full py-[7px] pl-[22px] pr-[7px] sm:gap-3.5 sm:pl-[26px]"
          style={{ border: '1px solid var(--linje-stark)' }}
        >
          <span className="shrink-0" style={{ color: 'var(--black-svag)' }}>
            <Forstoringsglas storlek={20} />
          </span>
          <input
            name="q"
            defaultValue={d.valt.q ?? ''}
            // Konkreta exempel och inte "sök här": placeholdern är det enda
            // stället som visar vad man kan fråga om. Alla tre ger träffar
            // (13, 96 respektive 97) — ett förslag utan resultat vore värre
            // än ett tomt fält.
            placeholder="Sök på en fråga — kärnkraft, skolan, klimat"
            aria-label="Sök bland riksdagens beslut"
            className="w-full min-w-0 bg-transparent py-2.5 text-[16px] outline-none placeholder:text-[var(--black-svag)] sm:text-[17px]"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full px-[20px] py-3 text-[14.5px] font-semibold transition-[filter] duration-150 hover:brightness-[0.94] sm:px-[24px]"
            style={{ background: 'var(--black)', color: 'var(--papper)' }}
          >
            Sök
          </button>
        </label>

        {/* Valfrågorna tar ämnenas plats som första remsa, och ämnena flyttar
            ned ett steg.

            Det är ett byte och inte ett tillägg: platsen närmast sökfältet är
            sidans mest lästa, och den var vikt åt sexton etiketter av typen
            "konstitution och demokrati" — riksdagens vokabulär, inte
            väljarens. Nio konkreta frågor säger på en rad vad sajten kan svara
            på. Alla sexton ämnena finns kvar, en remsa längre ned.

            Remsorna leder olika håll, och det syns: de här nio lämnar
            startsidan, medan ämnena och riksmötena filtrerar listan nedanför.
            Därför står de i var sin remsa och aldrig blandade. */}
        {/* Etiketten är inte dekor. Utan den ser de två remsorna likadana ut
            — samma chips, samma storlek — fast den ena lämnar sidan och den
            andra filtrerar listan nedanför. Ämnesremsan behöver ingen egen:
            dess första chip heter "Alla ämnen" och säger vad den gör. */}
        <Etikett className="pt-1">Valets frågor</Etikett>
        <div className="remsa" aria-label="Valets frågor">
          {FRAGOR.map((f) => (
            <Chip key={f.slug} href={`/fragor/${f.slug}`} aktiv={false}>
              {f.kort}
            </Chip>
          ))}
          {/* Talet härleds, som överallt annars. Det stod skrivet för hand
              här — den sista handskrivna nian på sajten, och just den sortens
              mening `rakneord()` finns för att hålla sann. */}
          <Chip href="/fragor" aktiv={false}>
            Alla {rakneord(FRAGOR.length)} frågor →
          </Chip>
        </div>

        <Etikett className="pt-2">Filtrera besluten</Etikett>

        <div className="remsa" aria-label="Filtrera besluten">
          <Chip href={lank(d.valt, { amne: undefined })} aktiv={!d.valt.amne}>Alla ämnen</Chip>
          {amnen.map((a) => (
            <Chip
              key={a}
              href={lank(d.valt, { amne: d.valt.amne === a ? undefined : a })}
              aktiv={d.valt.amne === a}
            >
              {a}
            </Chip>
          ))}
          <span aria-hidden className="mx-2 my-1 w-px shrink-0" style={{ background: 'var(--linje-stark)' }} />
          {d.riksmoten.map((rm) => (
            <Chip
              key={rm}
              href={lank(d.valt, { rm: d.valt.rm === rm ? undefined : rm })}
              aktiv={d.valt.rm === rm}
            >
              {rm}
            </Chip>
          ))}
        </div>
      </form>

      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pb-4">
        <Rostnyckel />
        {d.traffar > 0 && (
          <p className="tabular text-[14px]" style={{ color: 'var(--black-svag)' }}>
            Visar {heltal(forsta)}–{heltal(sista)} av {heltal(d.traffar)}
          </p>
        )}
      </div>

      <ol>
        {d.punkter.map((p) => {
          const roster = (p.votering_id && d.perVotering.get(p.votering_id)) || []
          const ja = roster.reduce((n, r) => n + Number(r.ja), 0)
          const nej = roster.reduce((n, r) => n + Number(r.nej), 0)
          const avstar = roster.reduce((n, r) => n + Number(r.avstar), 0)
          return (
            <li key={p.forslagspunkt_id}>
              <Link
                href={`/voteringar/${p.forslagspunkt_id}`}
                // 356 px, inte designens 300: alla åtta partier ska rymmas på en
                // rad. Med 300 bryter etiketterna 6 + 2 och mönstret går förlorat.
                className="grid items-start gap-x-8 gap-y-4 py-6 transition-opacity duration-150 hover:opacity-70 md:grid-cols-[1fr_356px]"
                style={{ borderTop: '1px solid var(--linje)' }}
              >
                <div>
                  <div className="mono flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] uppercase tracking-[0.1em]"
                       style={{ color: 'var(--etikett)' }}>
                    <span>{p.beteckning} · punkt {p.punkt}</span>
                    <span>{datum(p.datum)}</span>
                    <span style={{ color: 'var(--accent)' }}>{p.amne}</span>
                    {p.sakerhet !== 'hög' && <span>osäker tolkning</span>}
                  </div>
                  <p className="mt-2.5 max-w-[56ch] text-[19px] font-semibold leading-[1.35] tracking-[-0.01em]">
                    {p.sakfraga}
                  </p>
                </div>
                {roster.length > 0 && (
                  <div className="flex flex-col gap-2.5 md:items-end">
                    <Rostrad rader={roster} kompakt />
                    <span className="tabular text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
                      {heltal(ja)} ja · {heltal(nej)} nej
                      {avstar > 0 && ` · ${heltal(avstar)} avstår`}
                    </span>
                  </div>
                )}
              </Link>
            </li>
          )
        })}
      </ol>

      {d.punkter.length === 0 && (
        <p className="regel py-14 text-[16.5px]" style={{ color: 'var(--black-svag)' }}>
          Inga voteringar matchade sökningen.{' '}
          <Link href="/" className="underline hover:opacity-70">Visa alla</Link>
        </p>
      )}

      {d.sidor > 1 && (
        <nav
          className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-7"
          style={{ borderTop: '1px solid var(--linje)' }}
          aria-label="Sidnavigering"
        >
          <span className="tabular text-[14px]" style={{ color: 'var(--black-svag)' }}>
            Visar {heltal(forsta)}–{heltal(sista)} av {heltal(d.traffar)}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {sidnummer(d.nr, d.sidor).map((n, i) =>
              n === null ? (
                <span key={`hopp-${i}`} className="px-1.5" style={{ color: 'var(--etikett)' }}>…</span>
              ) : n === d.nr ? (
                <span
                  key={n}
                  aria-current="page"
                  className="tabular rounded-full px-3.5 py-2.5 text-[14px] font-semibold"
                  style={{ background: 'var(--black)', color: 'var(--papper)' }}
                >
                  {n}
                </span>
              ) : (
                <Link
                  key={n}
                  href={lank(d.valt, { sida: n })}
                  className="tabular rounded-full px-3.5 py-2.5 text-[14px] transition-colors duration-150 hover:bg-[var(--papper-djup)]"
                  style={{ color: 'var(--black-mjuk)' }}
                >
                  {n}
                </Link>
              ),
            )}
            {d.nr < d.sidor && (
              <Link
                href={lank(d.valt, { sida: d.nr + 1 })}
                className="ml-2 rounded-full px-[18px] py-2.5 text-[14px] font-semibold transition-colors duration-150 hover:bg-[var(--papper-djup)]"
                style={{ border: '1px solid var(--linje-stark)' }}
              >
                Nästa
              </Link>
            )}
          </div>
        </nav>
      )}

      {/* Tesen. Sidans enda mörka fält, och det ligger sist med flit: verktyget
          ska mötas först, argumentet läsas efteråt. Aggregat överst var precis
          det som fick en förstaläsare att läsa "ensam mot alla" som ett
          omdöme om partiet. */}
      <section className="panel helbredd mt-4 py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl items-start gap-y-12 px-5 sm:px-8 md:grid-cols-[1.1fr_1fr] md:gap-x-14">
          <div>
            <Etikett>Därför står partiernas linjer här, inte ledamöternas</Etikett>
            <Nyckeltal ton="signal" klass="mt-5 text-[clamp(3.4rem,11vw,116px)]">
              {tal(d.foljde)} %
            </Nyckeltal>
            <p className="mt-7 max-w-[40ch] text-[19px] leading-[1.45]" style={{ color: 'var(--black-mjuk)' }}>
              av {heltal(d.avlagda)} avlagda röster följde det egna partiets
              linje. Vilken ledamot som satt på stolen avgjorde alltså nästan
              aldrig hur rösten föll — partiets linje gjorde det.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Etikett>Tre partier, ett röstfacit</Etikett>
            <p className="max-w-[42ch] text-[17px] leading-[1.5]" style={{ color: 'var(--black-mjuk)' }}>
              Moderaterna, Kristdemokraterna och Liberalerna röstade lika i{' '}
              {d.likhetsspann} av alla voteringar. Ett fynd som namnger ett av
              dem gäller därför i praktiken alla tre — vilket som hamnar i
              rubriken avgörs av tiondelar.
            </p>
            {/* Faller bort med skillnaden. Är talen lika finns inget att
                förklara — och då renderar metodsidan inte heller #olika-tal,
                så en oskyddad länk hit hade pekat på ett ankare som inte
                finns. */}
            {d.totalt > d.medRoster && (
              <p className="max-w-[44ch] text-[13.5px] leading-[1.55]" style={{ color: 'var(--black-svag)' }}>
                {heltal(d.medRoster)} av de {heltal(d.totalt)} besluten
                avgjordes med namnupprop om sakfrågan. För de{' '}
                {heltal(d.totalt - d.medRoster)} övriga gällde namnuppropet
                motiveringen — hur beslutet skulle motiveras, inte vad som
                beslutades. De raderna visas därför utan partiernas linjer.{' '}
                <Link href="/metod#olika-tal" className="underline hover:opacity-70">
                  Varför talen skiljer sig
                </Link>
              </p>
            )}
            <div className="mt-1 flex flex-wrap gap-x-7 gap-y-3">
              <Textlank href="/fynd">Se vad materialet visar</Textlank>
              <Textlank href="/metod">Så är det räknat</Textlank>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
