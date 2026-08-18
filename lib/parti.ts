/**
 * Partierna och röstlinjen — allt som är rent, och ingenting som rör databasen.
 *
 * Filen finns därför att `lib/db.ts` har `@supabase/supabase-js` som statisk
 * import. Varje klientkomponent som importerar därifrån drar in ~40 kB som
 * aldrig anropas i webbläsaren.
 *
 * **Det hade redan hänt, oupptäckt.** `app/error.tsx` är en klientkomponent
 * sedan #37 och importerar `Etikett` ur `components/system.tsx`, som hämtade
 * `PARTIFARG` ur `lib/db`. Kedjan error → system → db → supabase-js har alltså
 * legat i bunten i månader utan att någon mätt den. Quizet på `/rosta` är inte
 * den första klientytan — det är den första som var stor nog att få någon att
 * titta.
 *
 * Alternativet till flytten var en andra kopia av `ROSTFARG` och `PARTINAMN`
 * i klientkoden, alltså två ställen att hålla i takt.
 *
 * **`lib/db.ts` återexporterar ingenting härifrån**, och det är avsiktligt.
 * En återexport hade dolt gränsen igen — den första som importerade `namn()`
 * från `lib/db` hade fått supabase-js på köpet utan att något sa ifrån — och
 * den hade dessutom fällt `npm run kontrollera`, som laddar `lib/db.ts` i
 * naken Node där `@/`-aliaset inte finns. Anropsställena importerar därför
 * härifrån, allihop.
 */

export const PARTIER = ['S', 'M', 'SD', 'C', 'V', 'KD', 'MP', 'L'] as const
export type Parti = (typeof PARTIER)[number]

/** URL-segmentet för en partisida: /partier/sd. */
export function slug(parti: string) {
  return parti.toLowerCase()
}

/**
 * Partikoden bakom ett URL-segment, eller undefined för allt annat.
 *
 * Går aldrig förbi den här funktionen och in i en fråga: partikoden
 * interpoleras i PostgREST:s or-filter, och där duger inte otvättad indata.
 */
export function partiFranSlug(segment: string): Parti | undefined {
  return PARTIER.find((p) => p.toLowerCase() === segment.toLowerCase())
}

/**
 * Regeringen 2022–2026. Vilka partier som styr är en politisk omständighet och
 * finns inte i röstdata.
 *
 * Samma tre partier är också de som röstar närmast identiskt (99,9–100 %), och
 * de två egenskaperna används om vartannat i koden. Det är ingen tillfällighet
 * — de röstar lika därför att de regerar tillsammans — men skulle de någon gång
 * skilja sig åt är det två listor, inte en. Räkna alltid ut likheten ur data.
 */
export const REGERINGSPARTIERNA = ['M', 'KD', 'L'] as const

const PARTINAMN: Record<string, string> = {
  S: 'Socialdemokraterna', M: 'Moderaterna', SD: 'Sverigedemokraterna',
  C: 'Centerpartiet', V: 'Vänsterpartiet', KD: 'Kristdemokraterna',
  MP: 'Miljöpartiet', L: 'Liberalerna',
}

/**
 * Fullt partinamn. Förkortningar hör hemma i tabeller där utrymmet kräver det,
 * inte i löpande text — sajten skrivs för läsare som inte kan dem utantill.
 */
export function namn(forkortning?: string) {
  return (forkortning && PARTINAMN[forkortning]) || forkortning || '—'
}

/** Riksdagens egna partifärger. Endast för dataavkodning. */
export const PARTIFARG: Record<string, string> = {
  S: '#e8112d',
  M: '#52bdec',
  SD: '#ddc000',
  C: '#009933',
  V: '#af0000',
  KD: '#000077',
  MP: '#83cf39',
  L: '#006ab3',
}

export const ROSTFARG: Record<string, string> = {
  Ja: 'var(--ja)',
  Nej: 'var(--nej)',
  Avstår: 'var(--avstar)',
  Frånvarande: 'var(--franvarande)',
}

