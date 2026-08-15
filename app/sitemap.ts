import type { MetadataRoute } from 'next'
import { db, rader, slug, PARTIER } from '@/lib/db'
import { SAJT_URL } from '@/lib/sajt'

/**
 * Varje votering är en egen landningssida, och utan sitemap får ingen crawler
 * veta att de finns: de nås bara genom en paginerad lista, och listan renderas
 * dynamiskt ur searchParams.
 *
 * Räknas om en gång i timmen, som sidorna.
 */
export const revalidate = 3600

const STATISKA = [
  ['', 1],
  ['/voteringar', 0.9],
  ['/partier', 0.8],
  ['/samstammighet', 0.8],
  ['/amnen', 0.8],
  ['/franvaro', 0.8],
  ['/metod', 0.7],
  ['/om', 0.6],
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // votering_lista och inte punkt_klartext: listan är det universum
  // /voteringar faktiskt visar, och en sitemap ska peka på sidor som finns.
  // Se #olika-tal på metodsidan för varför de två talen skiljer sig åt.
  //
  // Tusentals rader, alltså över PostgREST:s takgräns på 1 000. `range` läser
  // dem i block — utan den kapas listan tyst och de senaste voteringarna
  // saknas i sitemapen utan att något går sönder.
  const punkter: { forslagspunkt_id: number; datum: string }[] = []
  const BLOCK = 1000
  for (let start = 0; ; start += BLOCK) {
    const block = await rader<{ forslagspunkt_id: number; datum: string }>(
      db()
        .from('votering_lista')
        .select('forslagspunkt_id, datum')
        .order('forslagspunkt_id')
        .range(start, start + BLOCK - 1),
    )
    punkter.push(...block)
    if (block.length < BLOCK) break
  }

  const senast = punkter.reduce<string | undefined>(
    (m, p) => (!m || p.datum > m ? p.datum : m),
    undefined,
  )

  return [
    ...STATISKA.map(([sokvag, priority]) => ({
      url: `${SAJT_URL}${sokvag}`,
      lastModified: senast ? new Date(senast) : undefined,
      changeFrequency: 'monthly' as const,
      priority,
    })),
    ...PARTIER.map((p) => ({
      url: `${SAJT_URL}/partier/${slug(p)}`,
      lastModified: senast ? new Date(senast) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...punkter.map((p) => ({
      url: `${SAJT_URL}/voteringar/${p.forslagspunkt_id}`,
      lastModified: new Date(p.datum),
      // Voteringen är avgjord och ändras inte. Sammanfattningen kan skrivas
      // om vid en ny körning, men det är sällsynt nog att `yearly` är en
      // ärligare signal än `monthly`.
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    })),
  ]
}
