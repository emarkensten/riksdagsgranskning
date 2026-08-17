# Plan: sajten inför valet 2026

**Datum:** 2026-08-17, omskriven samma dag efter motläsning.
**Valet:** 13 september — 27 dagar.

Planens första version motiverade allt med att sajten skulle komplettera
valkompasser. Den motiveringen höll inte och är utbytt. Vad som ändrades och
varför står under *Premissen som föll*, eftersom arbetspaketen i allt väsentligt
står kvar och det annars ser ut som om ingenting hänt.

---

## Vad sajten är, och vad framgång betyder

Sajten gör Sveriges riksdags 2 587 beslut från mandatperioden 2022–2026
läsbara: vad frågan gällde, vad ett ja innebar, vad ett nej innebar, och varje
partis linje.

**Det är ett referensverk, inte en produkt med återvändande användare.** Ingen
har ett återkommande behov av att veta hur riksdagen röstade, och datan är
dessutom i praktiken färdig — mandatperioden är slut och det kommer inga nya
voteringar före valet. Att optimera för återbesök vore att bygga fel sak.

Framgång är i stället att bli **använd som källa**: en journalist som länkar en
voteringssida i en valartikel, en lärare i samhällskunskap, en tråd som avgörs
med en länk. En enda redaktionell användning är värd mer än tiotusen
ströbesök — och `/metod`, som redovisar sju begränsningar och ett mätförsök som
inte höll, är byggd för precis den läsaren.

Konsekvensen: sajtens enhet är **den enskilda sidan som landningssida via delad
länk**, inte startsidan.

---

## Premissen som föll

Valkompassen spelade tre roller i den första planen. De faller inte ihop, och
det är skälet till att arbetspaketen står kvar:

| Roll | Status |
|---|---|
| **Trafikväg** — "gör kompassen, kolla facit" | **Död.** Ingen lämnar SVT:s resultatsida för att söka upp en okänd sajt. |
| **Urvalskälla** för frågesidornas ämnen | **Lever**, och blir starkare utan trafikpremissen. Argumentet var aldrig marknadsföring utan metodskydd: urvalet är någon annans, inte vårt. Det är oberoende av var besökaren kommer ifrån. |
| **Förklaringsreferens** i copy | **Lever, men som aktivt beslut.** Alla vet vad en valkompass är, så kontrasten förklarar sajten på en rad utan att förutsätta trafik. Behålls med öppna ögon, inte som kvarleva. |

**Frågesidornas riktiga motivering** stod redan i
[`BESLUT_2026-08.md`](BESLUT_2026-08.md): *ingen kan svara på "hur röstade mitt
parti om X?"* — datan finns öppet men är praktiskt oåtkomlig, eftersom man måste
veta vilket betänkande frågan låg i, vilken punkt, och hur utskottets förslag
tolkas mot reservationen. Det är ett faktaåtkomstproblem, inte ett
omdömesproblem. Utan kompasstrafik blir frågesidorna **viktigare**, inte
mindre: de är den enda ingången för besökaren som inte kommer med en färdig
fråga, och sajtens enda tänkbara sökmotoryta.

Deadlinelogiken föll med trafikpremissen. Kvar står valet självt. Det ändrar
inget i praktiken — bygg ändå nu — men "klart innan kompasserna landar" var fel
skäl.

---

## Arbetspaket

### AP0 — Namn och domän. Blockerar mest, ligger först

Låg sist i första versionen. Det var fel ordning: **varje länk som delas till
`riksdagsgranskning.vercel.app` pekar fel den dag domänen byts.** Sociala kort
cachas, omdirigeringar tappar delningsstatistik, och citerbarheten — sajtens
hela framgångsmodell — bygger på en adress som håller.

Kräver ett personligt beslut av ägaren och har därför längst ledtid av allt.
Namnet ska stå på egna ben utan koppling till valkompasser.

När namnet är satt byter allt i ett svep: ordmärket i `app/layout.tsx`,
`lib/sajt.ts`, delningsbilderna och de kanoniska URL:erna. Kontrollera mot
produktionssajten, inte lokalt.

### AP1 — Vändningen ✅ GENOMFÖRD (PR #69)

Sökningen är startsida, fynden ligger på `/fynd`, navigeringen gick från sju
objekt till fyra. Taggen `magasinet` pekar på tillståndet före.

Motläsningen bekräftade att flytten var rätt, och skälet är värt att skriva ned:
kollegan felläste "556 gånger ensam mot alla" **trots att förbehållet stod på
sidan**. Ett förbehåll som inte hinner ikapp siffran hos en välvillig
förstaläsare hinner aldrig ikapp den. Aggregat som första möte ramar in sajten
som en partiranking, och ur den ramen går det inte att skriva sig. Det var
alltså ett arkitekturproblem, inte ett presentationsproblem.

Kvarstående brist: chipsen på roten är 16 byråkratiska ämneskategorier, inte
frågor som väljare bär dem. Startsidan är en halv entrédörr tills AP2 finns.

### AP2 — Frågesidorna

