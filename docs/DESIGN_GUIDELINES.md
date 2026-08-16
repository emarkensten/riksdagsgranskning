# Formspråk — Riktning 1a, "Klarhet"

Sanningen bor i `app/globals.css`, `components/system.tsx` och sidorna under
`app/`. Det här dokumentet beskriver dem, och ska rättas när koden ändras — inte
tvärtom.

---

## Idén

Samma redaktionella allvar som tidigare, men modernt: **sval nästan-vit i stället
för varmt papper, en grotesk i stället för antikva, hårlinjer i stället för
kort**, och exakt ett mörkt fält per sida som bär periodens tyngsta tal.

Inga skuggor någonstans. Djupet kommer från hårlinjerna och det mörka fältet.

Det är ett granskningsprojekt. Gränssnittet får aldrig se ut att ta ställning,
och varje siffra måste kunna spåras till sitt underlag.

---

## De tre reglerna som är lätta att bryta av misstag

### 1. Partifärger är data, aldrig dekor

`PARTIFARG` i `lib/db.ts` finns för att avkoda vilket parti en rad gäller. Den
får sitta i en fyrkant intill namnet (`Partiprick`), i en understrykning på en
röstetikett, eller i en stapel som betyder "det här partiet".

Den får **inte** färglägga en yta, en rubrik eller ett diagram där färgen inte
betyder "det här partiet". I samstämmighetsmatrisen mäts *relationen* mellan två
partier, och där används mättnad i signalfärgen — inte partifärger — just därför
att ingendera parten äger relationen.

Röstfärgerna (`--ja`, `--nej`, `--avstar`, `--franvarande`) lyder samma regel: de
kodar en röst, inget annat.

### 2. Varje siffra bär sitt förbehåll bredvid sig

En stor siffra utan sin begränsning är ett påstående sajten inte kan försvara.
Komponenten heter `Forbehall` och står **intill talet**, aldrig i en fotnot.

Förbehållet ska formuleras så att det **stärker** trovärdigheten. Skriv "det här
är aritmetik, inte en anklagelse", inte "vi kan tyvärr inte veta".

### 3. Påståenden hämtas ur data, aldrig ur en hårdkodad mening

"Båda gångerna" och "de gjorde det aldrig" blir tyst osanna nästa gång ETL:n
körs. Räkna fram dem. Se `lista()` och `namn()` i `lib/db.ts`.

---

## Färg

Allt ligger som CSS-variabler i `:root`, med mörkt läge både via
`prefers-color-scheme` och `[data-theme='dark']`.

| Roll | Variabel | Ljust | Mörkt |
|---|---|---|---|
| Papper | `--papper` | `#fbfbf9` | `#101010` |
| Tvätt / förbehållsyta | `--papper-djup` | `#f1f0ea` | `#1a1a19` |
| Hårlinje | `--linje` | `#e6e4dd` | `#2b2b28` |
| Kant på klickbart | `--linje-stark` | `#ddd9d0` | `#3a3a35` |
| Bläck | `--black` | `#0b0b0c` | `#f4f3ef` |
| Sekundär text | `--black-mjuk` | `#45454a` | `#c9c7bf` |
| Dämpad text | `--black-svag` | `#6b6b70` | `#8e8d85` |
| Monoetikett | `--etikett` | `#6f6f68` | `#8e8d85` |
| Signal | `--accent` | `#cf3c14` | `#ff6a3d` |
| Signal, bara ≥24 px | `--accent-display` | `#e0431c` | `#ff6a3d` |
| Stapelspår | `--spar` | `#eeece5` | `#2b2b28` |
| Mörkt fält | `--panel` | `#0b0b0c` | `#1a1a19` |
| Lime, bara på fältet | `--lime` | `#d9ff4a` | `#d9ff4a` |

En signal. Inga gradienter. Inga skuggor.

**Två värden får inte bytas tillbaka.** Signalen var `#e0431c` (4,0:1 — klarade
varken 14,5 px länktext eller vit text på knapp) och monoetiketterna `#86867f`
(3,5:1). `#e0431c` överlever bara för tal ≥24 px, som kräver 3:1.

I mörkt läge **ljusnar** signalen i stället för att mörkna — `#cf3c14` hade
legat på 2,1:1 mot `#101010`.

Röstfärgerna har varsin **egen textfärg** (`--ja-text` och så vidare). Vit text
klarar inte 4,5:1 mot `--avstar` och `--franvarande`. Använd `ROSTTEXT`, aldrig
`text-white`.

