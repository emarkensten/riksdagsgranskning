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

export type PartiRost = {
  parti: string
  ja: number
  nej: number
  avstar: number
  franvarande: number
  linje: 'Ja' | 'Nej' | 'Avstår' | 'Frånvarande'
}

/** Partiets linje = det alternativ flest av dess ledamöter röstade på. */
export function partilinje(r: Omit<PartiRost, 'parti' | 'linje'>): PartiRost['linje'] {
  const par: [PartiRost['linje'], number][] = [
    ['Ja', r.ja], ['Nej', r.nej], ['Avstår', r.avstar], ['Frånvarande', r.franvarande],
  ]
  return par.sort((a, b) => b[1] - a[1])[0][0]
}
