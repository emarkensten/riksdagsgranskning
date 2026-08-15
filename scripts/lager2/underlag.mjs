/**
 * Hämtar voteringspunkter med allt underlag som lager 2 behöver.
 *
 * Delas av validera.mjs och kor.mjs så att valideringen garanterat testar
 * exakt samma indata som produktionskörningen. Skiljer de två åt riskerar
 * valideringen att bli meningslös.
 *
 * OBS: alla läsningar går via lasAlla(). Supabase kapar vid 1000 rader och
 * ett stort .range() hjälper inte — det gav en gång tyst bortfall av två
 * tredjedelar av reservationerna.
 */
import { db, lasAlla } from '../etl/lib.mjs'

/**
 * @param {object} opts
 * @param {string} [opts.rm]        riksmöte, utelämnas för alla
 * @param {boolean} [opts.baraNya]  hoppa över punkter som redan har klartext
 */
export async function hamtaPunkter({ rm, baraNya = true } = {}) {
  const punkter = await lasAlla((fran, till) => {
    let f = db()
      .from('forslagspunkt')
      .select('id, bet_dok_id, rm, beteckning, punkt, rubrik, forslag, motforslag_nummer, motforslag_partier')
      .not('votering_id', 'is', null)
      .order('id')
      .range(fran, till)
    if (rm) f = f.eq('rm', rm)
    return f
  })

  let kvar = punkter
  if (baraNya) {
    const klara = await lasAlla((fran, till) =>
      db().from('punkt_klartext').select('forslagspunkt_id').order('forslagspunkt_id').range(fran, till))
    const gjorda = new Set(klara.map((k) => k.forslagspunkt_id))
    kvar = punkter.filter((p) => !gjorda.has(p.id))
  }
  if (!kvar.length) return []

  const betIds = [...new Set(kvar.map((p) => p.bet_dok_id))]

  const titlar = new Map()
  const reservationer = new Map()
  // Portioner om 50 betänkanden: håller varje sidindelad läsning liten och
  // gör .in()-filtret hanterbart.
  for (let i = 0; i < betIds.length; i += 50) {
    const del = betIds.slice(i, i + 50)

    const bets = await lasAlla((fran, till) =>
      db().from('betankande').select('dok_id, titel').in('dok_id', del).order('dok_id').range(fran, till))
    for (const b of bets) titlar.set(b.dok_id, b.titel)

    const res = await lasAlla((fran, till) =>
      db().from('reservation').select('bet_dok_id, punkt, nummer, partier, text')
        .in('bet_dok_id', del).order('id').range(fran, till))
    for (const r of res) {
      const nyckel = `${r.bet_dok_id}|${r.punkt}`
      if (!reservationer.has(nyckel)) reservationer.set(nyckel, [])
      reservationer.get(nyckel).push(r)
    }
  }

  for (const p of kvar) {
    p.bet_titel = titlar.get(p.bet_dok_id) ?? null
    p.reservationer = reservationer.get(`${p.bet_dok_id}|${p.punkt}`) ?? []
  }
  return kvar
}
