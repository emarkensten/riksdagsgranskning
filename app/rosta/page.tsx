import Link from 'next/link'
import { lista } from '@/lib/db'
import { PARTIER, REGERINGSPARTIERNA, namn, partilinje, type Linje } from '@/lib/parti'
import { FRAGOR, hamtaRostning, rakneord } from '@/lib/fragor'
import { storBokstav } from '@/lib/text'
import { regeringsspann } from '@/lib/partier'
import { Rostning } from '@/components/rostning'
import { Kompasslank } from '@/components/kompasslank'
import { Forbehall } from '@/components/system'
import { sidmetadata } from '@/lib/sajt'

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
 */
export default async function Rosta() {
  const fragor = await hamtaRostning()

  /**
   * M/KD/L-likheten, räknad ur de nio voteringarna och inte skriven för hand.
   *
   * `CLAUDE.md`: namnges ett av de tre gäller fyndet alla tre, och förbehållet
   * ska stå bredvid siffran. Här är det starkare än så — de tre är identiska i
   * hela underlaget, alltså får varje besökare samma tal för dem oavsett vad
   * hen svarar. Det måste läsaren veta **innan** resultatet, annars läses de
   * tre lika talen som ett utfall av svaren.
   *
   * `likaAntal` räknas fram i stället för att antas vara nio. Mätt 2026-08-18:
   * samtliga nio, ja i var och en. Skulle en fråga bytas ut skriver sidan ut
   * det nya talet i stället för att tyst fortsätta lova identiska linjer.
   */
  const utbytbara = REGERINGSPARTIERNA.map(namn)
  const spann = await regeringsspann()
  const treLinjer: (Linje | undefined)[][] = REGERINGSPARTIERNA.map((p) =>
    fragor.map((f) => {
      const r = f.roster.find((x) => x.parti === p)
      return r ? partilinje(r) : undefined
    }),
  )
  const likaAntal = fragor.filter((_, i) => {
    const forst = treLinjer[0][i]
    return forst !== undefined && treLinjer.every((rad) => rad[i] === forst)
  }).length
  const allaLika = likaAntal === fragor.length
  const gemensam = allaLika && new Set(treLinjer[0]).size === 1 ? treLinjer[0][0] : undefined

  const antalLika = allaLika
    ? `samtliga ${rakneord(fragor.length)}`
    : `${rakneord(likaAntal)} av ${rakneord(fragor.length)}`

  return (
    <main>
      <Rostning
        fragor={fragor}
        intro={
          <>
            <p className="mt-7 max-w-[56ch] text-[clamp(17px,2.2vw,21px)] leading-[1.45]"
               style={{ color: 'var(--black-mjuk)' }}>
              Riksdagen avgjorde de här {rakneord(fragor.length)} frågorna under
              mandatperioden. Du får samma val som kammaren hade — utskottets
              förslag ställt mot motförslaget, båda utskrivna — och när du är
              klar ställs dina svar mot hur de {rakneord(PARTIER.length)} partierna
              faktiskt röstade.
            </p>
            {/* Ramen, utskriven innan första frågan. Skillnaden mot en
                valkompass är hela skälet till att quizet håller: en kompass
                frågar vad du tycker om en sakfråga, och det går inte att
                jämföra med en votering. Här är instrumentet detsamma för
                besökaren och för partierna — själva omröstningen. */}
            <p className="mt-5 max-w-[62ch] text-[16px] leading-[1.6]"
               style={{ color: 'var(--black-mjuk)' }}>
              Det är inte en åsiktsmätning. Frågan är aldrig vad du tycker om
              sakfrågan i stort, utan hur du hade röstat i den votering
              riksdagen faktiskt höll — därför står det utskrivet vad ett ja
              innebar och vad ett nej innebar innan du väljer. Ett parti som
              röstade nej hade nästan alltid ett eget förslag och röstade för
              det; nej är inte samma sak som motstånd mot sakfrågan.
            </p>
            <p className="mt-5 max-w-[62ch] text-[16px] font-semibold leading-[1.6]">
              Dina svar stannar i din webbläsare. Ingenting sparas, ingenting
              skickas någonstans och ingenting mäts — hur du skulle rösta är en
              politisk åsikt, och den är inte vår.
            </p>
            <p className="mt-5 max-w-[62ch] text-[14.5px] leading-[1.6]"
               style={{ color: 'var(--black-svag)' }}>
              {/* Repots idiom för länk i löptext, som i Kompasslank: understruken
                  och i bläck. En `Textlank` här hade satt sin pil mitt i
                  meningen och lämnat punkten hängande efter den. */}
              Frågorna är samma {rakneord(fragor.length)} som står under{' '}
              <Link href="/fragor" className="underline hover:opacity-70" style={{ color: 'var(--black)' }}>
                Valfrågor
              </Link>
              . Urvalet följer <Kompasslank />, formuleringarna är våra egna.
            </p>
          </>
        }
        likhetsnot={
          <Forbehall rubrik={`${storBokstav(rakneord(REGERINGSPARTIERNA.length))} av ${rakneord(PARTIER.length)} går inte att skilja åt.`}>
            {lista(utbytbara)} röstade lika i {antalLika} frågor
            {gemensam ? ` — ${gemensam.toLowerCase()} i var och en` : ''}. Vilket
            du än svarar får de tre därför exakt samma tal, och quizet kan inte
            skilja dem åt. Det är ingen egenhet hos de här frågorna: de tre
            röstade lika i {spann} av mandatperiodens samtliga voteringar.
          </Forbehall>
        }
        likhetsnotKort={
          <Forbehall litet>
            Innan talen: {lista(utbytbara)} röstade lika i {antalLika} frågor,
            så att du hamnar lika nära alla tre är aritmetik och inte ett utfall
            av dina svar.
          </Forbehall>
        }
      />
    </main>
  )
}
