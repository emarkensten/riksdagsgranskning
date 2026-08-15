#!/usr/bin/env node
/**
 * Validering av lager 3 före batch.
 *
 *   node scripts/lager3/validera.mjs [antal] [modell]
 *
 * Obligatoriskt enligt CLAUDE.md. Lager 3 är det känsligaste steget — en
 * felaktigt utpekad "motsägelse" skadar projektets trovärdighet mer än den
 * tillför.
 */
import fs from 'node:fs'
import { config } from 'dotenv'
import { pool } from '../etl/lib.mjs'
import { SYSTEM, SCHEMA, byggUserPrompt } from './prompt.mjs'
import { hamtaAnforanden } from './underlag.mjs'
import { tillampaRegler } from './regel.mjs'

config({ path: '.env.local', quiet: true })

const ANTAL = parseInt(process.argv[2] ?? '30', 10)
const MODELL = process.argv[3] ?? 'gpt-5.6-luna'
const NYCKEL = process.env.OPENAI_API_KEY
if (!NYCKEL) throw new Error('OPENAI_API_KEY saknas i .env.local')

const PRIS = {
  'gpt-5.6-luna': { in: 0.20, ut: 1.20 },
  'gpt-5.6-terra': { in: 2.00, ut: 12.00 },
}

async function klassificera(rad) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${NYCKEL}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: byggUserPrompt(rad) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'retorik_rost', strict: true, schema: SCHEMA },
      },
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return { svar: JSON.parse(json.choices[0].message.content), usage: json.usage }
}

const alla = await hamtaAnforanden({ baraNya: false })
// Deterministiskt spritt urval över utskott och partier.
const sorterade = alla.sort((a, b) =>
  (a.parti + a.beteckning).localeCompare(b.parti + b.beteckning))
const steg = Math.max(1, Math.floor(sorterade.length / ANTAL))
const urval = []
for (let i = 0; i < sorterade.length && urval.length < ANTAL; i += steg) urval.push(sorterade[i])

console.log(`Underlag: ${alla.length} huvudanföranden. Validerar ${urval.length} med ${MODELL}\n`)

let tokIn = 0, tokUt = 0
const rader = await pool(urval, 4, async (rad) => {
  const { svar, usage } = await klassificera(rad)
  tokIn += usage.prompt_tokens
  tokUt += usage.completion_tokens
  process.stdout.write('.')
  // Reglerna tillämpas här, inte bara i produktionskörningen — annars
  // validerar vi något annat än det som faktiskt lagras.
  return { rad, svar: { bedomningar: svar.bedomningar.map(tillampaRegler) } }
})
console.log('\n')

const lyckade = rader.filter(Boolean)
const pris = PRIS[MODELL] ?? { in: 0, ut: 0 }
const kostnad = (tokIn / 1e6) * pris.in + (tokUt / 1e6) * pris.ut

const fordelning = {}
let poster = 0
for (const r of lyckade) {
  for (const b of r.svar.bedomningar) {
    fordelning[b.overensstammelse] = (fordelning[b.overensstammelse] ?? 0) + 1
    poster++
  }
}

const ut = [`# Validering lager 3 — ${MODELL}`, '']
ut.push(`Anföranden: ${lyckade.length}. Bedömningar: ${poster}.`)
ut.push(`Fördelning: ${JSON.stringify(fordelning)}`)
ut.push(`Tokens: ${tokIn} in / ${tokUt} ut. Kostnad: $${kostnad.toFixed(4)}`)
ut.push(`Extrapolerat till ${alla.length} anföranden i batch: $${(kostnad / lyckade.length * alla.length / 2).toFixed(2)}`)
ut.push('', '---', '')

// Motsägelserna först — det är dem som måste granskas hårdast.
const sorterat = [...lyckade].sort((a, b) => {
  const v = (r) => r.svar.bedomningar.some((x) => x.overensstammelse === 'motsäger') ? 0 : 1
  return v(a) - v(b)
})

for (const { rad, svar } of sorterat) {
  if (!svar.bedomningar.length) continue
  ut.push(`## ${rad.parti} — ${rad.beteckning} — ${rad.talare}`)
  ut.push(`*${rad.bet_titel}*`, '')
  for (const b of svar.bedomningar) {
    const p = rad.punkter.find((x) => String(x.punkt) === String(b.punkt))
    ut.push(`**Punkt ${b.punkt}** · partiet röstade ${p?.partiets_rost ?? '?'} · ` +
            `motförslag från ${p?.motforslag_partier?.join(', ') || '—'}`)
    ut.push(`- Sakfråga: ${p?.sakfraga ?? '(okänd punkt!)'}`)
    ut.push(`- Talarens krav: ${b.talarens_krav}`)
    ut.push(`- **${b.overensstammelse.toUpperCase()}** (eget alternativ: ${b.eget_alternativ ? 'ja' : 'nej'}, säkerhet: ${b.sakerhet})`)
    ut.push(`- ${b.motivering}`, '')
  }
}

const fil = `validering-lager3-${MODELL}.md`
fs.writeFileSync(fil, ut.join('\n'))
console.log(`Bedömningar: ${poster}  ${JSON.stringify(fordelning)}`)
console.log(`Kostnad: $${kostnad.toFixed(4)}`)
console.log(`Extrapolerat (${alla.length} st, batch): $${(kostnad / lyckade.length * alla.length / 2).toFixed(2)}`)
console.log(`\nRapport: ${fil}`)