Ny sidtyp `/fragor/[slug]`: rubrik som frågan bärs av en väljare, kort syntes,
de relevanta voteringarna med `Rostrad` och klarspråk, länk till sökningen.

Urvalet lånas från SVT:s valkompass (35 frågor, publicerad 10 juni 2026) och
lagras som versionerad JSON i `lib/valfragor/` — slug, rubrik, källa, lista av
`forslagspunkt_id`, syntestext. Ingen ny ETL, inget nytt i databasen. **Skriv
inte av SVT:s frågetexter** — vi lånar urvalet, inte formuleringarna, och
länkar källan.

**Mätt 2026-08-17.** 24 av 35 frågor har minst en votering som handlar om samma
sak, 28 med generösare linje, 7 har noll. Men **bara en enda fråga har fem eller
fler** — de flesta har en till fyra, ofta exakt en. Fem påstådda exakta träffar
är stickprovade mot databasen och höll ordagrant: marknadshyror (7874), statligt
sjukvårdsansvar (3107), DCA-avtalet (4674), reserverade föräldrapenningdagar
(5463), permanent uppehållstillstånd (3557).

Planens antagande om 15–25 sidor med flera voteringar var är därmed falsifierat.
**Sidan bär på en enda votering** — om den slutar tänkas som en magasinssida. En
ordagrann träff slår fem ungefärliga när målet är citerbarhet, och den journalist
som söker "hur röstade partierna om marknadshyror" vill ha det ena exakta
beslutet.

Två villkor följer:

- **Padda inte.** Frestelsen på en-voteringssidor är att fylla ut med
  närliggande voteringar. Det flyttar bara hårfinhetsproblemet till urvalet.
  Hellre en träff plus "detta är den enda gång riksdagen tagit ställning till
  exakt detta" — det stycket är i sig ett fynd.
- **Behåll nollsidorna.** För de sju frågorna är svaret plus förklaringen varför
  (regeringens gärning ligger i propositioner utan namnupprop) hela sidan.

**Grind före omfattningen låses: adversariellt motbevisningspass.** Mätningen
verifierade toppen, inte marginalen — och inte *riktningen*. Att ett ja i
voteringen motsvarar ett instämmande i kompassfrågan är oprövat, och
utskottsförslag-mot-reservation gör riktningen tvetydig oftare än ämnet.
Lager 3 hade exakt samma form: bländande exempelfall som föll 9 av 9 när någon
fick i uppdrag att motbevisa dem. Kör motbevisningen på de svagaste träffarna
och på riktningsmappningen innan sidantalet bestäms. Talet 24 kan visa sig vara
10.

**Hederlighetsregler:**

- Saknas votering skrivs det ut. Det är också ett svar.
- **Propositionsasymmetrin ska stå på sidan, före listan** — inte bara på
  metodsidan. Regeringens gärning ligger till stor del i propositioner utan
  namnupprop medan oppositionens syns som reservationer, så en frågesida
  riskerar att systematiskt visa mer av oppositionens aktivitet. Inte genom
  partiskhet utan genom datans form. Det är här en statsvetare angriper, och
  samma läxa som förbehållsplaceringen i AP1: efter listan är för sent.
- `sakerhet`-flaggan följer med raden som i arkivet.
- Frågesidorna behöver delningsbilder.

### AP3 — Innehållspipeline

Sonnet-subagenter, aldrig betalt API. Arbetar på sajtens egna redan validerade
klarspråkstexter, inte på rådata.

**A. Kandidatmatchning** — agenter föreslår voteringar per fråga. Människan
fastställer listan.

**B. Syntes** — 5–10 meningar per fråga, enbart de fastställda voteringarnas
klarspråk som underlag. Varje påstående spårbart till en votering som listas på
samma sida. Ingen partikaraktäristik — voteringsraderna visar positionerna
själva. Syntes på valfrågenivå, inte ämnesnivå.

**C. Adversariell granskning** — en andra agent fäller allt underlaget inte
täcker.

Valideringsgrind: tre sidor genom hela kedjan, manuell granskning, sedan skala.
Prompterna sparas i repot.

**Förbjudet:** ingen återupplivning av "sagt mot röstat" i någon form, ingen
intentionsklassificering, ingen syntes utan voteringslistan som kvitto bredvid.

### AP4 — Distribution

**Saknades helt i första versionen.** Fem arbetspaket, noll rader om hur någon
ska få veta att sajten finns — för ett referensverk vars värdefönster är fyra
veckor. Arbetssättet förstärkte luckan: "merga och fortsätt" optimerar för
levererade PR:ar, och PR:ar är alltid kod.

Detta är sannolikt det som ger mest per nedlagd timme av allt som återstår, och
det kräver inte ombyggnad — det kräver mejl. Innehåll: tio färdigverifierade
fynd paketerade med metodunderlag, och kontakt med samhällsredaktioner,
statsvetare och lärare. Förutsätter AP0.

### AP5 — Instrumentering

