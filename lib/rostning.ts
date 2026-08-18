import { PARTIER, linje, namn } from '@/lib/parti'
import { SAJT, SAJT_URL } from '@/lib/sajt'
import { rakneord, storBokstav } from '@/lib/text'
import type { PartiRad } from '@/components/rostrad'

/**
 * Quizets räkning. Rent räknande, inga databasanrop.
 *
 * Filen importeras av `components/rostning.tsx`, som körs i webbläsaren, och
 * får därför bara hänga i `lib/parti`. Det är också villkoret från planen:
 * svaren lämnar aldrig webbläsaren, alltså måste jämförelsen kunna göras utan
 * att något skickas någonstans.
 */

/** Besökarens svar. Bara de två alternativ kammaren hade. */
export type Svar = 'Ja' | 'Nej'

/**
 * En fråga, med allt quizet behöver, färdigt att skickas som props.
 *
 * `mening` är förräknad på servern i stället för att sättas ihop här. Det
 * finns exakt två svar per fråga, alltså arton meningar totalt — och att
 * räkna fram dem på servern är skälet till att den här filen slipper
 * `lista()`, `rakneord()` och `namn()` ur `lib/db`, som hade dragit med sig
 * hela supabase-js in i webbläsaren. Meningarna är fortfarande härledda ur
 * röstdata, aldrig skrivna för hand.
 */
export type Rostningsfraga = {
  slug: string
  rubrik: string
  amne: string
  /** Redan satt med `datum()` på servern — `lib/db` når inte webbläsaren. */
  datumtext: string
  /** Vad voteringen gällde, i klarspråk. */
  sakfraga: string
  ja_innebar: string
  nej_innebar: string
  roster: PartiRad[]
  /** Den härledda meningen under etiketterna, en per möjligt svar. */
  mening: Record<Svar, string>
}

export type Partisumma = {
  parti: string
  /** Frågor där partiets linje var densamma som besökarens svar. */
  lika: number
  /**
   * Frågor där partiet varken röstade ja eller nej.
   *
   * Räknas **varken som träff eller miss**: partiet tog inte ställning, och
   * att lägga avståendet på missidan vore att påstå en oenighet som inte
   * finns. Därför är `stallning` nämnaren i "X av N" och inte alltid nio —
   * Miljöpartiet avstod i fyra av de nio och kan bara jämföras på fem.
   */
  utanStallning: number
  /** Av `utanStallning`: de som var uttryckliga avståenden. */
  avstod: number
  /** Frågor där partiet tog ställning ja eller nej. Nämnaren i "X av N". */
  stallning: number
}

/**
 * Besökarens svar mot varje partis linje.
 *
 * Ordningen är `PARTIER`, alltså sajtens vanliga — **inte** sorterad efter
 * antal träffar. En sorterad lista kröner ett parti överst och gör resultatet
 * till den dom quizet uttryckligen inte ska vara; talen står bredvid varandra
 * och läsaren får dra sin egen slutsats. Samma skäl som gör att frågesidorna
 * inte översätter en votering till kompassens svarsskala.
 */
export function summera(fragor: Rostningsfraga[], svar: (Svar | null)[]): Partisumma[] {
  return PARTIER.map((parti) => {
    let lika = 0
    let stallning = 0
    let utanStallning = 0
    let avstod = 0
    fragor.forEach((f, i) => {
      const mitt = svar[i]
      const l = mitt && linje(f.roster, parti)
      if (!l) return
      if (l === 'Ja' || l === 'Nej') {
        stallning++
        if (l === mitt) lika++
        return
      }
      utanStallning++
      if (l === 'Avstår') avstod++
    })
    return { parti, lika, utanStallning, avstod, stallning }
  })
}

/**
 * "avstod" eller "tog inte ställning" — verbet för ett uteblivet ställningstagande.
 *
 * Anropas både av resultatskärmen, per parti över nio frågor, och av
 * `mening()` i lib/fragor.ts, per fråga över åtta partier. Samma skillnad,
 * samma ord.
 *
 * Två formuleringar därför att `partilinje()` har två utfall som inte är ja
 * eller nej. I det här materialet är samtliga tio uttryckliga avståenden och
 * inget parti var borta från någon av de nio voteringarna (mätt 2026-08-18),
 * men skillnaden mellan "avstod" och "var inte på plats" är ett sakförhållande
 * och inte en nyansskillnad — den ena är ett beslut, den andra är frånvaro.
 */
export function utanStallningVerb(utan: number, avstod: number) {
  return avstod === utan ? 'avstod' : 'tog inte ställning'
}

/** Samma sak med antalet i sig: "avstod i fyra frågor". */
export function utanStallningText(utan: number, avstod: number) {
  return `${utanStallningVerb(utan, avstod)} i ${rakneord(utan)} ${utan === 1 ? 'fråga' : 'frågor'}`
}

/**
 * Resultatet som ren text, för besökarens urklipp.
 *
 * Räknas fram ur samma `summera()` som skärmen visar — inte ur en andra
 * uppställning av samma tal. Går de isär är det för att någon ändrat på ett
 * ställe, och det är precis det den här formen ska omöjliggöra.
 *
 * **Ingen länk till ett resultat, bara till quizet.** En delbar adress hade
 * krävt svaren i frågesträngen, och de ska inte finnas någonstans utanför
 * fliken — se komponentens huvudkommentar. Texten bär talen, inte ett spår
 * tillbaka till den som svarade.
 */
export function sammanfattning(
  fragor: Rostningsfraga[],
  svar: Svar[],
  summor: Partisumma[],
): string {
  const parti = summor.map((s) => {
    const tal =
      s.stallning > 0 ? `${s.lika} av ${s.stallning}` : 'ingen jämförelse'
    const utan =
      s.utanStallning > 0 ? ` (${utanStallningText(s.utanStallning, s.avstod)})` : ''
    return `${namn(s.parti)}: ${tal}${utan}`
  })

  const fraga = fragor.map(
    (f, i) => `${i + 1}. ${f.rubrik} — jag svarade ${svar[i].toLowerCase()}`,
  )

  return [
    `Hur hade du röstat? — ${SAJT}`,
    `${storBokstav(rakneord(fragor.length))} frågor som riksdagen avgjorde 2022–2026.`,
    '',
    'Parti för parti — andel av de frågor där partiet tog ställning:',
    ...parti,
    '',
    'Fråga för fråga:',
    ...fraga,
    '',
    `Svaren har inte sparats någonstans. ${SAJT_URL}/rosta`,
  ].join('\n')
}
