# Plan efter granskning

> **Genomförd 2026-08-15.** Alla åtta punkter är byggda och mergade i PR #13–#21.
> Se [`LAGE_2026-08.md`](LAGE_2026-08.md) för vad sajten är i dag och vad som
> återstår. Det här dokumentet står kvar som underlag — det beskriver varför
> sidorna ser ut som de gör.

**Datum:** 2026-08-15

Omvinklingen till mönster-först är levererad i PR #5–#7. Den här planen bygger
på en extern granskning av innehåll och utförande, kontrollerad mot databasen
punkt för punkt.

---

## Läget

Sex sidor: `/` (fem siffror), `/amnen`, `/samstammighet`, `/voteringar`,
`/franvaro`, `/spanningar`. Databasen är 407 MB av gratisplanens 500 efter att
tre oanvända index släppts. Inga LLM-anrop behövs för något nedan.

Fem fel som sajten själv motsade är redan lagade i PR #10 — bland dem påståendet
att underlaget var 339 voteringar i stället för 2 569, som satt i just det
stycke som ska bevisa noggrannhet.

---

## Vad granskningen påstod som inte höll

Skrivs ut därför att båda är fällor som ser rimliga ut.

**"Voteringslistans rubrik är osann."** Den påstod "Riksmötet 2024/25" utan
riksmötesfilter. Kontroll mot databasen: alla 120 första förslagspunkterna
kommer faktiskt från 2024/25. Rubriken var sann — men bara av en slump i
id-ordningen, och hade gått sönder tyst. Lagad ändå, av det skälet.

**"Reservationerna ger partisidan positivt innehåll."** Antal reservationer per
parti: MP 3 510, C 3 011, V 2 803, S 2 760, SD 1 755, KD 14, M 11, L 10.
Regeringspartierna skriver knappt några, eftersom de *är* utskottsmajoriteten.
En rad som "Partiets alternativ: 11 reservationer" bredvid MP:s 3 510 läses som
aktivitet när den mäter maktposition. Samma strukturella fälla som nollorna i
"ensam mot alla". Användbart — men bara med förklaringen bredvid, och aldrig som
rangordning.

**"Cirka 8–10 ämnen har en avvikelse värd full behandling."** Fördelningen
faller jämnt från −23,0 till −9,5 och bryter sedan tvärt: rättsväsende −3,0,
konstitution och demokrati −1,1. Det är **två** svaga ämnen, inte åtta.

---

## Planen

### NU

**1. En riktig metodsida på `/metod`.**
Navigationen säger METOD och öppnar en essä som heter "Vi letade efter
hyckleri". Essän är bra och ska vara kvar, men en granskare som vill veta hur
"partilinje" definieras hittar det i dag bara i en fotnot på ämnessidan.

Sidan ska samla: datakälla och hämtningsdatum; definitionen av partilinje
(majoriteten av närvarande, avstår som egen linje); hur samstämmighet räknas;
vad "ensam mot alla" kräver; hur ämnesklassningen gjorts och av vilken modell;
att utskottets förslag ställs som ja; kända begränsningar (kvittning, att M, KD
och L är utbytbara, att acklamationsbeslut saknar röstdata, att utskottsförluster
inte syns); och en väg att anmäla fel. Hyckleri-essän blir sista avsnittet.

Det här är sidan som gör resten försvarbar. Den ska byggas före partisidorna.

**2. Startsidans femte siffra leder med fel tal.**
"111" är antalet jämna voteringar; nyheten är de **12** som kunnat sluta
annorlunda. Punkt 4 och 5 länkar dessutom båda till `/franvaro`.

Byt till: **12** / "voteringar hade kunnat sluta annorlunda om alla frånvarande
röstat med sitt parti — av 111 som avgjordes med tre rösters marginal eller
mindre." Kvittningsnoten står kvar.

### SNART

**3. Partisidor, `/partier` och `/partier/[parti]`.**
Beslutad. "Partier" läggs först i navigationen — det är den ingång flest söker.

Varje sida: samstämmighet mot de sju andra; samstämmighet per ämne med partiets
egen normalnivå som referens; de gånger partiet stod ensamt, med exempel;
frånvaro mot kammarsnittet, inte bara partiets eget tal.

Två saker sidan måste bära för att inte bli missvisande:

