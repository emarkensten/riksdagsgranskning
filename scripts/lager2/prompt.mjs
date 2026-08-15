/**
 * Lager 2: översätt en voteringspunkt till klarspråk.
 *
 * Uppgiften är ÖVERSÄTTNING AV PROCEDUR, inte omdöme. Det är medvetet:
 * ett verktyg som värderar politik blir angripet för partiskhet, ett verktyg
 * som förklarar vad som hände blir det inte. Se docs/BESLUT_2026-08.md.
 *
 * Den viktigaste instruktionen är den om reservationer. I en svensk votering
 * ställs utskottets förslag mot en reservation, så ett Nej betyder nästan
 * alltid "vi föredrog reservation N" — inte "vi är emot sakfrågan". Missar
 * modellen det producerar den påståenden som är trivialt motbevisbara.
 */

// "jämställdhet och diskriminering" lades till efter validering: utan den
// hamnade jämställdhetspolitiska voteringar under "konstitution och demokrati",
// vilket gör ämnesfiltret missvisande.
export const AMNEN = [
  'arbetsmarknad', 'ekonomi och skatt', 'försvar och säkerhet', 'hälsa och sjukvård',
  'integration och migration', 'jämställdhet och diskriminering', 'kultur och medier',
  'miljö och klimat', 'näringsliv', 'rättsväsende', 'skola och utbildning',
  'social omsorg', 'trafik och infrastruktur', 'utrikes',
  'konstitution och demokrati', 'övrigt',
]

export const SYSTEM = `Du förklarar vad svenska riksdagsvoteringar handlade om, på klarspråk.

Din uppgift är att ÖVERSÄTTA riksdagens procedurspråk till vanlig svenska. Du ska
INTE värdera om ett förslag är bra eller dåligt, klokt eller oklokt, och inte
antyda vilken sida som har rätt. Beskriv vad som hände, inte vad du tycker om det.

SÅ FUNGERAR EN SVENSK VOTERING — detta är avgörande att förstå:
Riksdagen röstar om utskottets förslag ställt mot EN reservation. Därför betyder
ett Nej nästan aldrig "vi är emot sakfrågan". Det betyder "vi föredrog
reservationens formulering". Ett parti kan rösta Nej till ett förslag om mer
resurser till skolan just för att partiet ville ha ännu mer resurser, eller
resurser fördelade annorlunda.

Skriv därför alltid ut vad reservationen faktiskt ville, med utgångspunkt i
reservationstexten. Om du bara skriver "Nej innebar att avslå förslaget" har du
misslyckats.

Vanligast av allt är att utskottet föreslår att riksdagen AVSLÅR ett antal
motioner. Ett Ja betyder då att motionerna avslås och att ingenting ändras.

Var konkret. Undvik "olika åtgärder", "vissa frågor" och liknande tomma
formuleringar. Om underlaget inte räcker för att vara konkret, sätt sakerhet
till "låg" och säg vad som är oklart.`

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sakfraga', 'ja_innebar', 'nej_innebar', 'amne', 'sakerhet'],
  properties: {
    sakfraga: {
      type: 'string',
      description: 'En mening: vad handlade voteringen om? Börja inte med "Voteringen handlade om".',
    },
    ja_innebar: {
      type: 'string',
      description: 'Vad innebar det konkret att rösta Ja? En till två meningar.',
    },
    nej_innebar: {
      type: 'string',
      description: 'Vad innebar det konkret att rösta Nej? Beskriv vad reservationen ville. En till två meningar.',
    },
    amne: { type: 'string', enum: AMNEN },
    sakerhet: {
      type: 'string',
      enum: ['låg', 'medel', 'hög'],
      description: 'Hur väl räckte underlaget? "låg" om reservationstext saknades eller var otydlig.',
    },
  },
}

/** Bygger användarmeddelandet för en voteringspunkt. */
export function byggUserPrompt(punkt) {
  const delar = [
    `BETÄNKANDE: ${punkt.bet_titel ?? '(okänd titel)'} (${punkt.beteckning}, ${punkt.rm})`,
    `FÖRSLAGSPUNKT ${punkt.punkt}: ${punkt.rubrik ?? '(ingen rubrik)'}`,
    '',
    'UTSKOTTETS FÖRSLAG:',
    punkt.forslag || '(saknas)',
  ]

  if (punkt.motforslag_partier?.length) {
    delar.push('', `MOTFÖRSLAGET STÖDDES AV: ${punkt.motforslag_partier.join(', ')}`)
  }

  if (punkt.reservationer?.length) {
    delar.push('', 'RESERVATIONER PÅ DENNA PUNKT:')
    for (const r of punkt.reservationer) {
      const partier = r.partier?.length ? r.partier.join(', ') : 'okänt parti'
      // Reservationerna kan vara långa; motiveringens början räcker för att
      // fånga vad de ville.
      delar.push('', `— Reservation ${r.nummer} (${partier}):`, (r.text || '').slice(0, 4000))
    }
  } else {
    delar.push('', 'RESERVATIONER: saknas i underlaget.')
  }

  return delar.join('\n')
}
