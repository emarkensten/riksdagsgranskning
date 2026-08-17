# Plan: från magasin till verktyg inför valet 2026

**Datum:** 2026-08-17. **Valet:** 13 september — 27 dagar bort.
Valkompasserna publiceras ungefär två–tre veckor före valdagen. Sajten ska vara
omgjord och namngiven **innan** de landar, för hela poängen är "gör kompassen,
kolla facit". Riktmärke: klart inom två veckor.

Planen är grov med avsikt. Den som bygger avgör detaljerna, men riktningen och
gränserna nedan ligger fast.

---

## Beslutet planen bygger på

**Målgrupp:** väljaren som redan letar belägg — den som gör valkompassen, ser
debatterna och vill pröva ett påstående mot protokollet. Journalisten är samma
användare med högre insatser, och distributionskanalen.

**Behovet:** kompasserna mäter vad partierna *säger* framåt. Ingen visar vad de
*gjorde*. Sajtens unika tillgång — 2 587 beslut i klarspråk med reservationens
innehåll utskrivet — svarar exakt på det, men arkitekturen döljer den:
ingången är i dag aggregatstatistik som inbjuder till övertolkning (prövat på
en verklig förstaläsare, som läste "ensam mot alla" som att C är radikala),
medan verktyget ligger som sekundär knapp.

**Tesen som ramar sajten**, ren aritmetik ur egen databas: 0,139 % av rösterna
avviker från partilinjen — i Sverige röstar man på en linje, inte en person,
och linjens fyra års facit finns här. M, KD och L röstade lika i 99,9–100 %:
tre partier, ett röstfacit.

---

## Arbetspaket

Små avgränsade PR:ar enligt arbetsreglerna. Ordningen nedan är beroendeordning.

### 1. Vändningen — sökningen blir startsidan

