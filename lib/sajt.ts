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

export const SAJT = 'Riksdagskammaren'

/**
 * Undertiteln säger inte "i riksdagen" längre.
 *
 * Namnet gör det redan, och `${SAJT} — ${UNDERTITEL}` är den sträng varje
 * delningsbild bär som `alt`. Med den gamla lydelsen läste den
 * "Riksdagskammaren — Varje votering i riksdagen".
 */
export const UNDERTITEL = 'Varje votering, förklarad på vanlig svenska.'

/**
 * Rotens delningsbild, som `app/opengraph-image.tsx` ritar.
 *
 * Relativ med flit: `metadataBase` i `app/layout.tsx` gör den absolut, och den
 * dagen sajten byter adress följer bilden med utan att någon rör den här raden.
 */
export const DELNINGSBILD = '/opengraph-image'

/**
 * Sajtens adress, för metadataBase, sitemap och robots.
 *
 * Absoluta URL:er krävs av både Open Graph och sitemap-protokollet — en relativ
 * sökväg i og:image gör att förhandsvisningen tyst uteblir hos alla som läser
 * den.
 *
 * Fallbacken var localhost, och det var ett fel som inte syntes någonstans i
 * bygget: den publicerade sajten skrev ut
 * `og:image: http://localhost:3000/opengraph-image` och
 * `og:url: http://localhost:3000`. Ingen crawler kan hämta den adressen, så en
 * delad länk i iMessage eller Slack blev naken text utan rubrik och utan bild.
 * Sitemapen pekade på samma icke-existerande värd.
 *
 * `VERCEL_PROJECT_PRODUCTION_URL` är produktionsdomänen och sätts av Vercel
 * själv, även i förhandsdeployer — därför pekar delningsbilderna på den
 * riktiga sajten också från en förhandsversion, i stället för på en URL som
 * försvinner. `NEXT_PUBLIC_SITE_URL` går före och är den som ska sättas när
 * sajten får ett eget domännamn.
 */
const vercelDoman = process.env.VERCEL_PROJECT_PRODUCTION_URL

export const SAJT_URL =
  process.env.NEXT_PUBLIC_SITE_URL
  ?? (vercelDoman ? `https://${vercelDoman}` : 'http://localhost:3000')

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
 * metataggsfält saknas.
 *
 * Bilden stod tidigare inte här, i tron att den ärvdes från
 * `app/opengraph-image.tsx`. Den gör inte det. Mätt på den publicerade sajten
 * hade startsidan en `og:image` medan /franvaro, /samstammighet, /metod och
 * /blocken hade noll — filkonventionens bild gäller det segment den ligger i,
 * inte segmenten under. Voteringssidorna hade sin, eftersom filen ligger i
 * deras eget segment. Varje delad undersida blev alltså en länk utan bild, och
 * ingenting sa ifrån: en uteblivande metatagg går inte sönder.
 *
 * `/opengraph-image` utan hashen i frågesträngen svarar med samma bild —
 * hashen är Next sätt att spräcka cachen när bilden ändras, inte en del av
 * adressen. Undersidorna delar rotens bild med flit: den bär sajtens namn och
 * inte sidans, och en delad länk ska se ut att komma från sajten.
 * Voteringssidorna har en egen `opengraph-image.tsx` och sätter sin egen.
 */
export function sidmetadata({
  titel,
  beskrivning,
  sokvag,
  egenBild = false,
}: {
  titel: string
  beskrivning: string
  sokvag: string
  /**
   * Sätts av sidor som har en egen `opengraph-image.tsx` i sitt eget
   * segment — i dag bara voteringssidorna, som ritar sakfrågan i bilden.
   * Då anges ingen bild här, och filkonventionen får sätta sin.
   */
  egenBild?: boolean
}): Metadata {
  const helTitel = `${titel} — ${SAJT}`
  // Nyckeln utelämnas helt när sidan har en egen bild, i stället för att sättas
  // till undefined. Next läser `images: undefined` som ett uttryckligt "ingen
  // bild" och tar då bort filkonventionens — mätt på den publicerade sajten:
  // voteringssidorna tappade sin egen delningsbild av precis det.
  const bild = egenBild
    ? {}
    : { images: [{ url: DELNINGSBILD, width: 1200, height: 630, alt: `${SAJT} — ${UNDERTITEL}` }] }
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
      ...bild,
    },
    // Egen bild även här: `twitter` ärver inte `openGraph.images`, och en sida
    // som saknar twitter:image faller tillbaka på og:image hos vissa läsare
    // men inte hos alla.
    twitter: {
      card: 'summary_large_image',
      title: helTitel,
      description: beskrivning,
      ...bild,
    },
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
