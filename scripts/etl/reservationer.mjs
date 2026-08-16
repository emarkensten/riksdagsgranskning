#!/usr/bin/env node
/**
 * Extraherar reservationer och särskilda yttranden ur betänkandenas HTML.
 *
 *   node scripts/etl/reservationer.mjs [riksmöte]
 *
 * Varför detta behövs: `dokmotforslag` i API:et ger bara metadata (nummer,
 * partier, punkt) — själva texten finns enbart i dokumentets HTML. Utan den
 * går det inte att säga vad ett Nej i en votering faktiskt innebar, eftersom
 * ett Nej i regel betyder "vi föredrar reservation N".
 *
 * De särskilda yttrandena finns INTE i `dokmotforslag` alls. Fältet har en
 * `typ`-kolumn, men den står på `reservation` i varje post — kontrollerat mot
 * UU24, som enligt sin egen sammanfattning har sju reservationer och tre
 * särskilda yttranden, och där dokmotforslag ger exakt de sju. Yttrandena går
 * alltså bara att nå genom HTML:en.
 *
 * Båda plockas i samma pass med flit. Ett eget skript för yttrandena hade
 * hämtat samma 1 442 dokument en gång till, och varje dokument är ungefär en
 * megabyte.
 *
 * Uppmärkningen är parallell och rubrikformatet identiskt — "Ämne, punkt N (S)"
 * — så `tolkaRubrik()` gäller båda. Klassnamnen har fått sina svenska tecken
 * strippade av verktyget som genererar HTML:en, därav `Srskiltyttranderubrik`.
 */
import { api, arr, pool, upsert, db, RIKSMOTEN } from './lib.mjs'

const rmArg = process.argv[2]
const riksmoten = rmArg ? [rmArg] : RIKSMOTEN

const RESERVATIONSRUBRIK = /<p class="Reservationsrubrik"/g
const YTTRANDERUBRIK = /<p class="Srskiltyttranderubrik"/g

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

/**
 * Var ett avsnitt tar slut.
 *
 * Den gamla versionen lät avsnittet löpa till nästa reservationsrubrik, och
 * det sista till `html.length`. Det gjorde att den sista reservationen i varje
 * betänkande fick hela dokumentets svans klistrad på sig — särskilda
 * yttranden, bilagor, motionsförteckningar. Mätt i databasen innan rättelsen:
 * 17 859 tecken i snitt för den sista reservationen mot 1 845 för de övriga,
 * och som mest 147 481. Den texten visas på voteringssidorna.
 *
 * Fyra klasser räcker som gräns, kontrollerade mot UU24 (reservationer följda
 * av yttranden) och NU13 (48 reservationer följda direkt av bilagor):
 * nästa reservation, nästa yttrande, nästa avsnittsrubrik, eller bilagorna.
 */
const SLUT = /<p class="(?:Reservationsrubrik|Srskiltyttranderubrik|Avsnittsrubrik|Bilaga)"/g

/** Delar HTML:en vid varje rubrik av angiven sort och läser fram till nästa gräns. */
function extrahera(html, monster) {
  const granser = [...html.matchAll(SLUT)].map((m) => m.index).sort((a, b) => a - b)
  return [...html.matchAll(monster)].map((m) => {
    const start = m.index
    const slut = granser.find((g) => g > start) ?? html.length
    const text = tillText(html.slice(start, slut))
    const [rad, ...resten] = text.split('\n')
    return { ...tolkaRubrik(rad), text: resten.join('\n').trim() || text }
  })
}

for (const rm of riksmoten) {
  console.log(`\n== Reservationer och särskilda yttranden ${rm} ==`)
  const { data: bets, error } = await db()
    .from('betankande').select('dok_id, beteckning').eq('rm', rm).range(0, 9999)
  if (error) throw new Error(error.message)
  if (!bets?.length) {
    console.log('  (inga betänkanden — kör "betankanden" först)')
    continue
  }

  const rader = []
  const yttranden = []
  await pool(bets, 6, async ({ dok_id, beteckning }) => {
    const full = await api(`/dokument/${dok_id}.json`)
    const html = full.dokumentstatus?.dokument?.html
    if (!html) return

    // Metadatan har den auktoritativa numreringen; HTML:en har texten.
    const meta = arr(full.dokumentstatus?.dokmotforslag?.motforslag)
    const avsnitt = extrahera(html, RESERVATIONSRUBRIK)

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

    // Yttrandena numreras löpande i dokumentet och har ingen motsvarighet i
    // metadatan att hämta numret ur. Ordningen i HTML:en är numreringen.
    extrahera(html, YTTRANDERUBRIK).forEach((y, i) => {
      yttranden.push({
        bet_dok_id: dok_id,
        rm,
        beteckning,
        nummer: String(i + 1),
        punkt: y.punkt,
        partier: y.partier,
        rubrik: y.rubrik || null,
      })
    })
  })

  await upsert('reservation', rader, { onConflict: 'bet_dok_id,nummer', chunk: 200 })
  await upsert('sarskilt_yttrande', yttranden, { onConflict: 'bet_dok_id,nummer', chunk: 200 })

  const medPunkt = rader.filter((r) => r.punkt).length
  const medParti = yttranden.filter((y) => y.partier?.length).length
  console.log(`  ${rader.length} reservationer, varav ${medPunkt} kopplade till en punkt`)
  console.log(`  ${yttranden.length} särskilda yttranden, varav ${medParti} med partiuppgift`)
}

console.log('\nKlart.')
