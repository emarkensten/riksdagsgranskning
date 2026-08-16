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
import { api, arr, pool, upsert, db, lasAlla, RIKSMOTEN } from './lib.mjs'

const rmArg = process.argv[2]
const riksmoten = rmArg ? [rmArg] : RIKSMOTEN

const RESERVATIONSRUBRIK = /<p class="Reservationsrubrik"/g
const YTTRANDERUBRIK = /<p class="Srskiltyttranderubrik"/g

/**
 * Nummercellen som betänkandet självt sätter framför varje rubrik:
 *
 *   <td><p class="NormalNoll"><span>18.</span></p></td>
 *   <td><p class="Reservationsrubrik">Utveckling av 1177, punkt 8 (C)</p></td>
 */
const NUMMER = /<p class="NormalNoll"[^>]*>\s*<span[^>]*>(\d+)\.<\/span>/g

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
    return { ...tolkaRubrik(rad), text: resten.join('\n').trim() || text, index: start }
  })
}

/**
 * De nummer dokumentet skriver ut, nycklade på rubrikens position i HTML:en.
 *
 * Cellen står i tabellraden strax före sin rubrik, så numret nollställs efter
 * varje rubrik: en cell kan bara höra till rubriken närmast efter den, aldrig
 * till en längre ned. Rubriker av båda sorter räknas som gräns, eftersom en
 * nummercell kan följas av antingen en reservation eller ett yttrande.
 *
 * Kartan är en kontroll, inte källan — se avsnittMed().
 */
function numrera(html) {
  const markorer = [
    ...[...html.matchAll(NUMMER)].map((m) => ({ i: m.index, nr: m[1] })),
    ...[...html.matchAll(RESERVATIONSRUBRIK)].map((m) => ({ i: m.index, rubrik: true })),
    ...[...html.matchAll(YTTRANDERUBRIK)].map((m) => ({ i: m.index, rubrik: true })),
  ].sort((a, b) => a.i - b.i)

  const nummer = new Map()
  let senaste = null
  for (const m of markorer) {
    if (m.nr) { senaste = m.nr; continue }
    if (senaste) nummer.set(m.i, senaste)
    senaste = null
  }
  return nummer
}

/** Metaposten som dokumentet numrerat likadant. */
function metaFor(meta, nr) {
  return meta.find((m) => String(m.nummer) === String(nr))
}

/**
 * Avsnitten av en sort, numrerade i dokumentordning och kontrollerade mot
 * dokumentets egna nummerceller.
 *
 * Numreringen är löpande inom sorten: reservation 1, 2, 3 … i den ordning de
 * står. Det är alltså positionen som ger numret — men positionen *i den här
 * listan*, inte i `dokmotforslag`. Där låg felet.
 *
 * Tidigare parades avsnitten mot metadatans index: `avsnitt.forEach((a, i) =>
 * meta[i])`. Det håller bara så länge listorna är lika långa, och uppmärkningen
 * innehåller tomma `<p class="Reservationsrubrik">&#xa0;</p>` som inte har
 * någon motsvarighet i metadatan. En enda sådan förskjuter allt efter sig.
 * SoU14 2022/23 har 40 rubriker mot 39 metaposter, och allt från nr 19 och
 * uppåt fick fel nummer — rätt text under fel nummer, på en sajt som ber
 * läsaren kontrollera mot originalet.
 *
 * Nummercellen är därför kontroll i stället för källa. Den saknas i två
 * regelbundna fall: ett ensamt avsnitt numreras inte alls (rubriken heter
 * "Reservation", inte "Reservationer"), och enstaka celler har avvikande
 * uppmärkning — TU7 2022/23 saknar nr 14 mellan 13 och 15. Ordningen bär numret
 * i båda fallen; cellen bekräftar det där den finns.
 *
 * Går de isär är dokumentet inte numrerat som vi tror, och då stannar körningen
 * hellre än publicerar ett nummer som pekar på fel reservation. Kontrollerat
 * mot hela materialet 2026-08-16: 11 274 reservationer och 1 013 yttranden,
 * noll fall där ordning och utskrivet nummer gick isär.
 *
 * Tomma rubrikstycken — varken nummer eller punkt — är artefakter och räknas
 * inte som avsnitt alls. Det var 170 av dem, tidigare lagrade som verkliga.
 */
function avsnittMed(html, monster, nummer) {
  const alla = extrahera(html, monster)
  const verkliga = alla.filter((a) => nummer.get(a.index) || a.punkt)
  return {
    avsnitt: verkliga.map((a, i) => ({
      ...a,
      nr: String(i + 1),
      utskrivet: nummer.get(a.index) ?? null,
    })),
    brus: alla.length - verkliga.length,
  }
}

