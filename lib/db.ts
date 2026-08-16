import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js'

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

export const PARTIER = ['S', 'M', 'SD', 'C', 'V', 'KD', 'MP', 'L'] as const
export type Parti = (typeof PARTIER)[number]

/** URL-segmentet för en partisida: /partier/sd. */
export function slug(parti: string) {
  return parti.toLowerCase()
}

/**
 * Partikoden bakom ett URL-segment, eller undefined för allt annat.
 *
 * Går aldrig förbi den här funktionen och in i en fråga: partikoden
 * interpoleras i PostgREST:s or-filter, och där duger inte otvättad indata.
 */
export function partiFranSlug(segment: string): Parti | undefined {
  return PARTIER.find((p) => p.toLowerCase() === segment.toLowerCase())
}

/**
 * Regeringen 2022–2026. Vilka partier som styr är en politisk omständighet och
 * finns inte i röstdata.
 *
 * Samma tre partier är också de som röstar närmast identiskt (99,9–100 %), och
 * de två egenskaperna används om vartannat i koden. Det är ingen tillfällighet
 * — de röstar lika därför att de regerar tillsammans — men skulle de någon gång
 * skilja sig åt är det två listor, inte en. Räkna alltid ut likheten ur data.
 */
export const REGERINGSPARTIERNA = ['M', 'KD', 'L'] as const

const PARTINAMN: Record<string, string> = {
  S: 'Socialdemokraterna', M: 'Moderaterna', SD: 'Sverigedemokraterna',
  C: 'Centerpartiet', V: 'Vänsterpartiet', KD: 'Kristdemokraterna',
  MP: 'Miljöpartiet', L: 'Liberalerna',
}

/**
 * Fullt partinamn. Förkortningar hör hemma i tabeller där utrymmet kräver det,
 * inte i löpande text — sajten skrivs för läsare som inte kan dem utantill.
 */
export function namn(forkortning?: string) {
  return (forkortning && PARTINAMN[forkortning]) || forkortning || '—'
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

/** Riksdagens egna partifärger. Endast för dataavkodning. */
export const PARTIFARG: Record<string, string> = {
  S: '#e8112d',
  M: '#52bdec',
  SD: '#ddc000',
  C: '#009933',
  V: '#af0000',
  KD: '#000077',
  MP: '#83cf39',
  L: '#006ab3',
}

export const ROSTFARG: Record<string, string> = {
  Ja: 'var(--ja)',
  Nej: 'var(--nej)',
  Avstår: 'var(--avstar)',
  Frånvarande: 'var(--franvarande)',
}

/** Textfärgen som håller 4,5:1 mot respektive röstfärg. Se globals.css. */
export const ROSTTEXT: Record<string, string> = {
  Ja: 'var(--ja-text)',
  Nej: 'var(--nej-text)',
  Avstår: 'var(--avstar-text)',
  Frånvarande: 'var(--franvarande-text)',
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

export type PartiRost = {
  parti: string
  ja: number
  nej: number
  avstar: number
  franvarande: number
  linje: 'Ja' | 'Nej' | 'Avstår' | 'Frånvarande'
}

/**
 * Partiets linje = det alternativ flest av dess NÄRVARANDE ledamöter valde.
 *
 * Frånvaro räknas medvetet inte med. Ett parti med 30 Ja och 40 frånvarande
 * hade positionen Ja — att redovisa "Frånvarande" som partiets hållning vore
 * ett sakfel.
 *
 * Fallet där ingen enda ledamot röstade har inte inträffat: 0 av 20 552
 * partigrupper i mandatperioden. Grenen finns för att den annars skulle
 * returnera fel linje den dagen det händer.
 */
export function partilinje(r: Omit<PartiRost, 'parti' | 'linje'>): PartiRost['linje'] {
  const avlagda: [PartiRost['linje'], number][] = [
    ['Ja', r.ja], ['Nej', r.nej], ['Avstår', r.avstar],
  ]
  const bast = avlagda.sort((a, b) => b[1] - a[1])[0]
  // Bara om ingen enda ledamot röstade är frånvaro partiets faktiska hållning.
  return bast[1] > 0 ? bast[0] : 'Frånvarande'
}
