import { delningsbild, OG_STORLEK, OG_TYP } from '@/lib/og'
import { UNDERTITEL } from '@/lib/sajt'

export const alt = 'Namnupprop — så röstade riksdagen'
export const size = OG_STORLEK
export const contentType = OG_TYP

/**
 * Sajtens delningsbild. Ärvs av varje sida som inte har en egen, alltså alla
 * utom voteringsdetaljen.
 *
 * Rubriken är inte namnet: den som ser bilden i ett flöde ska förstå vad
 * sajten gör innan hen läser ordmärket i hörnet.
 *
 * Den var startsidans h1 fram till vändningen och är nu /fynd:s. Den står
 * kvar därför att ett delningskort saknar sammanhang — "Vad gjorde de?"
 * fungerar under ett sökfält men inte ensamt i ett flöde.
 */
export default function Bild() {
  return delningsbild({
    etikett: 'Mandatperioden 2022–2026',
    rubrik: 'Så röstade riksdagen.',
    fot: UNDERTITEL,
  })
}
