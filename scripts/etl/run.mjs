#!/usr/bin/env node
/**
 * ETL: data.riksdagen.se -> Supabase. Inga LLM-anrop, inga kostnader.
 *
 *   node scripts/etl/run.mjs ledamoter
 *   node scripts/etl/run.mjs betankanden [riksmöte]
 *   node scripts/etl/run.mjs roster      [riksmöte]
 *   node scripts/etl/run.mjs anforanden  [riksmöte]
 *   node scripts/etl/run.mjs alla
 *
 * Utan riksmöte körs hela mandatperioden 2022–2026.
 */
import {
  api, arr, pool, upsert, stripHtml, parsePartier, toDate, uppdateraAggregat,
  PARTIER, RIKSMOTEN, db,
} from './lib.mjs'

const [, , stage, rmArg] = process.argv
const riksmoten = rmArg ? [rmArg] : RIKSMOTEN

// ---------------------------------------------------------------- ledamöter

async function ledamoter() {
  console.log('\n== Ledamöter ==')
  // Både tjänstgörande och avgångna behövs — mandatperioden sträcker sig bakåt.
  const seen = new Map()
  for (const status of ['samtliga', 'tjanst']) {
    const d = await api('/personlista/', { utformat: 'json', sz: 10000, rdlstatus: status })
    for (const p of arr(d.personlista?.person)) {
      seen.set(p.intressent_id, {
        intressent_id: p.intressent_id,
        fornamn: p.tilltalsnamn || p.fornamn,
        efternamn: p.efternamn,
        parti: p.parti,
        valkrets: p.valkrets,
        kon: p.kon,
        fodd_ar: p.fodd_ar ? parseInt(p.fodd_ar, 10) : null,
        bild_url: p.bild_url_192 || null,
        status: p.status,
      })
    }
  }
  const rows = [...seen.values()]
  console.log(`  ${rows.length} personer`)
  await upsert('ledamot', rows, { onConflict: 'intressent_id' })
}

// ------------------------------------------------- betänkanden + förslagspunkter

const SIDOR = 5
const PER_SIDA = 200

async function betankandeLista(rm) {
  const out = new Map()
  let sistaFull = false
  for (let p = 1; p <= SIDOR; p++) {
    const d = await api('/dokumentlista/', { doktyp: 'bet', rm, utformat: 'json', sz: PER_SIDA, p })
    const docs = arr(d.dokumentlista?.dokument)
    if (!docs.length) { sistaFull = false; break }
    sistaFull = docs.length >= PER_SIDA
    for (const doc of docs) {
      if (doc.beteckning) out.set(doc.beteckning, doc)
    }
  }
  // Taket är 1 000 betänkanden per riksmöte, och det kapar tyst. Ett riksmöte
  // som fyller sista sidan kan ha fler än vi hämtat, och då blir varje siffra
  // nedströms för låg utan att något felar. 473 är rekordet hittills.
  if (sistaFull) {
    throw new Error(
      `${rm}: betänkandelistan fyllde alla ${SIDOR} sidor à ${PER_SIDA} — höj taket, annars saknas betänkanden`)
  }
  return [...out.values()]
}

async function betankanden() {
  for (const rm of riksmoten) {
    console.log(`\n== Betänkanden ${rm} ==`)
    const docs = await betankandeLista(rm)
    console.log(`  ${docs.length} betänkanden`)

    const bets = []
    const punkter = []

    await pool(docs, 6, async (doc) => {
      // dok_id-prefixet kodar riksmötet (HA01=2022/23, HB01=2023/24, HC01=2024/25,
      // HD01=2025/26). Hitta aldrig på ett prefix — fel prefix ger tyst ett giltigt
      // dokument från ett ANNAT riksmöte.
      const dokId = doc.dok_id
      if (!dokId) {
        console.error(`  ! ${doc.beteckning}: saknar dok_id, hoppas över`)
        return
      }
      const full = await api(`/dokument/${dokId}.json`)
      const status = full.dokumentstatus
      if (!status) return

      const meta = status.dokument || {}
      bets.push({
        dok_id: dokId,
        rm,
        beteckning: doc.beteckning,
        organ: meta.organ || doc.organ,
        titel: meta.titel || doc.titel,
        datum: toDate(meta.datum || doc.datum),
      })

      for (const uf of arr(status.dokutskottsforslag?.utskottsforslag)) {
        punkter.push({
          bet_dok_id: dokId,
          rm,
          beteckning: doc.beteckning,
          punkt: String(uf.punkt),
          rubrik: uf.rubrik || null,
          forslag: stripHtml(uf.forslag) || null,
          beslutstyp: uf.beslutstyp || null,
          motforslag_nummer: uf.motforslag_nummer || null,
          motforslag_partier: parsePartier(uf.motforslag_partier),
          // votering_id skrivs versalt i voteringlista men gement här
          votering_id: uf.votering_id ? uf.votering_id.toUpperCase() : null,
          vinnare: uf.vinnare || null,
        })
      }
    })

    await upsert('betankande', bets, { onConflict: 'dok_id' })
    await upsert('forslagspunkt', punkter, { onConflict: 'bet_dok_id,punkt' })
    const medVotering = punkter.filter((p) => p.votering_id).length
    console.log(`  ${punkter.length} förslagspunkter, varav ${medVotering} med votering`)
  }
}

// -------------------------------------------------------------------- röster

