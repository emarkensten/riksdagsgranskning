import { createClient } from '@supabase/supabase-js'

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

export const PARTIER = ['S', 'M', 'SD', 'C', 'V', 'KD', 'MP', 'L'] as const
export type Parti = (typeof PARTIER)[number]

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
 * ett sakfel. Det inträffar i ~0,5 % av partigrupperna.
 */
export function partilinje(r: Omit<PartiRost, 'parti' | 'linje'>): PartiRost['linje'] {
  const avlagda: [PartiRost['linje'], number][] = [
    ['Ja', r.ja], ['Nej', r.nej], ['Avstår', r.avstar],
  ]
  const bast = avlagda.sort((a, b) => b[1] - a[1])[0]
  // Bara om ingen enda ledamot röstade är frånvaro partiets faktiska hållning.
  return bast[1] > 0 ? bast[0] : 'Frånvarande'
}
