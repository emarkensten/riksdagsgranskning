/**
 * Partiets linje i en votering.
 *
 * Frånvaro räknas medvetet inte som ett alternativ: ett parti med 30 Ja och
 * 40 frånvarande hade positionen Ja. Speglar lib/db.ts partilinje() — samma
 * regel måste gälla i pipelinen och i gränssnittet, annars säger de två olika
 * saker om samma votering.
 */
export function partilinjeSQL({ ja = 0, nej = 0, avstar = 0 }) {
  const avlagda = [['Ja', ja], ['Nej', nej], ['Avstår', avstar]]
  const bast = avlagda.sort((a, b) => b[1] - a[1])[0]
  return bast[1] > 0 ? bast[0] : 'Frånvarande'
}
