import { delningsbild, OG_STORLEK, OG_TYP } from '@/lib/og'
import { UNDERTITEL } from '@/lib/sajt'

export const alt = 'Namnupprop — så röstade riksdagen'
export const size = OG_STORLEK
export const contentType = OG_TYP

/**
 * Sajtens delningsbild. Ärvs av varje sida som inte har en egen, alltså alla
 * utom voteringsdetaljen.
 *
 * Rubriken är startsidans, inte namnet: den som ser bilden i ett flöde ska
 * förstå vad sajten gör innan hen läser ordmärket i hörnet.
 */
export default function Bild() {
  return delningsbild({
    etikett: 'Mandatperioden 2022–2026',
    rubrik: 'Så röstade riksdagen.',
    fot: UNDERTITEL,
  })
}