`/voteringar`-sidans innehåll blir roten `/`. Överst en mening som säger vad
man får (i stil med *"Valkompassen frågar vad partierna lovar. Här ser du hur
de röstade."*), därunder sökfält, ämneschips och listan med partilinjer per
rad — allt detta finns redan byggt och behöver flyttas, inte uppfinnas.

Nuvarande startsida flyttar till `/fynd` i sin helhet. Fynden är fortsatt det
som delas i flöden, men de ska vara något man hittar, inte det första man
möter. Tesen (0,139 % / M-KD-L) skrivs in på nya startsidan och på `/metod`.

Observera: roten blir då dynamisk (searchParams), som `/voteringar` redan är.
`votering_lista`-frågorna är snabba; tresekundersregeln gäller som vanligt.

### 2. Frågesidorna — det saknade mellanlagret

Ny sidtyp `/fragor/[slug]`: en sida per valfråga ("Kärnkraften",
"Beteskravet", "Skolpengen" …), 15–25 stycken. Varje sida är i grunden en
kuraterad delmängd av arkivet:

- rubrik = frågan som väljaren bär den
- kort syntes av vad riksdagen beslutat i frågan (se innehållspipelinen)
- de relevanta voteringarna med `Rostrad` och klarspråk — samma listrad som
  arkivet använder
- länk till fritextsökningen för den som vill se allt

**Urvalsregeln görs transparent och lånas utifrån:** frågorna hämtas ur
SVT:s och/eller DN:s valkompass när de publicerats, med källan länkad — då är
urvalet någon annans, inte sajtens. Tills kompasserna är ute byggs
infrastrukturen och pilotfrågorna på uppenbara kandidater (energi, migration,
skola, vård, försvar, jordbruk/djurskydd).

Urvalet lagras som versionerad JSON i repot (`lib/valfragor/…`): slug, rubrik,
källa, lista av `forslagspunkt_id`, syntestext. Ingen ny ETL, inget nytt i
databasen — innehållet är granskningsbart i git och kostar inget av de
återstående databas-megabytena.

**Hederlighetsregler för sidtypen:**

- Finns ingen votering i kompassfrågan skrivs det ut: *"Riksdagen har inte
  röstat om exakt detta 2022–2026."* Det är också ett svar, och det skiljer
  sajten från varje partisk sammanställning.
- Asymmetrin skrivs ut där den spelar roll: regeringspartier vinner via
  propositioner, så voteringarna visar vad som hände — inte allt partierna
  önskade.
- `sakerhet`-flaggan ("osäker tolkning") följer med raden precis som i arkivet.
- Frågesidorna behöver delningsbilder som voteringssidorna redan har.

### 3. Innehållspipeline — så används LLM, och så inte

Syntesen och kandidaturvalet är legitima LLM-uppgifter därför att de arbetar
på sajtens *egna redan validerade klarspråkstexter*, inte på rådata eller
intentioner. Körs med **Sonnet-subagenter, aldrig betalt API** (se minnet och
arbetsregel 7–8).

**Steg A — kandidatmatchning.** Agenter läser `sakfraga` + klarspråk för alla
2 587 punkter och föreslår kandidater per valfråga. Det är en sökuppgift
(recall), som LLM är bra på. Utfallet är ett *förslag*; människan fastställer
listan som hamnar i JSON.

**Steg B — syntes per fråga.** En agent skriver 5–10 meningar om vad riksdagen
beslutat i frågan, med enbart de fastställda voteringarnas klarspråk som
underlag. Regler:

- Varje påstående ska vara spårbart till en votering som listas på samma sida.
  Syntesen refererar, den tillför inte.
- Ingen karaktäristik av partier ("X har konsekvent motarbetat…") — partiernas
  positioner visas av voteringsraderna själva. Syntesen beskriver besluten.
- Syntes på **valfrågenivå** (10–40 voteringar), inte ämnesnivå — en syntes
  över 400 voteringar i "utrikes" blir mos.

**Steg C — adversariell granskning.** En andra agent får syntesen och
voteringslistan med uppdraget att fälla varje påstående som inte täcks av
underlaget. Det som inte överlever stryks.

**Valideringsgrind, samma logik som arbetsregel 8:** bygg de tre första
frågesidorna genom hela pipelinen, granska manuellt, och skala först därefter
till resten. Prompterna sparas i repot så att omkörningar är reproducerbara.

**Förbjudet, med stöd i projektets historia:** ingen återupplivning av
"sagt mot röstat" i någon form (körd i botten, se `LAGE_2026-08.md`), ingen
intentionsklassificering, ingen syntes som publiceras utan voteringslistan
som kvitto bredvid sig.

### 4. Demotering och navigation

`/samstammighet`, `/blocken`, `/amnen` (avvikelsestatistiken) och `/franvaro`
samlas under fynden i navigationen — inget raderas, men magasinet slutar vara
fasaden. `/metod` behåller sin framskjutna plats; den är trovärdighetsbäraren,
särskilt om Antrop blir avsändare. Redirects för alla flyttade sökvägar
(mönstret med 308 finns redan för `/spanningar`).

### 5. Namn, domän, delning

Erik köper domän nu — det är hans beslut och ligger utanför repot, men allt
sidmetadata-arbete (`lib/sajt.ts`, delningsbilder, kanoniska URL:ar) ska byta
när namnet är satt. Arbetsnamn: **"Så röstade de"**. "Namnupprop" säger
utomstående ingenting; namn som lovar fullständighet ("Full transparens")
skriver checkar metodsidan uttryckligen inte täcker. Kontrollera delning mot
produktionssajten, inte lokalt (två av tre delningsbuggar var osynliga i dev).

---

## Designbrief

**Det estetiska språket ligger fast** — display-typografin, stora siffror,
hårlinjerna, lime-accenten, mono-etiketterna. Det är inte det som är fel.
Felet är hierarki: verktyget är sekundärt och magasinet är hero. Bygget görs
med `/frontend-design` och/eller `/impeccable` enligt arbetsreglerna, med
detta som uppdrag:

- **Nya startsidan:** ett sökfält som känns som en hero, inte som ett
  formulär. Display-rubriken och stig-animationerna får gärna bäras över från
  nuvarande startsida; tesen står som en rad under sökfältet, inte som ett
  eget statistikblock. Frågesidorna exponeras som ingångar direkt på roten
  (chips eller kortrad) så att en förstabesökare ser dem utan att söka.
- **Frågesidan (ny mall):** rubriken är frågan, syntesen är bröd, listan är
  samma rad som arkivet. Ingen ny komponentflora — `Rostrad`, `Chip`,
  `Etikett`, `Forbehall` räcker långt.
- **Fynden på `/fynd`:** behåller sin nuvarande design orörd.
- Lärdomen från förstaläsaren gäller layouten: förbehåll som står *efter*
  siffran hinner aldrig ikapp den. Där ett aggregat visas ska ramen stå före
  eller bredvid, inte under.

---

## Utanför scope

- Ledamotssidor (0,139 % — ingen population att jämföra)
- Innehållsanalys av anföranden (cirkulär, se `LAGE_2026-08.md`)
- Ny ETL eller nya databastabeller
- Redesign av det visuella språket

## Fallgropar

`CLAUDE.md` gäller: M/KD/L-förbehållet överallt där ett av dem namnges,
frånvarons två nivåer blandas inte, `nej > ja`-aritmetiken och inte
`vinnare`-fältet, Supabase MCP för all verifiering, `npm run kontrollera`
efter varje ändring som rör partilinjen.
