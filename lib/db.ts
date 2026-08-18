import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Filen ska behandlas som server-only: `createClient` står överst, så allt som
 * importerar härifrån drar med sig ~40 kB supabase-js.
 *
 * Partierna, röstfärgerna och `partilinje()` låg också här fram till quizet på
 * `/rosta`, och flyttade till `lib/parti.ts`, som inte importerar någonting
 * alls. Ingen återexport härifrån: den hade dolt gränsen igen, och dessutom
 * fällt `npm run kontrollera`, som laddar den här filen i naken Node där
 * `@/`-aliaset inte finns.
 *
 * **Formatterarna nedan — `utskott`, `lista`, `tal`, `heltal`, `datum`,
 * `datumtid` — är rena och hör egentligen hemma i `lib/text.ts` av samma skäl.
 * De ligger kvar för att flytten är ännu en omskrivning av fjorton
 * importrader, inte för att gränsen går här.** Kostnaden syns redan: quizet
 * förräknar sina datum och sina meningar på servern eftersom `datum()` och
 * `lista()` inte når webbläsaren.
 */

/**
 * Läsklient för server components.
 *
 * Använder den publika nyckeln med flit: RLS släpper igenom SELECT för anon
 * och blockerar all skrivning, så ingen hemlighet behöver nå frontend.
 */
export function db() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://chwvalgrgbebfhgfpnfb.supabase.co'
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY
  if (!key) throw new Error('Supabase-nyckel saknas')
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * supabase-js kastar inte vid fel — den svarar med tom lista och ett `error`
 * som är lätt att glömma. En vy som slår i anons statement_timeout på tre
 * sekunder blev därför "0 av 0" på metodsidan i stället för ett synligt fel.
 * Läs alltid felet: kör frågan genom den här.
 */
export async function rader<T>(
  fraga: PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const { data, error } = await fraga
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Frågan som räknar rader utan att läsa dem. Filtrera vidare, skicka till `rakna`. */
export function antal(klient: SupabaseClient, tabell: string) {
  return klient.from(tabell).select('*', { count: 'exact', head: true })
}

/**
 * Exakt antal. En vanlig select() kapas tyst vid PostgREST:s takgräns, så
 * ingenting som ska bli en siffra på sidan får räknas genom att läsa rader.
 */
export async function rakna(
  fraga: PromiseLike<{ count: number | null; error: PostgrestError | null }>,
  vad: string,
): Promise<number> {
  const { count, error } = await fraga
  if (error) throw new Error(`${vad}: ${error.message}`)
  return count ?? 0
}

/**
 * Utskottens koder, som de står i `betankande.organ`.
 *
 * Riksdagens data bär bara koden. "SkU" säger ingenting för den som inte
 * arbetar i huset, och sajten skrivs för alla andra — samma skäl som gör att
 * partierna skrivs ut med fulla namn.
 */
const UTSKOTTSNAMN: Record<string, string> = {
  AU: 'Arbetsmarknadsutskottet',
  CU: 'Civilutskottet',
  FiU: 'Finansutskottet',
  FöU: 'Försvarsutskottet',
  JuU: 'Justitieutskottet',
  KrU: 'Kulturutskottet',
  KU: 'Konstitutionsutskottet',
  MJU: 'Miljö- och jordbruksutskottet',
  NU: 'Näringsutskottet',
  SfU: 'Socialförsäkringsutskottet',
  SkU: 'Skatteutskottet',
  SoU: 'Socialutskottet',
  TU: 'Trafikutskottet',
  UbU: 'Utbildningsutskottet',
  UFöU: 'Sammansatta utrikes- och försvarsutskottet',
  UU: 'Utrikesutskottet',
}

/** Utskottets namn, eller koden själv om den är ny sedan den här listan skrevs. */
export function utskott(organ?: string) {
  return (organ && UTSKOTTSNAMN[organ]) || organ || '—'
}

/** Svensk uppräkning: "A", "A och B", "A, B och C". */
export function lista(delar: string[]) {
  if (delar.length <= 1) return delar[0] ?? ''
  return `${delar.slice(0, -1).join(', ')} och ${delar[delar.length - 1]}`
}

/**
 * Svensk taltypografi: decimalkomma, tunt mellanrum i tusental och riktigt
 * minustecken. `toFixed()` ger engelsk punkt och ser fel ut på en svensk sida.
 */
export function tal(n: number, decimaler = 1) {
  return n.toLocaleString('sv-SE', {
    minimumFractionDigits: decimaler,
    maximumFractionDigits: decimaler,
  })
}

/** Heltal med tunt mellanrum i tusental: 2 569, 896 581. */
export function heltal(n: number) {
  return tal(n, 0)
}

/**
 * "6 oktober 2022" — svenska månadsnamn, inte ISO.
 *
 * Zonen sätts uttryckligen, annars avgörs datumet av var servern står. En ren
 * datumkolumn ("2022-10-06") parsas av Date som UTC-midnatt, och formateras den
 * i en zon väster om UTC blir det gårdagens datum: samma sträng gav "6 oktober"
 * i Europe/Stockholm och "5 oktober" i America/New_York.
 */
export function datum(iso?: string) {
  if (!iso) return '—'
  const rentDatum = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  return new Date(iso).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: rentDatum ? 'UTC' : 'Europe/Stockholm',
  })
}

/**
 * "15 augusti 2026, 09.56" — datum och klockslag, i svensk notation.
 *
 * Punkt mellan timme och minut, inte kolon. Zonen sätts uttryckligen till
 * Europe/Stockholm: tidsstämpeln kommer ur databasen i UTC, och renderas den i
 * serverns zon blir hämtningstiden en annan beroende på var sajten står.
 */
export function datumtid(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  const dag = d.toLocaleDateString('sv-SE', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Stockholm',
  })
  const klockan = d.toLocaleTimeString('sv-SE', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm',
  })
  return `${dag}, ${klockan.replace(':', '.')}`
}

