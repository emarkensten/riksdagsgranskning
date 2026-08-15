#!/usr/bin/env node
/**
 * Läser in agenternas bedömningar och skriver dem till retorik_rost.
 *
 *   node scripts/lager3/importera.mjs
 *
 * Reglerna i regel.mjs tillämpas här, inte i agenten: bedömningskriterierna
 * ska gälla per konstruktion och inte bero på att varje agent minns dem.
 */
import fs from 'node:fs'
import path from 'node:path'
import { db, upsert } from '../etl/lib.mjs'
import { hamtaAnforanden } from './underlag.mjs'
import { tillampaRegler } from './regel.mjs'

const KATALOG = 'scratch/lager3'
const MODELL = process.env.LAGER3_MODELL ?? 'claude-sonnet-5'

const filer = fs.readdirSync(KATALOG).filter((f) => f.startsWith('svar-') && f.endsWith('.json'))
if (!filer.length) throw new Error(`Inga svar-*.json i ${KATALOG}/`)
console.log(`${filer.length} svarsfiler`)

// Punktnummer måste översättas till forslagspunkt_id, och en agent kan ange
// en punkt som inte finns i ärendet — de kastas hellre än gissas.
const underlag = new Map(
  (await hamtaAnforanden({ baraNya: false })).map((a) => [a.anforande_id, a]),
)

const rader = []
let okand = 0, nedgraderade = 0, trasiga = 0
for (const f of filer) {
  let poster
  try {
    poster = JSON.parse(fs.readFileSync(path.join(KATALOG, f), 'utf8'))
  } catch (e) {
    console.error(`  ! ${f}: ogiltig JSON — ${e.message}`)
    trasiga++
    continue
  }
  for (const post of poster) {
    const anf = underlag.get(post.anforande_id)
    if (!anf) { okand++; continue }
    for (const ra of post.bedomningar ?? []) {
      const b = tillampaRegler(ra)
      if (b.nedgraderad) nedgraderade++
      const punkt = anf.punkter.find((p) => String(p.punkt) === String(b.punkt))
      if (!punkt) { okand++; continue }
      rader.push({
        anforande_id: post.anforande_id,
        forslagspunkt_id: punkt.id,
        parti: anf.parti,
        talarens_krav: b.talarens_krav,
        overensstammelse: b.overensstammelse,
        eget_alternativ: b.eget_alternativ ?? null,
        partiets_rost: punkt.partiets_rost,
        motivering: b.motivering ?? null,
        sakerhet: b.sakerhet ?? null,
        modell: MODELL,
      })
    }
  }
}

// Dubbletter kan uppstå om en agent kört om en portion.
const unika = new Map(rader.map((r) => [`${r.anforande_id}|${r.forslagspunkt_id}`, r]))
await upsert('retorik_rost', [...unika.values()], {
  onConflict: 'anforande_id,forslagspunkt_id', chunk: 500,
})

const fordelning = {}
for (const r of unika.values()) {
  fordelning[r.overensstammelse] = (fordelning[r.overensstammelse] ?? 0) + 1
}
console.log(`\nSparade ${unika.size} bedömningar.`)
console.log(`Fördelning: ${JSON.stringify(fordelning)}`)
console.log(`${okand} okända punkter, ${nedgraderade} nedgraderade av reglerna, ${trasiga} trasiga filer.`)
