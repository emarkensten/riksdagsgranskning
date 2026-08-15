import { delningsbild, OG_STORLEK, OG_TYP } from '@/lib/og'
import { rubrik } from '@/lib/votering'

export const alt = 'Sakfrågan i voteringen, och vad ett ja och ett nej innebar'
export const size = OG_STORLEK
export const contentType = OG_TYP

/** Samma timme som sidan. Utan den görs en fråga och en satori-rendering per
 *  begäran, medan sidan bredvid serveras ur cachen. */
export const revalidate = 3600

/**
 * Voteringens egen delningsbild.
 *
 * Rubriken är sakfrågan i klarspråk — hela poängen med sajten. Beteckningen
 * "SfU16 punkt 3" står medvetet inte som rubrik: den säger ingenting för den
 * som ser bilden i ett flöde, och att den inte säger något är själva skälet
 * till att sajten finns. Den får plats i etiketten ovanför i stället.
 *
 * `storlek()` i lib/og trappar ned typsnittet med rubrikens längd. Den längsta
 * sakfrågan i materialet är 189 tecken och hamnar på 48 px, vilket ryms på fyra
 * rader.
 */
// params typas som Promise och await:as, precis som i sidorna. På Next 14 är
// det ett vanligt objekt och `await` lämnar det orört; blir det asynkront i en
// senare version fortsätter den här filen att fungera. Läses det som ett objekt
// när det är en Promise blir id undefined, och varje votering får tyst
// "finns inte"-bilden utan att något kastar.
export default async function Bild({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await rubrik(Number(id))
  if (!r) {
    return delningsbild({
      etikett: 'Votering',
      rubrik: 'Den här voteringen finns inte.',
      fot: 'Varje votering med namnupprop 2022–2026.',
    })
  }
  return delningsbild({
    etikett: `${r.amne} · ${r.beteckning}`,
    rubrik: r.sakfraga,
    fot: 'Vad ett ja innebar, vad ett nej innebar, och vilka som stod bakom.',
  })
}
