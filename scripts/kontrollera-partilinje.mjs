/**
 * Kontrollerar att partilinje() svarar likadant i TypeScript och i SQL.
 *
 * Regeln — partiets linje är det alternativ flest av dess NÄRVARANDE ledamöter
 * valde — finns i två språk och kan inte dela implementation:
 *
 *   SQL   partilinje(ja, nej, avstar)  matar de materialiserade vyerna, och
 *         därmed varje tal på startsidan, /partier, /amnen och /samstammighet.
 *   TS    partilinje(r) i lib/parti.ts  märker upp partiraderna på
 *         voteringssidorna, alltså det läsaren ser bredvid rösterna.
 *
 * Går de isär visar sajten två olika linjer för samma votering, på två sidor,
 * utan att något felar. Migrationen 20260815162000 skriver ut att de måste
 * hållas i synk, men ingenting tvingade fram det förrän den här filen fanns.
 *
 * Metoden är att fråga databasen, inte att läsa SQL-koden: `rpc()` kör den
 * riktiga funktionen, så kontrollen gäller det som faktiskt är installerat och
 * inte det som står i en migration någon glömt köra.
 *
 *   npm run kontrollera
 *
 * Behöver bara SUPABASE_PUBLISHABLE_KEY i .env.local — parti_rost är läsbar
 * och partilinje() körbar för anon.
 */
import { config } from 'dotenv'
import { db } from '../lib/db.ts'
import { partilinje } from '../lib/parti.ts'

config({ path: '.env.local' })

/** PostgRESTs db-max-rows är 5 000. Blocken ligger under med marginal. */
const BLOCK = 2000

/**
 * Fall som inte förekommer i datan och därför aldrig skulle prövas av en
 * kontroll som bara läser parti_rost. Lika röstetal är den intressanta
 * gruppen: SQL bryter dem med >=-kedjan ja, nej, avstår, och TypeScript med
 * en stabil sortering i samma ordning. Det är två helt olika mekanismer som
 * råkar ge samma svar, vilket är precis den sortens likhet som tystnar.
 */
const KONSTRUERADE = [
  { ja: 0, nej: 0, avstar: 0 },
  { ja: 1, nej: 1, avstar: 1 },
  { ja: 5, nej: 5, avstar: 0 },
  { ja: 0, nej: 5, avstar: 5 },
  { ja: 5, nej: 0, avstar: 5 },
  { ja: 1, nej: 0, avstar: 0 },
  { ja: 0, nej: 1, avstar: 0 },
  { ja: 0, nej: 0, avstar: 1 },
  { ja: 349, nej: 0, avstar: 0 },
  { ja: 174, nej: 175, avstar: 0 },
]

/**
 * Den enda skillnad som är avsiktlig.
 *
 * Röstar ingen enda ledamot svarar SQL null och TypeScript 'Frånvarande'.
 * Båda har rätt för sin uppgift: vyerna filtrerar bort null och håller
 * gruppen utanför statistiken, medan voteringssidan ska skriva ut att partiet
 * inte var på plats. Skillnaden står här för att den ska vara ett beslut och
 * inte en slump — ändras någon av sidorna faller kontrollen.
 */
const AVSIKTLIG = { sql: null, ts: 'Frånvarande' }
const arAvsiktlig = (fall, sql, ts) =>
  fall.ja === 0 && fall.nej === 0 && fall.avstar === 0
  && sql === AVSIKTLIG.sql && ts === AVSIKTLIG.ts

const nyckel = ({ ja, nej, avstar }) => `${ja}|${nej}|${avstar}`

/** Läser hela parti_rost i block, eftersom 22 786 rader inte ryms i ett svar. */
async function allaRoster(klient) {
  const ut = []
  for (let fran = 0; ; fran += BLOCK) {
    const { data, error } = await klient
      .from('parti_rost')
      .select('parti, ja, nej, avstar')
      .order('votering_id')
      .order('parti')
      .range(fran, fran + BLOCK - 1)
    if (error) throw new Error(`parti_rost: ${error.message}`)
    ut.push(...data)
    if (data.length < BLOCK) return ut
  }
}

/** SQL-sidans svar, hämtat från den installerade funktionen. */
async function sqlSvar(klient, fall) {
  const { data, error } = await klient.rpc('partilinje', fall)
  if (error) throw new Error(`rpc partilinje(${nyckel(fall)}): ${error.message}`)
  return data
}

async function main() {
  const klient = db()

  const roster = await allaRoster(klient)
  console.log(`Läste ${roster.length.toLocaleString('sv-SE')} rader ur parti_rost.`)

  // En trippel per unik kombination. Partierna sparas för att kunna skilja de
  // åtta riksdagspartierna från gruppen '-', som gränssnittet aldrig frågar om.
  const unika = new Map()
  for (const r of roster) {
    const fall = { ja: Number(r.ja), nej: Number(r.nej), avstar: Number(r.avstar) }
    const k = nyckel(fall)
    if (!unika.has(k)) unika.set(k, { ...fall, partier: new Set(), rader: 0 })
    const post = unika.get(k)
    post.partier.add(r.parti)
    post.rader += 1
  }
  for (const fall of KONSTRUERADE) {
    const k = nyckel(fall)
    if (!unika.has(k)) unika.set(k, { ...fall, partier: new Set(), rader: 0 })
  }

  const fall = [...unika.values()]
  console.log(`${fall.length} unika kombinationer att pröva. Frågar databasen…\n`)

  // Fem åt gången: 433 anrop i serie tar en halv minut, allt på en gång får
  // PostgREST att köa. Ordningen spelar ingen roll, svaren paras ihop på index.
  const svar = []
  for (let i = 0; i < fall.length; i += 5) {
    svar.push(...await Promise.all(fall.slice(i, i + 5).map((f) =>
      sqlSvar(klient, { ja: f.ja, nej: f.nej, avstar: f.avstar }))))
  }

  const avvikelser = []
  let avsiktliga = 0
  fall.forEach((f, i) => {
    const sql = svar[i]
    const ts = partilinje({ ja: f.ja, nej: f.nej, avstar: f.avstar, franvarande: 0 })
    if (sql === ts) return
    if (arAvsiktlig(f, sql, ts)) { avsiktliga += 1; return }
    avvikelser.push({ ...f, sql, ts })
  })

  const iData = fall.filter((f) => f.rader > 0).length
  console.log(`${iData} kombinationer förekommer i datan, ${fall.length - iData} är konstruerade.`)
  console.log(`${avsiktliga} avsiktlig skillnad (ingen röstade: SQL null, TS 'Frånvarande').\n`)

  if (avvikelser.length === 0) {
    console.log('SQL och TypeScript svarar likadant på allt annat.')
    return
  }

  console.error(`${avvikelser.length} kombinationer där de går isär:\n`)
  for (const a of avvikelser) {
    const var_ = a.rader > 0
      ? `${a.rader} rader, partier: ${[...a.partier].sort().join(', ')}`
      : 'konstruerat fall'
    console.error(`  ja=${a.ja} nej=${a.nej} avstår=${a.avstar}  SQL: ${a.sql}  TS: ${a.ts}   (${var_})`)
  }
  console.error('\nRätta båda sidorna, eller skriv in skillnaden i AVSIKTLIG om den är avsedd.')
  process.exitCode = 1
}

main().catch((fel) => {
  console.error(fel.message)
  process.exitCode = 1
})
