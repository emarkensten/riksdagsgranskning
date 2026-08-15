#!/usr/bin/env node
/**
 * Extraherar reservationstexter ur betänkandenas HTML.
 *
 *   node scripts/etl/reservationer.mjs [riksmöte]
 *
 * Varför detta behövs: `dokmotforslag` i API:et ger bara metadata (nummer,
 * partier, punkt) — själva texten finns enbart i dokumentets HTML. Utan den
 * går det inte att säga vad ett Nej i en votering faktiskt innebar, eftersom
 * ett Nej i regel betyder "vi föredrar reservation N".
 *
 * HTML:en märker upp reservationer med <p class="Reservationsrubrik">, och
 * rubriken har formen "Ämne, punkt N (S)" — vilket ger kopplingen till
 * förslagspunkten.
 */
import { api, arr, pool, upsert, db, RIKSMOTEN } from './lib.mjs'

const rmArg = process.argv[2]
const riksmoten = rmArg ? [rmArg] : RIKSMOTEN

const RESERVATIONSRUBRIK = /<p class="Reservationsrubrik"/g

function tillText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#xa0;|&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

/** Rubrikraden ser ut som: "Jämställdhetspolitikens mål och metoder, punkt 1 (S)" */
function tolkaRubrik(rad) {
  const punkt = rad.match(/punkt\s+(\d+)/i)?.[1] ?? null
  const partier = rad.match(/\(([^)]+)\)\s*$/)?.[1]
    ?.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean) ?? null
  const rubrik = rad.split(/,\s*punkt\s+\d+/i)[0]?.trim() || rad.trim()
  return { punkt, partier, rubrik }
}

function extrahera(html) {
  const positioner = [...html.matchAll(RESERVATIONSRUBRIK)].map((m) => m.index)
  return positioner.map((start, i) => {
    const slut = positioner[i + 1] ?? html.length
    const text = tillText(html.slice(start, slut))
    const [rad, ...resten] = text.split('\n')
    return { ...tolkaRubrik(rad), text: resten.join('\n').trim() || text }
  })
}

for (const rm of riksmoten) {
  console.log(`\n== Reservationer ${rm} ==`)
  const { data: bets, error } = await db()
    .from('betankande').select('dok_id, beteckning').eq('rm', rm).range(0, 9999)
  if (error) throw new Error(error.message)
  if (!bets?.length) {
    console.log('  (inga betänkanden — kör "betankanden" först)')
    continue
  }

  const rader = []
  await pool(bets, 6, async ({ dok_id, beteckning }) => {
    const full = await api(`/dokument/${dok_id}.json`)
    const html = full.dokumentstatus?.dokument?.html
    if (!html) return

    // Metadatan har den auktoritativa numreringen; HTML:en har texten.
    const meta = arr(full.dokumentstatus?.dokmotforslag?.motforslag)
    const avsnitt = extrahera(html)

    avsnitt.forEach((a, i) => {
      const m = meta[i]
      rader.push({
        bet_dok_id: dok_id,
        rm,
        beteckning,
        nummer: m?.nummer ?? String(i + 1),
        punkt: a.punkt ?? m?.utskottsforslag_punkt ?? null,
        partier: a.partier,
        rubrik: a.rubrik || null,
        text: a.text || null,
      })
    })
  })

  await upsert('reservation', rader, { onConflict: 'bet_dok_id,nummer', chunk: 200 })
  const medPunkt = rader.filter((r) => r.punkt).length
  console.log(`  ${rader.length} reservationer, varav ${medPunkt} kopplade till en punkt`)
}

console.log('\nKlart.')
