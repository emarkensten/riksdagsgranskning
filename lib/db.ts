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

/**
 * Regeringen 2022–2026. Vilka partier som styr är en politisk omständighet och
 * finns inte i röstdata.
 *
 * Samma tre partier är också de som röstar närmast identiskt (99,9–100 %), och
 * de två egenskaperna används om vartannat i koden. Det är ingen tillfällighet
 * — de röstar lika därför att de regerar tillsammans — men skulle de någon gång
 * skilja sig åt är det två listor, inte en. Räkna alltid ut likheten ur data.
 */
export const REGERINGSPARTIERNA = ['M', 'KD', 'L']

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

/** "6 oktober 2022" — svenska månadsnamn, inte ISO. */
export function datum(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('sv-SE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
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
