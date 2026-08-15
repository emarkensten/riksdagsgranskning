#!/usr/bin/env node
/**
 * Lager 3 via OpenAI Batch API.
 *
 *   node scripts/lager3/kor.mjs skicka [riksmöte]
 *   node scripts/lager3/kor.mjs status <batch_id>
 *   node scripts/lager3/kor.mjs hamta  <batch_id>
 */
import fs from 'node:fs'
import { config } from 'dotenv'
import { db } from '../etl/lib.mjs'
import { SYSTEM, SCHEMA, byggUserPrompt } from './prompt.mjs'
import { hamtaAnforanden } from './underlag.mjs'
import { tillampaRegler, harPartilinje } from './regel.mjs'

config({ path: '.env.local', quiet: true })

const MODELL = process.env.LAGER3_MODELL ?? 'gpt-5.6-terra'
const NYCKEL = process.env.OPENAI_API_KEY
if (!NYCKEL) throw new Error('OPENAI_API_KEY saknas i .env.local')

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
  const alla = await hamtaAnforanden({ rm, baraNya: true })
  // Partilösa ledamöter har ingen partilinje att avvika från.
  const rader = alla.filter((a) => harPartilinje(a.parti))
  if (!rader.length) {
    console.log('Inga nya anföranden att bedöma.')
    return
  }
  console.log(`${rader.length} huvudanföranden att bedöma med ${MODELL}`)

  const jsonl = rader.map((r) => JSON.stringify({
    custom_id: r.anforande_id,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: MODELL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: byggUserPrompt(r) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'retorik_rost', strict: true, schema: SCHEMA },
      },
    },
  }))

  const fil = 'lager3-batch.jsonl'
  fs.writeFileSync(fil, jsonl.join('\n'))
  const tecken = jsonl.reduce((s, r) => s + r.length, 0)
  const pris = PRIS[MODELL] ?? { in: 0, ut: 0 }
  const kostnad = (tecken / 2.8 / 1e6) * pris.in + (rader.length * 700 / 1e6) * pris.ut
  console.log(`Fil: ${fil} (${(fs.statSync(fil).size / 1048576).toFixed(1)} MB)`)
  console.log(`Uppskattad kostnad: $${kostnad.toFixed(2)}`)

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
      metadata: { steg: 'lager3', rm: rm ?? 'alla' },
    }),
  })
  console.log(`\nBatch skickad: ${batch.id} (${batch.status})`)
  console.log(`Följ med: node scripts/lager3/kor.mjs status ${batch.id}`)
}

async function status(id) {
  const b = await openai(`batches/${id}`)
  const c = b.request_counts ?? {}
  console.log(`${b.status} — ${c.completed ?? 0}/${c.total ?? 0} klara, ${c.failed ?? 0} fel`)
  return b
}

async function hamta(id) {
  const b = await openai(`batches/${id}`)
  if (b.status !== 'completed') return console.log(`Batchen är inte klar (${b.status}).`)

  const res = await fetch(`https://api.openai.com/v1/files/${b.output_file_id}/content`, {
    headers: { Authorization: `Bearer ${NYCKEL}` },
  })
  const text = await res.text()

  // Punktnummer måste översättas till forslagspunkt_id, och modellen kan
  // hitta på en punkt som inte finns i ärendet — de kastas.
  const anfIds = text.split('\n').filter(Boolean).map((r) => JSON.parse(r).custom_id)
  const underlag = new Map(
    (await hamtaAnforanden({ baraNya: false })).map((a) => [a.anforande_id, a]),
  )

  const rader = []
  let fel = 0, okand = 0, tokIn = 0, tokUt = 0, nedgraderade = 0
  for (const rad of text.split('\n').filter(Boolean)) {
    const r = JSON.parse(rad)
    const kropp = r.response?.body
    if (!kropp || r.response.status_code !== 200) { fel++; continue }
    tokIn += kropp.usage?.prompt_tokens ?? 0
    tokUt += kropp.usage?.completion_tokens ?? 0

    const anf = underlag.get(r.custom_id)
    if (!anf) { fel++; continue }
    let svar
    try { svar = JSON.parse(kropp.choices[0].message.content) } catch { fel++; continue }

    for (const rå of svar.bedomningar ?? []) {
      const b = tillampaRegler(rå)
      if (b.nedgraderad) nedgraderade++
      const punkt = anf.punkter.find((p) => String(p.punkt) === String(b.punkt))
      if (!punkt) { okand++; continue }
      rader.push({
        anforande_id: r.custom_id,
        forslagspunkt_id: punkt.id,
        parti: anf.parti,
        talarens_krav: b.talarens_krav,
        overensstammelse: b.overensstammelse,
        eget_alternativ: b.eget_alternativ,
        partiets_rost: punkt.partiets_rost,
        motivering: b.motivering,
        sakerhet: b.sakerhet,
        modell: MODELL,
      })
    }
  }

  for (let i = 0; i < rader.length; i += 500) {
    const { error } = await db()
      .from('retorik_rost').upsert(rader.slice(i, i + 500), { onConflict: 'anforande_id,forslagspunkt_id' })
    if (error) throw new Error(error.message)
  }

  const pris = PRIS[MODELL] ?? { in: 0, ut: 0 }
  console.log(`Sparade ${rader.length} bedömningar. ${fel} fel, ${okand} okända punkter, ${nedgraderade} nedgraderade av reglerna.`)
  console.log(`Tokens: ${tokIn} in / ${tokUt} ut — kostnad: $${((tokIn/1e6)*pris.in + (tokUt/1e6)*pris.ut).toFixed(2)}`)
}

const [, , kommando, arg] = process.argv
if (kommando === 'skicka') await skicka(arg)
else if (kommando === 'status') await status(arg)
else if (kommando === 'hamta') await hamta(arg)
else { console.error('Använd: skicka [riksmöte] | status <id> | hamta <id>'); process.exit(1) }
