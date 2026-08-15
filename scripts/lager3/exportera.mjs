#!/usr/bin/env node
/**
 * Delar upp lager 3-underlaget i portioner som en subagent kan arbeta med.
 *
 *   node scripts/lager3/exportera.mjs [riksmöte] [per-portion]
 *
 * Varför: samma bedömning som OpenAI-batchen gör, men utförd av Claude-agenter
 * som redan är betalda. Batchen skulle ha kostat ~$47.
 */
import fs from 'node:fs'
import path from 'node:path'
import { hamtaAnforanden } from './underlag.mjs'
import { harPartilinje } from './regel.mjs'

const rm = process.argv[2] && process.argv[2] !== 'alla' ? process.argv[2] : undefined
const PER = parseInt(process.argv[3] ?? '100', 10)
const KATALOG = 'scratch/lager3'

const alla = (await hamtaAnforanden({ rm, baraNya: true })).filter((a) => harPartilinje(a.parti))
console.log(`${alla.length} huvudanföranden${rm ? ` i ${rm}` : ''} att bedöma`)

fs.rmSync(KATALOG, { recursive: true, force: true })
fs.mkdirSync(KATALOG, { recursive: true })

let n = 0
for (let i = 0; i < alla.length; i += PER) {
  const portion = alla.slice(i, i + PER).map((a) => ({
    anforande_id: a.anforande_id,
    parti: a.parti,
    talare: a.talare,
    betankande: `${a.beteckning} — ${a.bet_titel}`,
    punkter: a.punkter.map((p) => ({
      punkt: p.punkt,
      rubrik: p.rubrik,
      sakfraga: p.sakfraga,
      ja_innebar: p.ja_innebar,
      nej_innebar: p.nej_innebar,
      partiets_rost: p.partiets_rost,
      motforslag_partier: p.motforslag_partier,
      reservationspartier: p.reservationspartier,
    })),
    anforandetext: (a.text || '').slice(0, 12000),
  }))
  const fil = path.join(KATALOG, `del-${String(++n).padStart(2, '0')}.json`)
  fs.writeFileSync(fil, JSON.stringify(portion, null, 1))
  console.log(`  ${fil}  ${portion.length} anföranden  ${(fs.statSync(fil).size / 1048576).toFixed(1)} MB`)
}
console.log(`\n${n} portioner i ${KATALOG}/`)