/** Textfärgen som håller 4,5:1 mot respektive röstfärg. Se globals.css. */
export const ROSTTEXT: Record<string, string> = {
  Ja: 'var(--ja-text)',
  Nej: 'var(--nej-text)',
  Avstår: 'var(--avstar-text)',
  Frånvarande: 'var(--franvarande-text)',
}

/**
 * Ett partis röstetal i en votering.
 *
 * `components/rostrad.tsx` exporterar den under namnet `PartiRad`, som ett
 * rent typalias. Att `lib/db` inte får återexportera härifrån gäller värden —
 * typer försvinner vid kompilering och kostar ingenting i bunten.
 */
export type Rost = {
  parti: string
  ja: number
  nej: number
  avstar: number
  franvarande: number
}

export type PartiRost = Rost & { linje: Linje }

/** De fyra värden en partilinje kan anta. */
export type Linje = 'Ja' | 'Nej' | 'Avstår' | 'Frånvarande'

/**
 * Partiets linje = det alternativ flest av dess NÄRVARANDE ledamöter valde.
 *
 * Frånvaro räknas medvetet inte med. Ett parti med 30 Ja och 40 frånvarande
 * hade positionen Ja — att redovisa "Frånvarande" som partiets hållning vore
 * ett sakfel.
 *
 * Regeln finns också i SQL, som `partilinje(ja, nej, avstar)`, och matar därifrån
 * varje materialiserad vy. De två kan inte dela implementation.
 * `npm run kontrollera` prövar dem mot varandra på alla 433 kombinationer som
 * förekommer i datan plus ett tiotal konstruerade, och fäller om de går isär.
 *
 * **Ingen röstade** är den enda skillnad som är avsedd: här blir svaret
 * 'Frånvarande', i SQL null. Vyerna filtrerar bort null och håller gruppen
 * utanför statistiken; voteringssidan ska tvärtom skriva ut att partiet inte
 * var på plats. Fallet inträffar 101 gånger av 22 786 — alla i gruppen `-`,
 * de partilösa, som PARTIER inte innehåller och gränssnittet därför aldrig
 * frågar om. För de åtta partierna har det aldrig hänt: 0 av 20 552.
 */
export function partilinje(r: Omit<PartiRost, 'parti' | 'linje'>): Linje {
  const avlagda: [Linje, number][] = [
    ['Ja', r.ja], ['Nej', r.nej], ['Avstår', r.avstar],
  ]
  const bast = avlagda.sort((a, b) => b[1] - a[1])[0]
  // Bara om ingen enda ledamot röstade är frånvaro partiets faktiska hållning.
  return bast[1] > 0 ? bast[0] : 'Frånvarande'
}

/**
 * Ett partis linje i en votering, eller undefined om partiet saknas i raderna.
 *
 * Uppslagningen "hitta partiets rad, kör partilinje()" fanns i fyra
 * stavningar med fyra olika hanteringar av en rad som saknas. Den är den
 * operation `npm run kontrollera` finns för att skydda, och då ska den ha ett
 * utförande.
 */
export function linje(roster: Rost[], parti: string): Linje | undefined {
  const r = roster.find((x) => x.parti === parti)
  return r ? partilinje(r) : undefined
}

/**
 * Röstade M, KD och L likadant i den här voteringen?
 *
 * `CLAUDE.md`: namnges ett av de tre gäller fyndet alla tre, och förbehållet
 * ska stå bredvid siffran. Regeln gäller hela sajten, så härledningen ligger
 * här och inte i en sida — frågesidan och quizet räknade fram den var för sig,
 * och en tredje sida som namnger ett av dem hade blivit en tredje kopia utan
 * något som håller dem i takt.
 *
 * Svaret är `lika: false` om något av de tre saknas i raderna. Att kalla ett
 * bortfall för likhet vore att påstå ett samförstånd som inte är mätt.
 */
export function regeringslikhet(roster: Rost[]): { lika: boolean; linje?: Linje } {
  const linjer = REGERINGSPARTIERNA.map((p) => linje(roster, p))
  const forst = linjer[0]
  const lika = forst !== undefined && linjer.every((l) => l === forst)
  return lika ? { lika, linje: forst } : { lika: false }
}
