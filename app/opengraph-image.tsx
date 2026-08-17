import { delningsbild, OG_STORLEK, OG_TYP } from '@/lib/og'
import { SAJT, UNDERTITEL } from '@/lib/sajt'

// Härledd ur SAJT och inte skriven för hand: alt-texten är det enda stället där
// namnet stod kvar efter namnbytet, och den syns bara för den som inte ser
// bilden.
export const alt = `${SAJT} — så röstade riksdagen`
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
