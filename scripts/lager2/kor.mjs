#!/usr/bin/env node
/**
 * Kör lager 2 över alla voteringspunkter via OpenAI Batch API.
 *
 *   node scripts/lager2/kor.mjs skicka [riksmöte]   # bygg och skicka batch
 *   node scripts/lager2/kor.mjs status <batch_id>   # kolla status
 *   node scripts/lager2/kor.mjs hamta  <batch_id>   # hämta och spara resultat
 *
 * Batch ger 50 % rabatt mot synkrona anrop. Körningen är idempotent: punkter
 * som redan har klartext hoppas över, så en avbruten körning kan tas om.
 */
import fs from 'node:fs'
import { config } from 'dotenv'
import { db } from '../etl/lib.mjs'
import { SYSTEM, SCHEMA, byggUserPrompt } from './prompt.mjs'
import { hamtaPunkter } from './underlag.mjs'

config({ path: '.env.local', quiet: true })

const MODELL = process.env.LAGER2_MODELL ?? 'gpt-5.6-luna'
const NYCKEL = process.env.OPENAI_API_KEY
if (!NYCKEL) throw new Error('OPENAI_API_KEY saknas i .env.local')

// Batchpris per 1M tokens, se docs/KOSTNAD.md
const PRIS = { 'gpt-5.6-luna': { in: 0.10, ut: 0.60 }, 'gpt-5.6-terra': { in: 1.00, ut: 6.00 } }

const openai = async (vag, init = {}) => {
  const res = await fetch(`https://api.openai.com/v1/${vag}`, {
    ...init,
    headers: { Authorization: `Bearer ${NYCKEL}`, ...(init.headers ?? {}) },
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json
}

async function skicka(rm) {
  const punkter = await hamtaPunkter({ rm, baraNya: true })
  if (!punkter.length) {
    console.log('Inga nya voteringspunkter att köra.')
    return
  }
  console.log(`${punkter.length} voteringspunkter att klassificera med ${MODELL}`)

  const rader = punkter.map((p) => JSON.stringify({
    custom_id: String(p.id),
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: MODELL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: byggUserPrompt(p) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'punkt_klartext', strict: true, schema: SCHEMA },
      },
    },
  }))

  const fil = 'lager2-batch.jsonl'
  fs.writeFileSync(fil, rader.join('\n'))
  const mb = (fs.statSync(fil).size / 1024 / 1024).toFixed(1)
  // Grov förhandsuppskattning så vi aldrig skickar iväg något oväntat dyrt.
  const tecken = rader.reduce((s, r) => s + r.length, 0)
  const gissatIn = tecken / 2.8 / 1e6
  const gissatUt = punkter.length * 350 / 1e6
  const pris = PRIS[MODELL] ?? { in: 0, ut: 0 }
  console.log(`Fil: ${fil} (${mb} MB)`)
  console.log(`Uppskattad kostnad: $${(gissatIn * pris.in + gissatUt * pris.ut).toFixed(2)}`)

  const form = new FormData()
  form.append('purpose', 'batch')
  form.append('file', new Blob([fs.readFileSync(fil)]), fil)
  const uppladdad = await openai('files', { method: 'POST', body: form })

  const batch = await openai('batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input_file_id: uppladdad.id,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
      metadata: { steg: 'lager2', rm: rm ?? 'alla' },
    }),
  })
  console.log(`\nBatch skickad: ${batch.id}  (status: ${batch.status})`)
  console.log(`Följ med: node scripts/lager2/kor.mjs status ${batch.id}`)
}

async function status(id) {
  const b = await openai(`batches/${id}`)
  const c = b.request_counts ?? {}
  console.log(`${b.status}  —  ${c.completed ?? 0}/${c.total ?? 0} klara, ${c.failed ?? 0} fel`)
  if (b.status === 'completed') {
    console.log(`Hämta: node scripts/lager2/kor.mjs hamta ${id}`)
  }
  return b
}

async function hamta(id) {
  const b = await openai(`batches/${id}`)
  if (b.status !== 'completed') {
    console.log(`Batchen är inte klar (${b.status}).`)
    return
  }
  const res = await fetch(`https://api.openai.com/v1/files/${b.output_file_id}/content`, {
    headers: { Authorization: `Bearer ${NYCKEL}` },
  })
  const text = await res.text()

  const rader = []
  let fel = 0, tokIn = 0, tokUt = 0
  for (const rad of text.split('\n').filter(Boolean)) {
    const r = JSON.parse(rad)
    const kropp = r.response?.body
    if (!kropp || r.response.status_code !== 200) { fel++; continue }
    tokIn += kropp.usage?.prompt_tokens ?? 0
    tokUt += kropp.usage?.completion_tokens ?? 0
    try {
      const svar = JSON.parse(kropp.choices[0].message.content)
      rader.push({
        forslagspunkt_id: Number(r.custom_id),
        sakfraga: svar.sakfraga,
        ja_innebar: svar.ja_innebar,
        nej_innebar: svar.nej_innebar,
        amne: svar.amne,
        sakerhet: svar.sakerhet,
        modell: MODELL,
      })
    } catch { fel++ }
  }

  for (let i = 0; i < rader.length; i += 500) {
    const { error } = await db()
      .from('punkt_klartext').upsert(rader.slice(i, i + 500), { onConflict: 'forslagspunkt_id' })
    if (error) throw new Error(error.message)
  }

  const pris = PRIS[MODELL] ?? { in: 0, ut: 0 }
  const kostnad = (tokIn / 1e6) * pris.in + (tokUt / 1e6) * pris.ut
  console.log(`Sparade ${rader.length} klartexter, ${fel} fel.`)
  console.log(`Tokens: ${tokIn} in / ${tokUt} ut  —  faktisk kostnad: $${kostnad.toFixed(3)}`)
}

const [, , kommando, arg] = process.argv
if (kommando === 'skicka') await skicka(arg)
else if (kommando === 'status') await status(arg)
else if (kommando === 'hamta') await hamta(arg)
else {
  console.error('Använd: skicka [riksmöte] | status <batch_id> | hamta <batch_id>')
  process.exit(1)
}
