import type { Metadata } from 'next'

/**
 * Sajtens egna uppgifter — de som handlar om avsändaren, inte om riksdagen.
 *
 * Repo-adressen står på fyra ställen: sidfoten, /om, metodsidans rättelseavsnitt
 * och felsidan. Repot heter fortfarande `riksdagsgranskning` efter namnbytet,
 * och just därför ska strängen finnas på ett ställe — den ser ut som ett stavfel
 * i varje enskild fil och blir rättad av misstag förr eller senare.
 */
export const REPO = 'https://github.com/emarkensten/riksdagsgranskning'

/** Kontaktvägen. Ingen e-postadress publiceras — se /om. */
export const NYTT_ARENDE = `${REPO}/issues/new`

export const SAJT = 'Namnupprop'
export const UNDERTITEL = 'Varje votering i riksdagen, på vanlig svenska.'

/**
 * Sajtens adress, för metadataBase och sitemap.
 *
 * Absoluta URL:er krävs av både Open Graph och sitemap-protokollet — en relativ
 * sökväg i og:image gör att förhandsvisningen tyst uteblir hos alla som läser
 * den. Någon publik adress finns inte ännu, så localhost är fallback: bilderna
 * går då att kontrollera i utveckling, och den dagen sajten publiceras är det en
 * miljövariabel som ändras och ingen kod.
 */
export const SAJT_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * Kapar vid ordgräns och sätter ut att det är kapat.
 *
 * Sakfrågorna är i snitt 126 tecken och som längst 247. De duger som rubrik men
 * inte som `<title>`, och de spräcker en delningsbild — båda ställena kapar,
 * med olika tak.
 */
export function korta(text: string, tak: number) {
  if (text.length <= tak) return text
  const kapad = text.slice(0, tak)
  const sista = kapad.lastIndexOf(' ')
  return `${(sista > tak - 24 ? kapad.slice(0, sista) : kapad).replace(/[,.\s]+$/, '')}…`
}

/**
 * Metadatan för en undersida, med openGraph och twitter ifyllda.
 *
 * Finns därför att Next **ersätter** hela `openGraph`-objektet när en sida
 * sätter det, i stället för att slå ihop det med rotens. Varje sida hade
 * alltså behövt upprepa `type`, `locale` och `siteName` — och den sida som
 * glömde en av dem hade tappat den tyst, eftersom ingenting går sönder när ett
 * metataggsfält saknas. Bilden ärvs däremot från närmaste
 * `opengraph-image`-fil och ska inte anges här.
 */
export function sidmetadata({
  titel,
  beskrivning,
  sokvag,
}: {
  titel: string
  beskrivning: string
  sokvag: string
}): Metadata {
  const helTitel = `${titel} — ${SAJT}`
  return {
    title: helTitel,
    description: beskrivning,
    alternates: { canonical: sokvag },
    openGraph: {
      type: 'article',
      locale: 'sv_SE',
      siteName: SAJT,
      title: helTitel,
      description: beskrivning,
      url: sokvag,
    },
    twitter: { card: 'summary_large_image', title: helTitel, description: beskrivning },
  }
}

/** Den som svarar för innehållet. Utan namn är sajtens hållning inte någons. */
export const AVSANDARE = 'Erik Markensten'

/**
 * Kontot bakom koden.
 *
 * Ett namn utan något att kontrollera det mot går inte att skilja från en
 * pseudonym, och sajten ber läsaren om förtroende i just den frågan. Profilen
 * visar samma konto som äger repot och commit-historiken.
 */
export const PROFIL = 'https://github.com/emarkensten'