async function roster() {
  for (const rm of riksmoten) {
    console.log(`\n== Röster ${rm} ==`)
    // Betäckningarna hämtas från vår egen tabell — betänkanden måste köras först.
    // Explicit range — select() kapas annars tyst vid 1000 rader.
    const { data: bets, error } = await db()
      .from('betankande').select('beteckning').eq('rm', rm).range(0, 9999)
    if (error) throw new Error(error.message)
    if (!bets?.length) {
      console.log('  (inga betänkanden — kör "betankanden" först)')
      continue
    }
    console.log(`  ${bets.length} betänkanden att hämta voteringar för`)

    let total = 0
    const batches = await pool(bets, 5, async ({ beteckning }) => {
      const d = await api('/voteringlista/', { rm, bet: beteckning, utformat: 'json', sz: 10000 })
      return arr(d.voteringlista?.votering).map((v) => ({
        votering_id: v.votering_id.toUpperCase(),
        intressent_id: v.intressent_id,
        parti: v.parti,
        rost: v.rost,
        avser: v.avser,
        rm: v.rm,
        beteckning: v.beteckning,
        punkt: v.punkt,
      }))
    })

    // pool() samlar alla resultat innan loopen — ~227k rader ligger i minnet här.
    // Fungerar i dag; behöver strömmas om volymen växer.
    for (const rows of batches) {
      if (!rows?.length) continue
      // En ledamot kan förekomma dubblerat i sak- och motivfråga; unik nyckel fångar det.
      const uniq = new Map()
      for (const r of rows) uniq.set(`${r.votering_id}|${r.intressent_id}|${r.avser}`, r)
      await upsert('rost', [...uniq.values()], { onConflict: 'votering_id,intressent_id,avser' })
      total += uniq.size
    }
    console.log(`  ${total} röstrader`)
  }
}

// ---------------------------------------------------------------- anföranden

async function anforanden() {
  for (const rm of riksmoten) {
    console.log(`\n== Anföranden ${rm} ==`)
    // 10k-taket kringgås genom att räkna upp per parti.
    const seen = new Map()
    for (const parti of PARTIER) {
      const d = await api('/anforandelista/', { rm, parti, utformat: 'json', sz: 10000 })
      const list = arr(d.anforandelista?.anforande)
      if (list.length >= 10000) {
        console.warn(`  ! parti=${parti} slog i 10k-taket — data kan saknas`)
      }
      for (const a of list) seen.set(a.anforande_id, a)
    }
    const alla = [...seen.values()]
    // Endast ärendedebatter kan kopplas till en votering. Vi hämtar text bara för dem.
    const arende = alla.filter((a) => a.kammaraktivitet === 'ärendedebatt' && a.rel_dok_id)
    console.log(`  ${alla.length} anföranden, varav ${arende.length} i ärendedebatt`)

    const wantText = new Set(arende.map((a) => a.anforande_id))
    const texts = new Map()
    let n = 0
    await pool(arende, 8, async (a) => {
      const one = await api(`/anforande/${a.dok_id}-${a.anforande_nummer}.json`)
      const body = one.anforande || one
      texts.set(a.anforande_id, stripHtml(body.anforandetext))
      if (++n % 500 === 0) process.stdout.write(`\r  text: ${n}/${arende.length}`)
    })
    process.stdout.write(`\r  text: ${n}/${arende.length}\n`)

    const rows = alla.map((a) => ({
      anforande_id: a.anforande_id,
      dok_id: a.dok_id,
      anforande_nummer: a.anforande_nummer,
      rm: a.dok_rm || rm,
      datum: toDate(a.dok_datum),
      intressent_id: a.intressent_id || null,
      talare: a.talare,
      parti: a.parti || null,
      avsnittsrubrik: a.avsnittsrubrik || null,
      kammaraktivitet: a.kammaraktivitet || null,
      rel_dok_id: a.rel_dok_id || null,
      replik: a.replik || null,
      text: wantText.has(a.anforande_id) ? (texts.get(a.anforande_id) || null) : null,
    }))
    await upsert('anforande', rows, { onConflict: 'anforande_id', chunk: 200 })
  }
}

// ------------------------------------------------------------------ aggregat

/**
 * Aggregaten är materialiserade vyer och blir inaktuella så fort nya röster
 * skrivits. Utan den här uppdateringen visar sajten gamla siffror helt tyst.
 *
 * Vilka vyer som ingår, och i vilken ordning, avgörs i databasen. Den tidigare
 * varianten räknade upp vynamnen här, och då missades varje vy som lades till
 * senare — utan att något felade.
 *
 * En vy per anrop: elva refresh i samma anrop spränger PostgREST:s
 * statement timeout.
 */
// ----------------------------------------------------------------------- main

const stages = { ledamoter, betankanden, roster, anforanden, aggregat: uppdateraAggregat }

if (stage === 'alla') {
  for (const fn of [ledamoter, betankanden, roster, anforanden, uppdateraAggregat]) await fn()
} else if (stages[stage]) {
  await stages[stage]()
  // Aggregaten bygger på både forslagspunkt och rost, så betänkandesteget måste
  // trigga dem lika mycket som röststeget. Bara roster gjorde det tidigare, och
  // en omkörning av betankanden lämnade därför matvyerna inaktuella tills någon
  // råkade köra ett annat steg — sajten visade gamla siffror utan att något felade.
  if (stage === 'roster' || stage === 'betankanden') await uppdateraAggregat()
} else {
  console.error(`Okänt steg: ${stage || '(inget)'}`)
  console.error(`Välj: ${Object.keys(stages).join(', ')}, alla`)
  process.exit(1)
}
console.log('\nKlart.')
