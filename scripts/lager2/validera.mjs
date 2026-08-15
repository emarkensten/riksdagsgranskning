#!/usr/bin/env node
/**
 * Validering före batch. Kör lager 2-prompten på ett litet urval och skriver
 * resultatet till en fil för manuell granskning.
 *
 *   node scripts/lager2/validera.mjs [antal] [modell]
 *
 * Detta steg är obligatoriskt enligt CLAUDE.md — $22 brändes en gång på ett
 * batchjobb vars prompt mätte fel sak. Kostnaden här är några ören.
 */
import fs from 'node:fs'
import { config } from 'dotenv'
import { db, pool } from '../etl/lib.mjs'
import { SYSTEM, SCHEMA, byggUserPrompt } from './prompt.mjs'

config({ path: '.env.local' })

const ANTAL = parseInt(process.argv[2] ?? '30', 10)
const MODELL = process.argv[3] ?? 'gpt-5.6-luna'
const NYCKEL = process.env.OPENAI_API_KEY
if (!NYCKEL) throw new Error('OPENAI_API_KEY saknas i .env.local')

// Priser per 1M tokens (standard, ej batch) — se docs/KOSTNAD.md
const PRIS = {
  'gpt-5.6-luna': { in: 0.20, ut: 1.20 },
  'gpt-5.6-terra': { in: 2.00, ut: 12.00 },
  'gpt-5-nano': { in: 0.05, ut: 0.40 },
}

async function hamtaUrval(n) {
  // Sprid urvalet över utskott så vi inte validerar mot ett enda sakområde.
  const { data: punkter, error: err2 } = await db()
    .from('forslagspunkt')
    .select('id, bet_dok_id, rm, beteckning, punkt, rubrik, forslag, motforslag_nummer, motforslag_partier')
    .not('votering_id', 'is', null)
    .eq('rm', '2024/25')
    .range(0, 9999)
  if (err2) throw new Error(err2.message)

  // Deterministiskt spritt urval: ett steg genom listan sorterad på utskott.
  const sorterade = punkter.sort((a, b) =>
    (a.beteckning + a.punkt).localeCompare(b.beteckning + b.punkt))
  const steg = Math.max(1, Math.floor(sorterade.length / n))
  const urval = []
  for (let i = 0; i < sorterade.length && urval.length < n; i += steg) urval.push(sorterade[i])

  // Hämta betänkandetitel och reservationer.
  for (const p of urval) {
    const { data: bet } = await db()
      .from('betankande').select('titel').eq('dok_id', p.bet_dok_id).single()
    p.bet_titel = bet?.titel
    const { data: res } = await db()
      .from('reservation').select('nummer, partier, rubrik, text')
      .eq('bet_dok_id', p.bet_dok_id).eq('punkt', p.punkt)
    p.reservationer = res ?? []
  }
  return urval
}

async function klassificera(punkt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${NYCKEL}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: byggUserPrompt(punkt) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'punkt_klartext', strict: true, schema: SCHEMA },
      },
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return {
    svar: JSON.parse(json.choices[0].message.content),
    usage: json.usage,
  }
}

const urval = await hamtaUrval(ANTAL)
console.log(`Validerar ${urval.length} voteringspunkter med ${MODELL}\n`)

let tokIn = 0, tokUt = 0
const rader = await pool(urval, 4, async (p) => {
  const { svar, usage } = await klassificera(p)
  tokIn += usage.prompt_tokens
  tokUt += usage.completion_tokens
  process.stdout.write('.')
  return { punkt: p, svar }
})
console.log('\n')

const lyckade = rader.filter(Boolean)
const pris = PRIS[MODELL] ?? { in: 0, ut: 0 }
const kostnad = (tokIn / 1e6) * pris.in + (tokUt / 1e6) * pris.ut

// Rapport för manuell granskning
const ut = [`# Validering lager 2 — ${MODELL}`, '']
ut.push(`Urval: ${lyckade.length} av ${urval.length} voteringspunkter (riksmöte 2024/25)`)
ut.push(`Tokens: ${tokIn} in / ${tokUt} ut`)
ut.push(`Kostnad detta urval: $${kostnad.toFixed(4)}`)
ut.push(`Extrapolerat till 649 punkter: $${(kostnad / lyckade.length * 649).toFixed(2)} (standardpris)`)
ut.push(`Samma i batch (50 % rabatt): $${(kostnad / lyckade.length * 649 / 2).toFixed(2)}`, '')

const sakerhet = {}
for (const r of lyckade) sakerhet[r.svar.sakerhet] = (sakerhet[r.svar.sakerhet] ?? 0) + 1
ut.push(`Säkerhet: ${JSON.stringify(sakerhet)}`, '')
ut.push('---', '')

for (const { punkt, svar } of lyckade) {
  ut.push(`## ${punkt.beteckning} punkt ${punkt.punkt} — ${punkt.rubrik ?? ''}`)
  ut.push(`*${punkt.bet_titel ?? ''}*  ·  motförslag från ${punkt.motforslag_partier?.join(', ') ?? '—'}  ·  ${punkt.reservationer.length} reservation(er)`)
  ut.push('')
  ut.push(`**Sakfråga:** ${svar.sakfraga}`)
  ut.push(`**Ja innebar:** ${svar.ja_innebar}`)
  ut.push(`**Nej innebar:** ${svar.nej_innebar}`)
  ut.push(`**Ämne:** ${svar.amne}  ·  **Säkerhet:** ${svar.sakerhet}`)
  ut.push('')
  ut.push('<details><summary>Utskottets förslag (underlag)</summary>', '')
  ut.push('```', (punkt.forslag ?? '').slice(0, 600), '```', '</details>', '')
}

const fil = `validering-lager2-${MODELL}.md`
fs.writeFileSync(fil, ut.join('\n'))
console.log(`Kostnad: $${kostnad.toFixed(4)}  (${tokIn} in / ${tokUt} ut)`)
console.log(`Extrapolerat till 649 punkter i batch: $${(kostnad / lyckade.length * 649 / 2).toFixed(2)}`)
console.log(`\nRapport: ${fil}`)
