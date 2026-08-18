import { delningsbild, OG_STORLEK, OG_TYP } from '@/lib/og'
import { FRAGOR } from '@/lib/fragor'
import { rakneord } from '@/lib/text'

export const alt = 'Hur hade du röstat? Rösta i riksdagens egna beslut och jämför med partierna'
export const size = OG_STORLEK
export const contentType = OG_TYP

/**
 * Quizets delningsbild — inbjudan, aldrig ett resultat.
 *
 * Villkoret är uppfyllt av formen och inte av en regel någon måste minnas:
 * `/rosta` är en adress utan parametrar, så bilden har ingenting att rita ett
 * resultat ur. Att låta den göra det hade krävt att svaren stoppades in i
 * URL:en — och då hade de lämnat webbläsaren, vilket är det quizet lovar att
 * de aldrig gör.
 *
 * Ett delat resultat pekar dessutom ut den som delar. Kortet ska bära frågan,
 * så att den som ser det i ett flöde kan svara på den själv.
 *
 * Antalet räknas ur listan. En delningsbild är det svåraste stället att
 * upptäcka ett osant tal på, eftersom den syns överallt utom på sajten.
 */
export default function Bild() {
  return delningsbild({
    etikett: 'Valet 2026',
    rubrik: 'Hur hade du röstat?',
    fot: `Rösta i ${rakneord(FRAGOR.length)} av riksdagens egna beslut och se hur partierna gjorde.`,
  })
}
