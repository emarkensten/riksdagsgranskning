import { db } from '@/lib/db'
import { allaRader } from '@/lib/block'

/**
 * Underlaget, som CSV.
 *
 * Metodsidan påstår att varje tal går att räkna om. Utan en väg till rådata är
 * det ett påstående läsaren får ta på förtroende — alltså precis det sajten
 * annars vägrar be om. Den här filen är därför inte en extrafunktion, den är
 * det som gör meningen sann.
 *
 * En rad per votering och parti: 22 786 rader över 2 569 voteringar. Ur den går
 * partilinje, samstämmighet, frånvaro, ensam-mot-alla och utfall att räkna fram
 * igen, eftersom alla fem definieras ur just de här talen. Definitionerna står
 * på /metod#definitioner.
 *
 * De 18 punkter vars namnupprop gällde motivfrågan finns inte här, av samma
 * skäl som de inte räknas in i något mått på sajten — se /metod#olika-tal.
 */
export const revalidate = 3600

type Votering = {
  votering_id: string | null
  forslagspunkt_id: number
  rm: string
  beteckning: string
  punkt: string
  datum: string
  amne: string
  sakfraga: string
}

type Rost = {
  votering_id: string
  parti: string
  ja: number
  nej: number
  avstar: number
  franvarande: number
  totalt: number
}

const KOLUMNER = [
  'forslagspunkt_id', 'votering_id', 'rm', 'beteckning', 'punkt', 'datum',
  'amne', 'sakfraga', 'parti', 'ja', 'nej', 'avstar', 'franvarande', 'totalt',
] as const

/**
 * RFC 4180: fältet citeras alltid och interna citattecken fördubblas.
 *
 * Att bara citera fält som ser ut att behöva det är den vanliga varianten och
 * den som går sönder — sakfrågorna innehåller både komman och citattecken.
 */
function falt(v: unknown) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

export async function GET() {
  const klient = db()

  const [voteringar, roster] = await Promise.all([
    allaRader<Votering>((fran, till) =>
      klient
        .from('votering_lista')
        .select('votering_id, forslagspunkt_id, rm, beteckning, punkt, datum, amne, sakfraga')
        .not('votering_id', 'is', null)
        .order('forslagspunkt_id')
        .range(fran, till),
    ),
    allaRader<Rost>((fran, till) =>
      klient
        .from('parti_rost')
        .select('votering_id, parti, ja, nej, avstar, franvarande, totalt')
        .order('votering_id')
        .order('parti')
        .range(fran, till),
    ),
  ])

  // Joinas i JS och inte i frågan: parti_rost och votering_lista är två vyer
  // utan främmandenyckel mellan sig, och PostgREST kan därför inte bädda in
  // den ena i den andra.
  const karta = new Map(voteringar.filter((v) => v.votering_id).map((v) => [v.votering_id!, v]))

  const rader = [KOLUMNER.join(',')]
  let utelamnade = 0
  for (const r of roster) {
    const v = karta.get(r.votering_id)
    // En röst utan votering i listan hör till en punkt sajten inte förklarar.
    // Den utelämnas hellre än tas med utan sakfråga — annars ser filen ut att
    // innehålla voteringar som inte finns på sajten.
    //
    // I dag inträffar det aldrig: samtliga 22 786 röstrader har en match, och
    // votering_lista har inga delade votering_id. Men en ofullständig fil är
    // det värsta felet just den här rutten kan göra, så antalet räknas och
    // loggas i stället för att försvinna.
    if (!v) {
      utelamnade++
      continue
    }
    rader.push([
      falt(v.forslagspunkt_id), falt(r.votering_id), falt(v.rm), falt(v.beteckning),
      falt(v.punkt), falt(v.datum), falt(v.amne), falt(v.sakfraga), falt(r.parti),
      falt(r.ja), falt(r.nej), falt(r.avstar), falt(r.franvarande), falt(r.totalt),
    ].join(','))
  }

  if (utelamnade > 0) {
    console.error(
      `${utelamnade} av ${roster.length} röstrader saknar votering i votering_lista och ingår inte i underlaget.`,
    )
  }

  // BOM med flit. Excel på Windows läser en CSV utan den som latin-1, och varje
  // ä och ö i sakfrågorna blir förvanskat — filen ser trasig ut för den läsare
  // som är minst utrustad att förstå varför. Priset är att pandas behöver
  // encoding='utf-8-sig', vilket är ett mindre och långt tydligare problem.
  return new Response(`﻿${rader.join('\n')}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="namnupprop-partiroster.csv"',
      'cache-control': 'public, max-age=3600',
    },
  })
}