/**
 * Tar bort rader vars nummer inte längre finns i dokumentet.
 *
 * Upserten nycklar på (bet_dok_id, nummer). När en rättad numrering flyttar en
 * reservation från 23 till 22 skrivs 22, men 23 blir kvar — och betänkandet
 * visar då två reservationer där det finns en. Diffen görs mot det som just
 * lästs, så bara det som verkligen försvunnit tas bort.
 */
async function stadaForaldrade(tabell, rm, rader) {
  const befintliga = await lasAlla((fran, till) => db().from(tabell)
    .select('bet_dok_id, nummer').eq('rm', rm).range(fran, till))
  const nya = new Set(rader.map((r) => `${r.bet_dok_id}|${r.nummer}`))
  const foraldrade = befintliga.filter((b) => !nya.has(`${b.bet_dok_id}|${b.nummer}`))
  if (!foraldrade.length) return 0

  const perBetankande = new Map()
  for (const f of foraldrade) {
    perBetankande.set(f.bet_dok_id, [...(perBetankande.get(f.bet_dok_id) ?? []), f.nummer])
  }
  for (const [bet, nummer] of perBetankande) {
    const { error } = await db().from(tabell).delete().eq('bet_dok_id', bet).in('nummer', nummer)
    if (error) throw new Error(`${tabell}: ${error.message}`)
  }
  return foraldrade.length
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
  let brus = 0
  const oense = []
  await pool(bets, 6, async ({ dok_id, beteckning }) => {
    const full = await api(`/dokument/${dok_id}.json`)
    const html = full.dokumentstatus?.dokument?.html
    if (!html) return

    // Dokumentet numrerar sina egna reservationer; metadatan bidrar bara med
    // punkten när rubriken saknar den.
    const meta = arr(full.dokumentstatus?.dokmotforslag?.motforslag)
    const nummer = numrera(html)

    const res = avsnittMed(html, RESERVATIONSRUBRIK, nummer)
    // Yttrandena saknar motsvarighet i metadatan, men numreras i dokumentet på
    // samma sätt som reservationerna. Samma nummercell, samma tolkning.
    const ytt = avsnittMed(html, YTTRANDERUBRIK, nummer)
    brus += res.brus + ytt.brus

    for (const a of res.avsnitt) {
      if (a.utskrivet && a.utskrivet !== a.nr) {
        oense.push(`${beteckning} reservation: ordning ${a.nr}, utskrivet ${a.utskrivet}`)
      }
      const m = metaFor(meta, a.nr)
      rader.push({
        bet_dok_id: dok_id,
        rm,
        beteckning,
        nummer: String(a.nr),
        punkt: a.punkt ?? m?.utskottsforslag_punkt ?? null,
        partier: a.partier,
        rubrik: a.rubrik || null,
        text: a.text || null,
      })
    }

    for (const y of ytt.avsnitt) {
      if (y.utskrivet && y.utskrivet !== y.nr) {
        oense.push(`${beteckning} yttrande: ordning ${y.nr}, utskrivet ${y.utskrivet}`)
      }
      yttranden.push({
        bet_dok_id: dok_id,
        rm,
        beteckning,
        nummer: String(y.nr),
        punkt: y.punkt,
        partier: y.partier,
        rubrik: y.rubrik || null,
      })
    }
  })

  await upsert('reservation', rader, { onConflict: 'bet_dok_id,nummer', chunk: 200 })
  await upsert('sarskilt_yttrande', yttranden, { onConflict: 'bet_dok_id,nummer', chunk: 200 })

  const bortRes = await stadaForaldrade('reservation', rm, rader)
  const bortYtt = await stadaForaldrade('sarskilt_yttrande', rm, yttranden)

  const medPunkt = rader.filter((r) => r.punkt).length
  const medParti = yttranden.filter((y) => y.partier?.length).length
  console.log(`  ${rader.length} reservationer, varav ${medPunkt} kopplade till en punkt`)
  console.log(`  ${yttranden.length} särskilda yttranden, varav ${medParti} med partiuppgift`)
  if (brus) console.log(`  ${brus} tomma rubrikstycken förbigångna`)
  if (bortRes || bortYtt) console.log(`  ${bortRes + bortYtt} föräldrade rader borttagna`)
  // Dokumentordningen och dokumentets egen numrering ska säga samma sak. Gör de
  // inte det är numren opålitliga, och ett fel nummer på en reservation är ett
  // publicerat fel — sidan uppmanar läsaren att kontrollera mot originalet.
  if (oense.length) {
    console.error(`  ! ${oense.length} avsnitt där ordning och nummer går isär: ${oense.slice(0, 5).join(' | ')}`)
    throw new Error('Numreringen stämmer inte med dokumentordningen — kontrollera innan siffrorna används')
  }
}

console.log('\nKlart.')
