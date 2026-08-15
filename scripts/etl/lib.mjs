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

const UA = 'riksdagsgranskning/1.0 (+https://github.com/emarkensten/riksdagsgranskning)'
const BASE = 'https://data.riksdagen.se'

export const PARTIER = ['S', 'SD', 'M', 'C', 'V', 'KD', 'MP', 'L', '-']
export const RIKSMOTEN = ['2022/23', '2023/24', '2024/25', '2025/26']

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    || `https://${process.env.SUPABASE_PROJECT_REF || 'chwvalgrgbebfhgfpnfb'}.supabase.co`
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SECRET_KEY saknas i .env.local')
  return createClient(url, key, { auth: { persistSession: false } })
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

/** Kör tasks med begränsad samtidighet. */
export async function pool(items, limit, worker) {
  const results = []
  let idx = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++
      try {
        results[i] = await worker(items[i], i)
      } catch (err) {
        results[i] = null
        console.error(`  ! ${items[i]?.beteckning ?? items[i]?.anforande_id ?? i}: ${err.message}`)
      }
    }
  })
  await Promise.all(runners)
  return results
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
