/**
 * Svensk text: riksdagens entiteter avkodade, och små tal som ord.
 *
 * De två delarna har ingen koppling till varandra utöver att båda är rena
 * strängfunktioner utan beroenden. Det är också hela poängen med filen —
 * `rakneord()` flyttade hit från `lib/fragor.ts` när quizet på `/rosta` behövde
 * den i webbläsaren, och `lib/fragor` hänger i `lib/db` och därmed i
 * supabase-js.
 *
 * ## Entiteterna
 *
 * `forslagspunkt.forslag` levereras från data.riksdagen.se med entiteter i
 * stället för tecken: `f&ouml;rslag`, `1 kap. 6 &sect;`, `&#160;`. React
 * escapar `&` när det renderar text, så strängen visades ordagrant på
 * voteringssidan i stället för att bli "förslag" och "§".
 *
 * 742 av 8 977 förslag innehåller entiteter. `reservation.text`, `rubrik`,
 * `betankande.titel` och klarspråkstexterna är rena i dag, men kommer från
 * samma källa och avkodas därför också — det kostar ingenting på en sträng
 * utan entiteter.
 *
 * Avkodningen är avsiktligt textbaserad och inte HTML-tolkning: fälten
 * innehåller inga taggar alls (kontrollerat: 0 av 8 977 respektive 0 av
 * 11 274), och `dangerouslySetInnerHTML` på text från en extern källa vore
 * fel pris för att slippa den här funktionen.
 */

/**
 * Bara de namngivna entiteter som förekommer, plus de fem som alltid kan dyka
 * upp i XML. Okända namn lämnas orörda — en trasig entitet ska synas som det
 * den är, inte tyst bli fel tecken.
 */
const NAMNGIVNA: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  auml: 'ä', ouml: 'ö', aring: 'å',
  Auml: 'Ä', Ouml: 'Ö', Aring: 'Å',
  eacute: 'é', agrave: 'à', sect: '§',
}

/**
 * Ett enda svep över strängen, inte en kedja av replace().
 *
 * Kedjan hade avkodat `&amp;ouml;` två gånger och gjort om den bokstavliga
 * texten "&ouml;" till ett ö.
 */
export function avkoda(text: string): string
export function avkoda(text: null | undefined): undefined
export function avkoda(text: string | null | undefined): string | undefined
export function avkoda(text: string | null | undefined): string | undefined {
  if (text == null) return undefined
  return text.replace(/&(#[Xx][0-9A-Fa-f]+|#\d+|[A-Za-z][A-Za-z0-9]*);/g, (hel, kropp: string) => {
    if (kropp[0] !== '#') return NAMNGIVNA[kropp] ?? hel
    const kod =
      kropp[1] === 'x' || kropp[1] === 'X'
        ? Number.parseInt(kropp.slice(2), 16)
        : Number.parseInt(kropp.slice(1), 10)
    // Ogiltiga kodpunkter lämnas som de står i stället för att kasta.
    if (!Number.isFinite(kod) || kod < 1 || kod > 0x10ffff) return hel
    return String.fromCodePoint(kod)
  })
}

const RAKNEORD = [
  'noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex',
  'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv',
]

/**
 * Små tal som ord: 9 → "nio".
 *
 * Finns därför att sidorna säger "nio frågor" i löpande text, och ordet skulle
 * annars stå skrivet för hand på fyra ställen. Faller en fråga vid en
 * granskning ska sidan sluta lova nio av sig själv — en hårdkodad mening blir
 * tyst osann, och just den här är sajtens känsligaste: hela dess trovärdighet
 * ligger i att den stannar vid det den kan belägga.
 *
 * Över tolv faller den tillbaka på siffran. Svenska räkneord blir
 * sammansättningar däröver, och en lista som växer förbi tolv är en annan
 * produkt än den här.
 */
export function rakneord(n: number) {
  return RAKNEORD[n] ?? String(n)
}

/**
 * "nio" → "Nio".
 *
 * Finns därför att `rakneord()` alltid ger gemener medan flera meningar börjar
 * med talet. Låg fram till nu som en lokal hjälpfunktion i `app/fragor/page.tsx`
 * och behövdes på ett andra ställe när quizet skulle skriva "Ett av åtta
 * partier röstade som du."
 */
export function storBokstav(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
