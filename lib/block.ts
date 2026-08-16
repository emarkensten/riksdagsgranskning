import { rader } from '@/lib/db'

/**
 * Blockstorleken när en hel tabell ska läsas.
 *
 * Talet är INTE takgränsen. Taket är en projektinställning i Supabase
 * (`db-max-rows`) och stod på 1 000 när den här filen skrevs; den 15 augusti
 * 2026 höjdes den till 5 000. Uppmätt mot REST-API:et med den publika nyckeln:
 * `parti_rost` utan `range` svarar med exakt 5 000 rader av sina 20 552,
 * medan `votering_lista` (2 587) och `ledamot` (2 898) kommer hela.
 *
 * Blocket är alltså medvetet mindre än taket. Det är den säkra riktningen:
 * ett block som är MINDRE än taket fungerar oavsett vad inställningen står på,
 * medan ett block som är större än taket gör att den här funktionen tyst
 * returnerar en stump — den ber om `BLOCK` rader, får taket, ser att det är
 * färre än den bad om och drar slutsatsen att tabellen är slut.
 *
 * Höjs blocket någon gång: sänk aldrig `db-max-rows` under det utan att sänka
 * det här talet först.
 */
export const BLOCK = 1000

/**
 * Läser en hel tabell i block.
 *
 * PostgREST kapar tyst vid takgränsen: en `select()` utan `range` ger som mest
 * takets antal rader och inget fel, så ett underlag som växer förbi gränsen
 * blir ofullständigt utan att något går sönder. Sitemapen, underlagsexporten
 * och blocksidans två vyer läser alla genom den här.
 *
 * `hamta` får ett SLUTET intervall — både `fran` och `till` ingår, precis som
 * PostgREST:s egen `range`. Läses det som halvöppet blir blocken 999 rader,
 * och då returnerar den här funktionen efter första varvet: `block.length <
 * BLOCK` slår till direkt, och anroparen får en tyst stump i stället för hela
 * tabellen.
 */
export async function allaRader<T>(
  hamta: (fran: number, till: number) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<T[]> {
  const alla: T[] = []
  for (let start = 0; ; start += BLOCK) {
    const block = await rader<T>(hamta(start, start + BLOCK - 1))
    alla.push(...block)
    if (block.length < BLOCK) return alla
  }
}
