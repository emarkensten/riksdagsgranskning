/**
 * Delade hjälpare för ETL mot data.riksdagen.se.
 *
 * API:ets fallgropar (verifierade 2026-08-15, se CLAUDE.md):
 *  - sz=10000 är ett hårt tak, allt över kapas tyst
 *  - p= och from/tom IGNORERAS på voteringlista och anforandelista
 *  => uppräkning måste ske via parti= (anföranden) resp. bet= (voteringar)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const UA = 'namnupprop/1.0 (+https://github.com/emarkensten/riksdagsgranskning)'
const BASE = 'https://data.riksdagen.se'

export const PARTIER = ['S', 'SD', 'M', 'C', 'V', 'KD', 'MP', 'L', '-']
export const RIKSMOTEN = ['2022/23', '2023/24', '2024/25', '2025/26']

let _client = null

/** En delad klient — createClient i en skrivloop läcker resurser. */
export function db() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    || `https://${process.env.SUPABASE_PROJECT_REF || 'chwvalgrgbebfhgfpnfb'}.supabase.co`
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SECRET_KEY saknas i .env.local')
  _client = createClient(url, key, { auth: { persistSession: false } })
  return _client
}

export async function api(path, params = {}) {
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(150_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (attempt === 3) throw err
      await sleep(1500 * (attempt + 1))
    }
  }
}

/** API:et returnerar ett objekt vid 1 träff och en array vid flera. */
export const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x])

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Kör tasks med begränsad samtidighet.
 *
 * Ett item som failade loggades tidigare med en rad och blev null, varpå
 * körningen fortsatte och rapporterade succé. Ett betänkande som föll bort tog
 * med sig sina förslagspunkter, voteringar och reservationer — tyst, och inget
 * steg jämförde antalet lyckade mot antalet förväntade.
 *
 * api() gör redan fyra försök med backoff. Kommer ett item ändå inte hem är det
 * ett verkligt bortfall, och då ska körningen stanna hellre än skriva ett
 * ofullständigt underlag som ser komplett ut. Alla items körs färdigt först, så
 * felraden visar hela bortfallet och inte bara det som hann bli fel först.
 */
export async function pool(items, limit, worker) {
  const results = []
  const fel = []
  let idx = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++
      try {
        results[i] = await worker(items[i], i)
      } catch (err) {
        results[i] = null
        const namn = items[i]?.beteckning ?? items[i]?.anforande_id ?? i
        fel.push(`${namn}: ${err.message}`)
        console.error(`  ! ${namn}: ${err.message}`)
      }
    }
  })
  await Promise.all(runners)
  if (fel.length) {
    throw new Error(
      `${fel.length} av ${items.length} hämtningar misslyckades: ${fel.slice(0, 3).join(' | ')}`)
  }
  return results
}

/**
 * Läser ALLA rader ur en fråga.
 *
 * Supabase kapar svar vid 1000 rader på servern (db-max-rows). Ett stort
 * .range() lyfter INTE den gränsen — det kapas tyst, vilket ger ofullständig
 * data utan felmeddelande. Enda säkra vägen är att sidindela tills en sida
 * kommer tillbaka kortare än sidstorleken.
 *
 * @param {(fran:number,till:number)=>PromiseLike<{data:any[],error:any}>} sida
 */
export async function lasAlla(sida, sidstorlek = 1000) {
  const alla = []
  for (let fran = 0; ; fran += sidstorlek) {
    const { data, error } = await sida(fran, fran + sidstorlek - 1)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    alla.push(...data)
    if (data.length < sidstorlek) break
  }
  return alla
}

/** Upsert i portioner — Supabase klarar inte hur stora payloads som helst. */
export async function upsert(table, rows, opts = {}) {
  const size = opts.chunk ?? 500
  let done = 0
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size)
    const { error } = await db().from(table).upsert(chunk, { onConflict: opts.onConflict })
    if (error) throw new Error(`${table}: ${error.message}`)
    done += chunk.length
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}`)
  }
  if (rows.length) process.stdout.write('\n')
  return done
}

/**
 * Uppdaterar de materialiserade aggregaten, i beroendeordning.
 *
 * Ordningen ligger i databasen (aggregat_vyer) och inte här, så en ny vy inte
 * kan glömmas bort på ett ställe. En vy per anrop — elva refresh i samma anrop
 * spränger PostgREST:s statement timeout.
 *
 * Bor här och inte i run.mjs därför att aggregaten hänger på mer än rösterna.
 * punkt_klartext skrivs av lager 2, och den vägen lämnade matvyerna inaktuella
 * tills någon råkade köra ett ETL-steg. Den som skriver ett underlag ska kunna
 * uppdatera det som räknar på det.
 */
export async function uppdateraAggregat() {
  console.log('\n== Uppdaterar aggregat ==')
  const { data: vyer, error: listfel } = await db().rpc('aggregat_vyer')
  if (listfel) throw new Error(listfel.message)
  for (const vy of vyer) {
    const { error } = await db().rpc('refresh_aggregat', { vy })
    if (error) throw new Error(`${vy}: ${error.message}`)
    console.log(`  ${vy} uppdaterad`)
  }
}

/** Riksdagens texter är HTML-fragment. Vi vill ha ren text för LLM och sökning. */
export function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** motforslag_partier kommer som `"SD"` eller `"V","MP"`. */
export function parsePartier(raw) {
  if (!raw) return null
  const found = String(raw).match(/[A-ZÅÄÖ]+/g)
  return found?.length ? found : null
}

export function toDate(s) {
  if (!s) return null
  const d = String(s).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null
}
