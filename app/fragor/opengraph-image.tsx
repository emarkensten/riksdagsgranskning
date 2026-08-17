import { delningsbild, OG_STORLEK, OG_TYP } from '@/lib/og'
import { FRAGOR } from '@/lib/fragor'

export const alt = 'Nio valfrågor, och hur riksdagen faktiskt röstade om dem'
export const size = OG_STORLEK
export const contentType = OG_TYP

/**
 * Indexets egen delningsbild.
 *
 * Antalet räknas ur listan i stället för att stå i strängen. Faller en fråga
 * bort vid en granskning ska kortet inte fortsätta lova nio — och en
 * delningsbild är det svåraste stället att upptäcka ett osant tal på, eftersom
 * den syns överallt utom på sajten.
 */
export default function Bild() {
  return delningsbild({
    etikett: 'Valet 2026',
    rubrik: `${FRAGOR.length} valfrågor, och hur de faktiskt röstade.`,
    fot: 'Riksdagens egna omröstningar, med vad ett ja och ett nej innebar.',
  })
}