**Sajten har ingen webbanalys alls.** Vercel Web Analytics är inte påslaget.
Både planens ursprungliga trafikpremiss och invändningen mot den var oprövade
åsikter, och ingendera gick att avgöra eftersom ingenting mäts. Ungefär en
timmes arbete, och det förvandlar nästa strategidiskussion från gissning mot
gissning till data. Gör det innan valrörelsen tar fart.

### AP6 — Demotering och navigation

`/samstammighet`, `/blocken`, `/amnen` och `/franvaro` nås från "Hela
genomgången" på `/fynd`. Genomförd i AP1. Inget raderat.

---

## Öppen fråga med lång ledtid: avsändarskapet

Behandlades som en fotnot och är den största enskilda risken. En designbyrå som
sätter sitt namn på en politisk datasajt fyra veckor före ett val fattar ett
beslut med kund-, varumärkes- och pressdimensioner — "vem ligger bakom sajten?"
är den första fråga en journalist ställer. Sidfoten säger i dag partipolitiskt
obunden, privat initiativ; att byta avsändare mitt i valrörelsen är i sig en
story.

Beslutet behöver fattas med arbetsgivaren nu, eller skjutas till efter valet.
Det får inte hänga löst.

---

## Utanför scope

- Ledamotssidor (0,139 % avvikelse — ingen population att jämföra)
- Innehållsanalys av anföranden (cirkulär, se `LAGE_2026-08.md`)
- Ny ETL eller nya databastabeller
- Redesign av det visuella språket
- Berättelsesajt / scrollytelling kring ett enskilt fynd. Det är
  trafikmaximering, och valet mellan trafik och trovärdighet är fattat till
  trovärdighetens fördel — särskilt medan avsändarfrågan är öppen. Ett oprövat
  verktyg som pekar ut partier dagarna före ett val är en trovärdighetsrisk, och
  kollegans felläsning är en förhandsvisning av vad en masspublik gör med ett
  fynd.

### Löfte mot handling med 2022 års valkompass — prövat och avvisat 2026-08-17

Idén var att använda frågorna från valet 2022 i stället för 2026 års, eftersom
det var dem partierna gick till val på inför den mandatperiod vi har röstdata
för. Löfte 2022 → handling 2022–2026, en sluten cirkel. SVT:s kompass från 2022
ligger kvar med partiernas fullständiga svar och fritextmotiveringar, så det är
tekniskt möjligt. Det ska ändå inte byggas.

**Fällan sitter i påståendet, inte i datat.** En sida med 2026 års fråga och de
voteringar som finns gör ett faktaåtkomstpåstående. En sida som ställer partiets
2022-svar *bredvid* dess röster gör ett hyckleripåstående genom själva
sammanställningen, även utan uträknad etikett. Läsaren drar slutsatsen åt oss,
och ibland fel — reservationsfällan syns inte i en `Rostrad`. Facit finns redan:
kollegan felläste "556 gånger ensam mot alla" trots förbehåll på sidan.

**Ett A–D-svar renar sagt-sidan men inte votering-sidan.** Flera av
avfärdningsgrunderna i [`VALIDERING.md`](VALIDERING.md) — reservationen innehöll
mer än som begärdes, frågan hanterades i annan ordning, voteringsordningen vid
flera reservationer — ligger på voteringssidan av bron. Den hårfina bedömningen
flyttas från klassificering till mappning, den försvinner inte.

**Koalitionsinvändningen.** Ett parti som svarade A och sedan förhandlade
Tidöavtalet har inte ljugit, det har regerat. Och eftersom M, KD och L röstar
lika i 99,9–100 % skulle spåret hitta tre partier som bryter identiska löften
identiskt — ett fynd, Tidöavtalet, omförpackat som trefaldigt hyckleri.

**Rättigheterna.** Partisvaren och motiveringarna är insamlade och sammanställda
av SVT, hämtade ur interna dataendpoints och skulle versioneras i ett publikt
repo. "Vi trodde det var fritt" finns inte som position. Sajtens enda valuta är
att kunna citeras av journalister, alltså exakt den publik som bryr sig om
varifrån materialet kommer. Spåret och ett Antrop-avsändarskap utesluter
varandra.

**Vad som överlever:** instinkten är rätt, tidpunkten fel. Dokumentera 2026 års
frågeurval nu och bygg löftesuppföljningen under *nästa* mandatperiod, med tid
för rättighetsklarering, en koalitionsmodell och en metod som tål granskning.
Ska en löftessida ändå byggas är rätt källa partiernas egna valmanifest — deras
ord, publicerade för spridning — inte SVT:s sammanställning.

## Fallgropar

`CLAUDE.md` gäller: M/KD/L-förbehållet överallt där ett av dem namnges,
frånvarons två nivåer blandas inte, `nej > ja`-aritmetiken och inte
`vinnare`-fältet, Supabase MCP för all verifiering, `npm run kontrollera` efter
varje ändring som rör partilinjen.

**Och en till, dyrköpt:** premisser antas i stället för mätas. Trafikvägen från
valkompass antogs utan prövning — men motbilden är också en oprövad åsikt som
nu behandlas som fakta. Mät i stället, se AP5.
