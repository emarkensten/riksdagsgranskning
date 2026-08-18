import { PARTIER, namn, partilinje, type Linje } from '@/lib/parti'
import { rakneord } from '@/lib/text'
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
  namn: string
  /** Frågor där partiets linje var densamma som besökarens svar. */
  lika: number
  /** Frågor där partiet röstade tvärtom. */
  olika: number
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
    let olika = 0
    let utanStallning = 0
    let avstod = 0
    fragor.forEach((f, i) => {
      const mitt = svar[i]
      const rad = f.roster.find((r) => r.parti === parti)
      if (!mitt || !rad) return
      const linje: Linje = partilinje(rad)
      if (linje === 'Ja' || linje === 'Nej') {
        if (linje === mitt) lika++
        else olika++
        return
      }
      utanStallning++
      if (linje === 'Avstår') avstod++
    })
    return { parti, namn: namn(parti), lika, olika, utanStallning, avstod, stallning: lika + olika }
  })
}

/**
 * "avstod i fyra frågor" — hur ett partis uteblivna ställningstagande beskrivs.
 *
 * Två formuleringar därför att `partilinje()` har två utfall som inte är ja
 * eller nej. I det här materialet är samtliga tio uttryckliga avståenden och
 * inget parti var borta från någon av de nio voteringarna (mätt 2026-08-18),
 * men skillnaden mellan "avstod" och "var inte på plats" är ett sakförhållande
 * och inte en nyansskillnad — den ena är ett beslut, den andra är frånvaro.
 */
export function utanStallningText(s: Partisumma) {
  const antal = rakneord(s.utanStallning)
  const fragor = s.utanStallning === 1 ? 'fråga' : 'frågor'
  return s.avstod === s.utanStallning
    ? `avstod i ${antal} ${fragor}`
    : `tog inte ställning i ${antal} ${fragor}`
}
