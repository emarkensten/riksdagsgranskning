import { delningsbild, OG_STORLEK, OG_TYP } from '@/lib/og'
import { rubrik } from '@/lib/votering'

export const alt = 'Sakfrågan i voteringen, och vad ett ja och ett nej innebar'
export const size = OG_STORLEK
export const contentType = OG_TYP

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
export default async function Bild({ params }: { params: { id: string } }) {
  const r = await rubrik(Number(params.id))
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
