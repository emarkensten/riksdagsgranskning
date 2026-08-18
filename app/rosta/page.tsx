import Link from 'next/link'
import { lista } from '@/lib/db'
import { PARTIER, REGERINGSPARTIERNA, namn, regeringslikhet } from '@/lib/parti'
import { FRAGOR, KOMPASS, hamtaRostning } from '@/lib/fragor'
import { rakneord, storBokstav } from '@/lib/text'
import { regeringsspann } from '@/lib/partier'
import { Rostning } from '@/components/rostning'
import { Kompasslank } from '@/components/kompasslank'
import { Forbehall, Forbehallsrad } from '@/components/system'
import { SAJT_URL, sidmetadata } from '@/lib/sajt'

export const revalidate = 3600

export const metadata = sidmetadata({
  titel: 'Hur hade du röstat?',
  beskrivning:
    `Rösta själv i ${rakneord(FRAGOR.length)} av valets frågor — samma val som riksdagen stod inför, ` +
    `med vad ett ja och vad ett nej innebar — och se hur de ${rakneord(PARTIER.length)} partierna faktiskt röstade. ` +
    'Svaren stannar i din webbläsare.',
  sokvag: '/rosta',
  egenBild: true,
})

/**
 * Quizet "Hur hade du röstat?".
 *
 * Sidan hämtar partilinjerna och äger orden; `components/rostning.tsx` äger
 * gången och räkningen. Delningen är avsiktlig: allt som påstår något om
 * riksdagen renderas på servern ur databasen, och allt som rör besökarens egna
 * svar stannar i webbläsaren.
 *
 * **Ramen står kvar ord för ord, men i fyra utfällbara rader.** Fyra stycken
 * och en stor `Forbehall` före knappen läste som en ansvarsfriskrivning och
 * tryckte det första valet under vikningen; samma ord bakom "Läs varför" är
 * fortfarande där för den som blir misstänksam, och den som inte blir det
 * kommer i gång. Se `Forbehallsrad` i components/system.tsx.
 */
export default async function Rosta() {
  // De två frågorna delar ingen data — regeringsspann() läser
  // partisamstammighet och tar inga argument — så de väntas tillsammans.
  const [fragor, spann] = await Promise.all([hamtaRostning(), regeringsspann()])

  /**
   * M/KD/L-likheten, räknad per votering och summerad — inte skriven för hand.
   *
   * `CLAUDE.md`: namnges ett av de tre gäller fyndet alla tre, och förbehållet
   * ska stå bredvid siffran. Här är det starkare än så — de tre är identiska i
   * hela underlaget, alltså får varje besökare samma tal för dem oavsett vad
   * hen svarar. Det måste läsaren veta **innan** resultatet, annars läses de
   * tre lika talen som ett utfall av svaren.
   *
   * Antalet räknas fram i stället för att antas vara nio. Mätt 2026-08-18:
   * samtliga nio, ja i var och en. Skulle en fråga bytas ut skriver sidan ut
   * det nya talet i stället för att tyst fortsätta lova identiska linjer.
   */
  const utbytbara = REGERINGSPARTIERNA.map(namn)
  const likheter = fragor.map((f) => regeringslikhet(f.roster))
  const lika = likheter.filter((l) => l.lika)
  const allaLika = lika.length === fragor.length
  // Bara om alla nio dessutom landade på SAMMA linje går det att skriva ut
  // vilken. Nio identiska par av tre är inte samma sak som nio gånger ja.
  const gemensam =
    allaLika && new Set(lika.map((l) => l.linje)).size === 1 ? lika[0].linje : undefined

  const antalLika = allaLika
    ? `samtliga ${rakneord(fragor.length)}`
    : `${rakneord(lika.length)} av ${rakneord(fragor.length)}`

  return (
    <main>
      <Rostning
        fragor={fragor}
        adress={`${SAJT_URL}/rosta`}
        ingress={
          <>
            Riksdagen avgjorde de här {rakneord(fragor.length)} frågorna under
            mandatperioden. Du får kammarens två alternativ — utskottets förslag
            ställt mot motförslaget, båda utskrivna — och ställs sedan mot hur de{' '}
            {rakneord(PARTIER.length)} partierna faktiskt röstade.
          </>
        }
        likhetsnotKort={
          <Forbehall litet>
            Innan talen: {lista(utbytbara)} röstade lika i {antalLika} frågor,
            så att du hamnar lika nära alla tre är aritmetik och inte ett utfall
            av dina svar.
          </Forbehall>
        }
      >
        {/* Ramen, utskriven innan första frågan — men doserad. Skillnaden mot
            en valkompass är hela skälet till att quizet håller, och den som
            vill veta varför får hela stycket på ett klick. */}
        <Forbehallsrad
          etikett="Inte en åsiktsmätning"
          kort="Frågan är hur du hade röstat i voteringen — inte vad du tycker om sakfrågan i stort."
        >
          En valkompass frågar vad du tycker om en sakfråga, och det går inte
          att jämföra med en votering. Här är instrumentet detsamma för dig och
          för partierna — själva omröstningen. Därför står det utskrivet vad ett
          ja innebar och vad ett nej innebar innan du väljer. Ett parti som
          röstade nej hade nästan alltid ett eget förslag och röstade för det;
          nej är inte samma sak som motstånd mot sakfrågan.
        </Forbehallsrad>

        <Forbehallsrad
          etikett="Svaren stannar hos dig"
          kort="Ingenting sparas, skickas eller mäts. Lämnar du sidan är svaren borta."
        >
          Hur du skulle rösta är en politisk åsikt, och den är inte vår. Svaren
          ligger i webbläsarens minne så länge fliken är öppen — inte i en
          kaka, inte i adressfältet och inte hos oss. Räkningen mot partiernas
          linjer görs i din webbläsare, av kod som redan har linjerna med sig.
        </Forbehallsrad>

        <Forbehallsrad
          etikett={`${storBokstav(rakneord(REGERINGSPARTIERNA.length))} går inte att skilja`}
          kort={
            <>
              {lista(utbytbara)} röstade lika i {antalLika} frågor. Du hamnar
              lika nära alla tre — det är aritmetik, inte ett utfall av dina
              svar.
            </>
          }
        >
          Vilket du än svarar får de tre därför exakt samma tal, och quizet kan
          inte skilja dem åt
          {gemensam ? ` — de röstade ${gemensam.toLowerCase()} i var och en` : ''}.
          Det är ingen egenhet hos de här frågorna: de tre röstade lika i {spann}{' '}
          av mandatperiodens samtliga voteringar.
        </Forbehallsrad>

        <Forbehallsrad
          etikett="Urvalet"
          kort={`Frågorna följer ${KOMPASS.namn}. Formuleringarna är våra egna.`}
        >
          {/* Repots idiom för länk i löptext, som i Kompasslank: understruken
              och i bläck. En `Textlank` här hade satt sin pil mitt i
              meningen och lämnat punkten hängande efter den. */}
          Vi har valt ut de {rakneord(fragor.length)} voteringar som ligger
          närmast frågorna i <Kompasslank />, och skrivit om dem till det val
          kammaren faktiskt ställdes inför. Samma {rakneord(fragor.length)}{' '}
          frågor står under{' '}
          <Link href="/fragor" className="underline hover:opacity-70" style={{ color: 'var(--black)' }}>
            Valfrågor
          </Link>
          , där varje beslut går att läsa i sin helhet med rösterna.
        </Forbehallsrad>
      </Rostning>
    </main>
  )
}
