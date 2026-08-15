import { rader } from '@/lib/db'

/** PostgREST svarar med högst så här många rader, och säger inte ifrån. */
export const BLOCK = 1000

/**
 * Läser en hel tabell i block om tusen.
 *
 * PostgREST kapar tyst vid takgränsen: en `select()` utan `range` ger tusen
 * rader och inget fel, så ett underlag som växer förbi gränsen blir ofullständigt
 * utan att något går sönder. Sitemapen och underlagsexporten läser båda mer än
 * tusen rader och delar därför den här.
 *
 * `hamta` får ett halvöppet intervall och ska returnera raderna i det.
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
