# Formspråk

Sanningen bor i `app/globals.css` och i sidorna under `app/`. Det här dokumentet
beskriver dem, och ska rättas när koden ändras — inte tvärtom.

---

## Idén

Sajten ska läsas som en välgjord tidningsbilaga om riksdagen, inte som ett
dashboard. Därför **linjer i stället för kort**, varmt papper i stället för vitt,
och en enda skarp accent.

Det är ett granskningsprojekt. Gränssnittet får aldrig se ut att ta ställning,
och varje siffra måste kunna spåras till sitt underlag.

---

## De tre reglerna som är lätta att bryta av misstag

### 1. Partifärger är data, aldrig dekor

`PARTIFARG` i `lib/db.ts` finns för att avkoda vilket parti en rad gäller. Den
får sitta i en smal understrykning eller en markör intill förkortningen.

Den får **inte** användas för att färglägga en yta, en rubrik eller ett
diagram där färgen inte betyder "det här partiet". I samstämmighetsmatrisen
mäts *relationen* mellan partier, och där används accentskalan — inte
partifärger — just därför att ingendera parten äger relationen.

Röstfärgerna (`--ja`, `--nej`, `--avstar`, `--franvarande`) lyder samma regel:
de kodar en röst, inget annat. `--nej` och `--accent` har samma värde i ljust
läge, vilket är avsiktligt — men det gör det extra viktigt att inte färga något
rött som inte är ett nej.

### 2. Varje siffra bär sitt förbehåll bredvid sig

En stor siffra utan sin begränsning är ett påstående sajten inte kan försvara.
Frånvarosiffran står intill upplysningen om kvittning; nollorna i "ensam mot
alla" står intill förklaringen att de är mekaniska; en automatisk tolkning med
låg säkerhet flaggas i sin egen ruta.

Förbehållet ska formuleras så att det **stärker** trovärdigheten. Skriv "det här
är aritmetik, inte en anklagelse", inte "vi kan tyvärr inte veta".

### 3. Påståenden hämtas ur data, aldrig ur en hårdkodad mening

"Båda gångerna" och "de gjorde det aldrig" blir tyst osanna nästa gång ETL:n
körs. Räkna fram dem. Se `lista()` och `namn()` i `lib/db.ts`.

---

## Färg

Allt ligger som CSS-variabler i `:root`, med mörkt läge både via
`prefers-color-scheme` och `[data-theme='dark']`.

| Roll | Ljust | Mörkt |
|---|---|---|
| `--papper` | `#f4f1ea` | `#14120e` |
| `--papper-djup` | `#eae5da` | `#1d1a15` |
| `--black` | `#17140f` | `#f0ebe0` |
| `--black-mjuk` | `#4a453c` | `#b8b0a1` |
| `--black-svag` | `#7d7669` | `#857d6e` |
| `--linje` | `#d5cec0` | `#332f27` |
| `--accent` | `#a4301c` | `#e2705a` |
| `--accent-svag` | `#f0e3df` | `#2a1e1a` |

En accent. Inga gradienter. Inga skuggor — djup skapas med linjer.

Röstfärgerna har varsin **egen textfärg** (`--ja-text` och så vidare). Vit text
klarar inte 4,5:1 mot `--avstar` och `--franvarande`, och röstetiketterna sätts i
11 px. Använd `ROSTTEXT`, aldrig `text-white`.

---

## Typografi

Två snitt, laddade i `app/layout.tsx`:

- **Instrument Serif** (`--font-display`, vikt 400) — rubriker och alla tal.
  Nås med klassen `.display`.
- **IBM Plex Sans** (`--font-brod`, 400/500/600) — brödtext.

`.tabular` sätter `font-variant-numeric: tabular-nums` och ska sitta på varje
tal i en tabell eller en kolumn, annars hoppar siffrorna i sidled.

### Tal ska ta plats

Nyckeltal sätts i `.display` på `clamp()` upp mot 7,5 rem, med `leading-[0.82]`
så att talet blir en form och inte en textrad. Ett tal får en egen rad med luft
omkring sig.

Bredvid talet står en **hel mening**, inte en etikett. Meningen fullbordar talet
grammatiskt: *2 569* / *"av 2 569 voteringar röstade Liberalerna och Moderaterna
lika."* Rutnät av nyckeltalskort kryper ihop och ska undvikas.

### Svensk taltypografi

Använd `tal()` från `lib/db.ts`, aldrig `toFixed()`. Svenska har decimalkomma,
tunt mellanrum i tusental och riktigt minustecken: `56,3 %`, `2 569`, `−23,0`.

Mellanslag före procenttecken.

---

## Layout

`max-w-5xl` i `app/layout.tsx`, `px-5` som växer till `px-8`.

| Klass | Vad |
|---|---|
| `.regel` | 1 px överlinje i `--linje` — standardavgränsaren |
| `.regel-tjock` | 2 px i `--black` — inleder en sida eller ett större avsnitt |
| `.stig` | engångsreveal vid sidladdning, respekterar `prefers-reduced-motion` |

Sektioner separeras med `mt-16` till `mt-20` och en `.regel`. Mer luft ovanför en
rubrik än under den. Kort, rundade hörn och skuggor hör inte hemma här.

Papperskänslan kommer från en nästan osynlig brusstruktur i `body::before`. Rör
den inte — den är kalibrerad för att inte synas.

---

## Copy

Skriv som en redaktör, inte som ett gränssnitt.

- Fulla partinamn i löpande text (`namn()`). Förkortningar bara i tabeller där
  utrymmet kräver det — sajten skrivs för läsare som inte kan dem utantill.
- Rubriker är påståenden eller frågor: *"Så röstade riksdagen."*, *"Var är
  riksdagen oenig?"*, *"Vem var inte på plats?"*
- Inga plastord, inga hedgar, ingen marknadsföringston. Om något är osäkert,
  skriv exakt vad som är osäkert.
- Länktexter namnger sitt mål: *"Se hela matrisen"*, inte *"Läs mer"*.

---

## Tillgänglighet

- Kontrast minst 4,5:1 för brödtext, 3:1 för stor text. Röstetiketterna var
  under gränsen en gång; det är därför `ROSTTEXT` finns.
- Semantisk HTML. `<table>` för tabelldata med riktiga `<th>`.
- Allt klickbart nås med tangentbord och har synligt fokus.
- Färg får aldrig vara enda bäraren — röstetiketten har både färg och text.
- Ingen horisontell scroll. Breda tabeller får `overflow-x-auto`.

---

## Innan något skickas

- [ ] Ljust och mörkt läge
- [ ] 375 px och 1440 px
- [ ] Tangentbordsnavigering och fokusmarkering
- [ ] Kontrast kontrollerad på nya färgkombinationer
- [ ] Tal genom `tal()`, inte `toFixed()`
- [ ] Varje påstående härlett ur data, inte hårdkodat
- [ ] `npx tsc --noEmit` — kör aldrig `npm run build` medan dev-servern lever
