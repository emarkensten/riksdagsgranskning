import { db, rader } from '@/lib/db'

export type Rubrik = { sakfraga: string; amne: string; beteckning: string; rm: string }

/**
 * Sakfrågan och dess härkomst, för en voteringssidas rubrik.
 *
 * Egen fråga och inte sidans `hamta()`: metadatan och delningsbilden behöver
 * bara fyra fält, medan sidans hämtning joinar betänkande, reservationer,
 * partiröster och debatt. Att köra hela den för att sätta en `<title>` vore tre
 * onödiga frågor per sidvisning, och båda anropen sker utöver själva
 * renderingen.
 *
 * Returnerar `null` när punkten inte finns, så att anroparen kan skilja på en
 * adress som inte existerar och ett databasfel — `rader()` kastar på det andra.
 */
export async function rubrik(id: number): Promise<Rubrik | null> {
  if (!Number.isInteger(id)) return null
  const träffar = await rader<Rad>(
    db()
      .from('punkt_klartext')
      .select('sakfraga, amne, forslagspunkt!inner(beteckning, rm)')
      .eq('forslagspunkt_id', id)
      .limit(1) as never,
  )
  const t = träffar[0]
  if (!t) return null
  // Utan genererade databastyper skriver PostgREST den inbäddade relationen som
  // en lista, medan `!inner` på en till-en-relation svarar med ett objekt.
  // Sidan gör samma sak med en `as any`-kast; här normaliseras båda formerna i
  // stället, så att en framtida typgenerering inte tyst ger tomma rubriker.
  const f = Array.isArray(t.forslagspunkt) ? t.forslagspunkt[0] : t.forslagspunkt
  return {
    sakfraga: t.sakfraga,
    amne: t.amne,
    beteckning: f?.beteckning ?? '',
    rm: f?.rm ?? '',
  }
}

type Punkt = { beteckning: string; rm: string }
type Rad = { sakfraga: string; amne: string; forslagspunkt: Punkt | Punkt[] | null }