### Det mörka fältet

`.panel` **definierar om rollvariablerna** i stället för att sätta färger på
varje barn. Allt inuti — etiketter, staplar, länkar, förbehåll — byter palett av
sig självt, och en komponent behöver aldrig veta att den ligger där. Inuti fältet
är `--accent` lime.

**Ett fält per sida, aldrig fler.** I dag: startsidans fynd 04–05,
frånvarosidans hero, metodsidans negativa resultat, blocksidans antal
reservationer.

Fältet går kant i kant med fönstret via `.helbredd`, tillsammans med hårlinjerna
kring sidhuvud och sidfot. Ett halvt utbrott — till innehållskolumnens ytterkant
— ser bara ut som en felräkning.

---

## Typografi

Två familjer, laddade i `app/layout.tsx`:

- **Schibsted Grotesk** (`--font-brod`, 400/500/600/700/800) — allt.
- **IBM Plex Mono** (`--font-mono`, 400/500/600) — bara monoetiketterna.

| Roll | Klass | Storlek | Vikt | Knip |
|---|---|---|---|---|
| Display / h1 | `.display` | `clamp(3rem, 9vw, 116px)` | 800 | −0.045em |
| Nyckeltal | `.siffra` | 92 px (148 på fältet) | 800 | −0.05em |
| Rubrik 2 | `.rubrik` | 44 px | 800 | −0.035em |
| Ingress | — | 22 px | 400 | 0 |
| Bröd | — | 16,5 px | 400 | 0 |
| Länk / knapp | — | 14,5–15 px | 600 | 0 |
| Monoetikett | `.etikett` | 11,5 px versal | 500 | 0.14em |

`.tabular` sätter `font-variant-numeric: tabular-nums` och ska sitta på varje tal
i en kolumn, annars hoppar siffrorna i sidled. `.siffra` har det inbyggt.

### Tal ska ta plats

Nyckeltal sätts i `.siffra` på `clamp()` upp mot 92 px — 148 px på det mörka
fältet — med `line-height: 0.82` så att talet blir en form och inte en textrad.

Bredvid talet står en **hel mening**, inte en etikett. Meningen fullbordar talet
grammatiskt: *2 569* / *"av 2 569 voteringar röstade Liberalerna och Moderaterna
lika."* Rutnät av små nyckeltalskort kryper ihop och ska undvikas.

### Svensk taltypografi

Använd `tal()` och `heltal()` från `lib/db.ts`, aldrig `toFixed()`. Svenska har
decimalkomma, tunt mellanrum i tusental och riktigt minustecken: `56,3 %`,
`2 569`, `−23,0`. Mellanslag före procenttecken.

---

## Layout

`max-w-5xl` i `app/layout.tsx`, `px-5` som växer till `px-8`.

| Klass | Vad |
|---|---|
| `.regel` | 1 px överlinje i `--linje` — standardavgränsaren |
| `.panel` | mörkt fält, definierar om rollvariablerna |
| `.helbredd` | bryter ut till fönstrets kant |
| `.stig` | engångsreveal i heron, respekterar `prefers-reduced-motion` |
| `.mono` | IBM Plex Mono utan etikettens övriga egenskaper |

### `@tailwind utilities` ligger sist i filen

Inte överst, och det är inte en smaksak. Klasserna ovan — och `.display`,
`.rubrik`, `.siffra`, `.etikett` — sätter `font-weight`, `line-height` och
`color` med samma specificitet som en Tailwind-utility. Den som står sist i
filen vinner.

Med utilities överst blev `className="rubrik leading-[1.05]"` tyst `1.0`:
`.rubrik` kom senare och tog över. Uppmätt i webbläsaren gav det `line-height:
46px` i stället för `48,30px` på fyra pull-quotes, utan minsta varning — CSS
säger aldrig ifrån när en regel förlorar.

**Lägg därför nya egna klasser före `@tailwind utilities`, aldrig efter.** Samma
fälla finns i kombinationer som `.regel` plus `sm:border-t-0`; fyndrutnätet på
startsidan använder `border-b`/`sm:border-b-0` just för att slippa den.

Avsnitt separeras med `py-16` och en `.regel`. Radie: piller och knappar
`999px`, fyrkanter och chips 3–4 px, länkkort 8 px. Inga skuggor.

Rörelse: `.stig` på heron i tre steg (0/80/160 ms). Hovring tonar till
`opacity: .7` på 150 ms; navpillret får `--papper-djup`; knappar mörknar 6 %.
Fokus är 2 px `--accent` med 2 px offset, satt en gång i `globals.css`.

