/**
 * Bygger underlaget för lager 3: ett huvudanförande tillsammans med alla
 * voteringspunkter i samma ärende, partiets röst på var och en, och vilka
 * partier som stod bakom motförslag och reservationer.
 *
 * Endast huvudanföranden (replik = 'N') tas med. Repliker är korta
 * duellinlägg som sällan innehåller partiets faktiska ståndpunkt, och de
 * fyrdubblar volymen.
 */
import { db, lasAlla } from '../etl/lib.mjs'
// Samma funktion som gränssnittet, inte en kopia av den. Regeln fanns tidigare
// i tre exemplar — här, i lib/db.ts och i SQL — och två av dem beskrev sig
// själva som speglingar av den tredje. Node 22 kan importera .ts direkt, så
// den här kan dela implementation med frontend. SQL-versionen kan inte, och
// hålls i stället i schack av scripts/kontrollera-partilinje.mjs.
import { partilinje } from '../../lib/db.ts'

export async function hamtaAnforanden({ rm, baraNya = true, gransTecken = 1500 } = {}) {
  const anforanden = await lasAlla((fran, till) => {
    let f = db()
      .from('anforande')
      .select('anforande_id, rm, talare, parti, rel_dok_id, avsnittsrubrik, text, tecken')
      .eq('kammaraktivitet', 'ärendedebatt')
      .eq('replik', 'N')
      .not('text', 'is', null)
      .gt('tecken', gransTecken)
      .not('parti', 'is', null)
      .order('anforande_id')
      .range(fran, till)
    if (rm) f = f.eq('rm', rm)
    return f
  })

  let kvar = anforanden
  if (baraNya) {
    const gjorda = await lasAlla((fran, till) =>
      db().from('retorik_rost').select('anforande_id').order('anforande_id').range(fran, till))
    const set = new Set(gjorda.map((g) => g.anforande_id))
    kvar = anforanden.filter((a) => !set.has(a.anforande_id))
  }
  if (!kvar.length) return []

  const betIds = [...new Set(kvar.map((a) => a.rel_dok_id))].filter(Boolean)

  const punkterPerBet = new Map()
  const titlar = new Map()
  const rostPerVotering = new Map()
  const reservationerPerPunkt = new Map()

  for (let i = 0; i < betIds.length; i += 50) {
    const del = betIds.slice(i, i + 50)

    const bets = await lasAlla((f, t) =>
      db().from('betankande').select('dok_id, titel, beteckning').in('dok_id', del).order('dok_id').range(f, t))
    for (const b of bets) titlar.set(b.dok_id, b)

    // Endast punkter som faktiskt gick till votering och har klartext.
    const punkter = await lasAlla((f, t) =>
      db().from('forslagspunkt')
        .select('id, bet_dok_id, beteckning, punkt, rubrik, votering_id, motforslag_partier, punkt_klartext!inner(sakfraga, ja_innebar, nej_innebar)')
        .in('bet_dok_id', del).not('votering_id', 'is', null).order('id').range(f, t))
    for (const p of punkter) {
      if (!punkterPerBet.has(p.bet_dok_id)) punkterPerBet.set(p.bet_dok_id, [])
      punkterPerBet.get(p.bet_dok_id).push(p)
    }

    const res = await lasAlla((f, t) =>
      db().from('reservation').select('bet_dok_id, punkt, partier').in('bet_dok_id', del).order('id').range(f, t))
    for (const r of res) {
      const n = `${r.bet_dok_id}|${r.punkt}`
      if (!reservationerPerPunkt.has(n)) reservationerPerPunkt.set(n, new Set())
      for (const p of r.partier ?? []) reservationerPerPunkt.get(n).add(p)
    }

    const voteringsIder = punkter.map((p) => p.votering_id).filter(Boolean)
    for (let j = 0; j < voteringsIder.length; j += 200) {
      const rost = await lasAlla((f, t) =>
        db().from('parti_rost').select('votering_id, parti, ja, nej, avstar, franvarande')
          .in('votering_id', voteringsIder.slice(j, j + 200)).order('votering_id').range(f, t))
      for (const r of rost) rostPerVotering.set(`${r.votering_id}|${r.parti}`, r)
    }
  }

  const klara = []
  for (const a of kvar) {
    const bet = titlar.get(a.rel_dok_id)
    const punkter = punkterPerBet.get(a.rel_dok_id) ?? []
    if (!bet || !punkter.length) continue

    klara.push({
      ...a,
      bet_dok_id: a.rel_dok_id,
      beteckning: bet.beteckning,
      bet_titel: bet.titel,
      punkter: punkter.map((p) => {
        const r = rostPerVotering.get(`${p.votering_id}|${a.parti}`)
        return {
          id: p.id,
          punkt: p.punkt,
          rubrik: p.rubrik,
          sakfraga: p.punkt_klartext.sakfraga,
          ja_innebar: p.punkt_klartext.ja_innebar,
          nej_innebar: p.punkt_klartext.nej_innebar,
          motforslag_partier: p.motforslag_partier,
          reservationspartier: [...(reservationerPerPunkt.get(`${p.bet_dok_id}|${p.punkt}`) ?? [])],
          partiets_rost: r ? partilinje(r) : null,
        }
      }),
    })
  }
  return klara
}