- **M, KD och L öppnar med förbehållet.** Utan det blir tre av åtta sidor
  närmast identiska och ser trasiga ut.
- **Reservationerna, om de tas med, bär sin förklaring.** Se ovan. Alternativt
  utelämnas de från partisidan och används i stället på voteringens detaljvy,
  där de redan hör hemma.

**4. Voteringslistan blir en riktig ingång.**
Sajtens största tillgång — 2 587 beslut förklarade på vanlig svenska — ligger i
en blek verktygslista. Den behöver paginering (i dag kapas den vid 120),
riksmötesfilter, och en hero i samma skala som startsidan.

**5. Frånvarosidan.**
Herosiffran står i 16 px brödtext på en sida vars hela poäng är en siffra — den
ska vara display i startsidans skala. Sidan visar bara 2025/26, så den som
klickar från startsidans 13,4 % landar på 10,6 % utan förklaring: visa alla fyra
riksmöten plus totalen. Skriv också ut halvtidsfiltret, som i dag bara finns i
koden.

**6. Samstämmighetssidan.**
"L och M röstade lika i 2 569 av 2 569" är sajtens starkaste siffra och står i
16 px i en citatram. Den ska vara sidans största element. Matrisen kan växa —
högerhalvan av desktopytan står tom. En metodrad vid matrisen om vad "samma
linje" betyder, med länk till `/metod`.

**7. Ämnessidan.**
De två ämnena under 5 procentenheter (rättsväsende, konstitution) ska inte få
samma jättesiffra som näringslivs −23,0 — en display-siffra på "−1,1" är
motsatsen till trovärdighet. Fäll ihop dem till kompakta rader.

Skriv också om siffran: "−19,9" med minustecken läses som ett fel. Sätt "19,9"
med etiketten "procentenheter lägre än normalt".

Sidan är 15 000 px hög. Överväg att lägga exemplen bakom `<details>` för alla
utom de tre översta ämnena.

### SEN

**8. Anföranden per votering på detaljvyn.**
Join via `anforande.rel_dok_id` → `votering.dok_id`, verifierad sedan tidigare.
"Läs debatten — 14 anföranden." Ren SQL, ingen kostnad. Stärker källkänslan utan
att tolka. All summering av de 56 177 anförandena kräver LLM-batch, alltså
kostnadsuppskattning och valideringsrunda enligt arbetsreglerna — inte nu.

**9. Copy-strykningar.**
- "Partiets samlade frånvaro säger mer om **partikulturen**" — partikultur är
  en tolkning sajten annars förbjuder sig. Skriv "Partiets samlade siffra är
  stabilare än enskilda ledamöters."
- "Vilket av dem som hamnar i meningen avgörs dock av tiondelar" — krångligt.
  "Vilket av de tre som står här avgörs av tiondelar."
- "mest grundläggande uppgift" står på två sidor. Behåll på frånvarosidan.

---

## Kandidat som behöver ett beslut

**Regeringssidans linje vann i 2 558 av 2 569 voteringar (99,6 %).** Verifierat.
Siffran finns ingenstans på sajten, och den svarar på en fråga medborgare
faktiskt ställer: fick regeringen igenom sin politik?

Problemet är att den är nästan strukturell. Utskottsmajoriteten *är*
regeringssidan, så att dess linje vinner är ungefär samma påstående som att
utskottets förslag vinner. Publicerad utan den förklaringen ser den ut som ett
fynd; med förklaringen är den en beskrivning av hur riksdagen fungerar — vilket
i sig är värt att veta för den som inte visste det.

Rekommendation: ta med den, men på `/metod` eller som en förklarande sektion,
inte som en av startsidans fem siffror.

---

## Databasen

407 MB av 500 efter städningen. Varje nytt riksmöte lägger till ungefär 71 MB,
så gratisplanen rymmer **ett** till.

Byt inte leverantör. 1 000-radersgränsen som bitit projektet tre gånger är
PostgREST:s `db-max-rows` och följer med överallt; den höjs i projektets
API-inställningar eller kringgås med direktanslutning. När utrymmet tar slut är
beslutet Supabase Pro, 8 GB för 25 dollar i månaden.

`anforande.text` (43 MB) rörs inte. Den används bara av lager 3-spåret, men är
medvetet sparat verifieringsunderlag.