Under 900 px staplas alla tvåkolumnsrutnät, navet lindar till en egen rad och
ordmärket behåller `shrink-0`.

---

## Komponenter

`components/system.tsx` bär de återkommande byggstenarna, `components/ikoner.tsx`
ikonerna. Måtten står på ett ställe därför att designen är specificerad i exakta
pixlar — ett piller är 7×14 px i navet och 15×26 px som knapp.

| Komponent | Vad |
|---|---|
| `Etikett` | monoetikett, dämpad eller signal |
| `Nyckeltal` | periodens tal |
| `Textlank` | signalfärgad länk med pil |
| `Tillbaka` | dämpad länk med vänsterpil |
| `Knapp` | piller, primär eller sekundär |
| `Chip` | filterchip, aktiv = fylld bläck |
| `Forbehall` | förbehållsruta med informationsikon |
| `Partiprick` | partifärgen som fyrkant |
| `Stapel` | spår plus fyllning; nollan ritar ingenting |
| `Linjeetikett` | fyllning = röst, understrykning = parti |

Ikonerna är geometriska, 20×20, streck 1,6 (1,8 för bock och kryss), alltid
`currentColor`. Nio stycken: `PilHoger`, `PilVanster`, `Info`,
`Forstoringsglas`, `Stapeldiagram`, `Bock`, `Kryss`, `Kalender`, `Nedladdning`.

`components/sidfot.tsx` bär sidfoten, som ligger i rotlayouten och alltså
renderas på varje sida. Ingen signalfärg och ingen fylld knapp där: foten ska
inte konkurrera med sidans innehåll. Dess tal — hämtdatum, antal voteringar,
antal ledamöter — kommer ur vyn `sajtens_omfattning`, i en enda fråga.

Inget ikonbibliotek är installerat, och `lucide-react` togs bort ur
`package.json` när shadcn-resterna städades. Dess streck är 2 px och hade synts
som en tyngre linje bredvid de här — lägg inte tillbaka det för en enstaka ikon,
rita den i stället.

---

## Copy

Skriv som en redaktör, inte som ett gränssnitt.

- Fulla partinamn i löpande text (`namn()`). Förkortningar bara i tabeller och
  röstetiketter där utrymmet kräver det — sajten skrivs för läsare som inte kan
  dem utantill.
- Rubriker är påståenden eller frågor: *"Så röstade riksdagen."*, *"Var är
  riksdagen oenig?"*, *"Vem var inte på plats?"*
- Inga plastord, inga hedgar, ingen marknadsföringston. Om något är osäkert,
  skriv exakt vad som är osäkert.
- Länktexter namnger sitt mål: *"Se hela matrisen"*, inte *"Läs mer"*.

---

## Tillgänglighet

- Kontrast minst 4,5:1 för brödtext, 3:1 för text ≥24 px. Tabellen längst upp
  under **Färg** är mätt, inte uppskattad.
- Färg får aldrig vara enda bäraren — röstetiketten har både färg och utskriven
  förkortning.
- **Tabelldata som kräver koppling rad–kolumn ska vara en riktig `<table>` med
  `scope`.** Samstämmighetsmatrisen är det tydliga fallet: åtta gånger åtta nakna
  tal går inte att läsa utan sina rubriker. Designens 4 px mellanrum blir
  `border-spacing` — tabeller klarar det.
- En rad som i sin helhet är en länk hör hemma i en `<ol>`/`<li>`, inte i en
  tabell: skärmläsaren läser då raden som ett sammanhängande mål.
- Staplar är alltid en upprepning av talet bredvid och därför `aria-hidden`.
- Allt klickbart nås med tangentbord och har synligt fokus.
- Ingen horisontell sidscroll. Breda tabeller får `overflow-x-auto`, och
  `html { overflow-x: clip }` fångar resten.

---

## Innan något skickas

- [ ] Ljust och mörkt läge
- [ ] 375 px och 1440 px
- [ ] Tangentbordsnavigering och fokusmarkering
- [ ] Kontrast kontrollerad på nya färgkombinationer
- [ ] Tal genom `tal()`, inte `toFixed()`
- [ ] Varje påstående härlett ur data, inte hårdkodat
- [ ] Högst ett `.panel` per sida
- [ ] `npx tsc --noEmit` — kör aldrig `npm run build` medan dev-servern lever,
      bygget skriver över `.next` och dev-servern faller med `MODULE_NOT_FOUND`
