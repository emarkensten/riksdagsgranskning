# Namnupprop

**Varje votering i riksdagen, på vanlig svenska.**

Sveriges riksdags öppna data är fritt tillgängligt och nästan oläsbart.
Voteringarna heter saker som `SfU16 punkt 3`, och utfallet är ett ja eller nej
mot ett procedurförslag — inte mot sakfrågan. Namnupprop översätter varje sådan
votering under mandatperioden 2022–2026 till klarspråk, med originaltexten öppen
bredvid.

Sajten är privat och har ingen koppling till Sveriges riksdag.

---

## Det viktigaste att förstå om materialet

I en svensk votering ställs **utskottets förslag alltid som ja och reservationen
som nej**. Ett parti som röstar nej till mer pengar till skolan har därför oftast
röstat för *sitt eget* förslag om mer pengar till skolan.

Det är den enskilt farligaste fällan i riksdagsdata. Ett verktyg som läser varje
nej som motstånd mot sakfrågan producerar hundratals falska anklagelser. Därför
står det på varje voteringssida utskrivet vad ett ja innebar, vad ett nej
innebar, och vilka partier som stod bakom reservationen.

---

## Huvudfyndet är negativt

Projektet började som något annat: en jakt på hyckleri, alltså politiker som
säger en sak i talarstolen och röstar tvärtom. **Den idén är utredd och
nedlagd.** Tre resultat sänkte den:

1. **Enskilda ledamöter avviker inte.** 1 070 av 770 029 avlagda röster avvek
   från det egna partiets linje — 0,14 %. Det finns ingen population av ledamöter
   som röstar mot sitt parti, och därmed ingen berättelse på individnivå.
2. **På partinivå mätte måttet formuleringen.** Samma modell på samma underlag
   gav fyrtio gånger fler träffar när instruktionen bad om vaksamhet i stället
   för försiktighet.
3. **Ingen träff överlevde granskning.** De nio starkaste fallen prövades av en
   bedömare med uppgift att motbevisa dem. Sju föll, två blev osäkra, inget höll.

Verktyget byggdes aldrig. Det negativa resultatet publicerades i stället, med
räkningen öppen — se `/metod#hyckleri` på sajten. Namnupprop lovar alltså inga
avslöjanden, och det är ett resultat och inte en brist.

---

## Vad sajten faktiskt visar

Ovanpå översättningen ligger fyra mått, alla räknade ur samma röstdata:

- **Vem röstar med vem** — alla 28 partipar, mätta likadant, utan
  höger–vänsteraxel.
- **Var kammaren är oenig** — enigheten ämne för ämne.
- **Vem som inte var på plats** — frånvaron per riksmöte och parti.
- **Vem som stod ensam** — voteringar där ett parti var det enda med sin linje.

Varje tal står bredvid sitt förbehåll, och varje definition finns på `/metod`.

Utöver de fyra ligger en sammanhållen analys, **Blocken**. Den följer tre mått
som mäter olika saker och inte påverkar varandra — hur ofta ett parti reserverar
sig mot utskottets förslag, hur ofta det ändå röstar med förslaget, och hur ofta
det skriver reservationer tillsammans med andra — och visar att de vänder
samtidigt under mandatperiodens sista riksmöte. Vilket parti sidan handlar om
räknas fram ur datan och står inte i koden; i dag är det Sverigedemokraterna,
vars reservationer gick från 577 till 20 mellan de två sista riksmötena.

Sidan prövar fyra invändningar mot sin egen läsning, och skriver ut svaret på
var och en — även när svaret är att materialet inte räcker. Den svåraste är att
färre reservationer för ett regeringsunderlag är *inflytande* och inte tystnad.
Halva den invändningen går att pröva och är prövad: partiet bytte inte till det
svagare instrumentet, för de särskilda yttrandena föll också, från 60 till 17,
medan S, V och MP alla skrev fler än året före. Den andra halvan går inte —
vad som står i regeringens propositioner finns inte i öppna data.

---

## Siffrorna i materialet

Kontrollerade mot databasen 2026-08-16. Sajten räknar fram dem live vid varje
rendering — tabellen nedan är en ögonblicksbild, inte en sanning som ska
underhållas för hand.

| | |
|---|---|
| Förslagspunkter med klarspråksförklaring | 2 587 |
| …varav avgjorda med namnupprop om sakfrågan | 2 569 |
| Förslagspunkter totalt 2022–2026 | 8 977 |
| Betänkanden | 1 442 |
| Reservationer | 11 274 |
| Särskilda yttranden | 1 013 |
| Anföranden (hämtade, inte sammanfattade) | 56 177 |
| Voteringar där nej-sidan vann | 2 |

Skillnaden mellan 2 587 och 2 569 är 18 punkter där namnuppropet gällde
motivfrågan, alltså hur beslutet skulle motiveras — inte vad som beslutades. De
rösterna säger inget om partiernas hållning i sakfrågan och räknas därför inte in
i något mått. De 18 räknas fram ur `rost.avser` och är inte en differens mellan
två vyer — sajten påstår att uppropet gällde motivfrågan, och då ska det vara
kontrollerat.

**Reservation och särskilt yttrande är två olika saker.** En reservation är ett
motförslag som ställs mot utskottets och röstas om. Ett särskilt yttrande
markerar avvikande uppfattning utan att opponera mot beslutet, och röstas aldrig
om — bara det förstnämnda syns alltså i röstdata. Yttrandena finns inte i
riksdagens metadata utan bara i betänkandenas HTML, och hämtas därifrån.

**De flesta beslut syns inte alls här.** 6 390 av 8 977 förslagspunkter
avgjordes genom acklamation, alltså utan att någon begärde namnupprop. Enighet i
kammaren är därför systematiskt underrepresenterad.

---

## Teknik

- **Next.js 14** (App Router, server components) + TypeScript + Tailwind
- **Supabase** (PostgreSQL) — läses med den publika nyckeln; RLS släpper igenom
  `select` och blockerar all skrivning
- **OpenAI Batch API** — klarspråksförklaringarna, körda en gång och sparade

Sidorna läser databasen direkt i server components. Det finns ingen API-yta att
bygga mot — enda route handlern är `/underlag`, som lämnar ut röstdatan som CSV.
Inget komponentbibliotek och inget diagrambibliotek: `components/system.tsx` bär
byggstenarna, `components/ikoner.tsx` de nio ikonerna och `components/diagram.tsx`
de tre diagrammen, ritade som SVG för hand.

### Räkna om talen

[`/underlag`](app/underlag/route.ts) ger en rad per votering och parti — 22 786
rader — med ja, nej, avstår och frånvarande. Partilinje, samstämmighet,
frånvaro, ensam mot alla och utfall går alla att härleda ur den filen plus
definitionerna på `/metod#definitioner`. Det är avsiktligt: metodsidan påstår
att varje tal går att räkna om, och utan rådata vore det ett påstående läsaren
fick ta på förtroende.

Sajten ligger på
[riksdagsgranskning.vercel.app](https://riksdagsgranskning.vercel.app) och
byggs om vid varje push till `master`.

### Kör lokalt

```bash
npm install
cp .env.example .env.local
npm run dev
```

`npm run kontrollera` är repots enda test. Partilinjen — det alternativ flest
av ett partis närvarande ledamöter valde — är skriven två gånger, som
SQL-funktion och i `lib/db.ts`, och kan inte dela implementation. Går de isär
visar startsidan och voteringssidan olika linje för samma votering utan att
något felar.

Testet prövar dem mot varandra på alla 433 kombinationer av (ja, nej, avstår)
som förekommer i datan, plus ett tiotal konstruerade — mest lika röstetal, som
bryts av en `>=`-kedja i SQL och av en stabil sortering i TypeScript. Två skilda
mekanismer som råkar ge samma svar är precis den sortens likhet som tystnar.
SQL-svaret hämtas med `rpc()`, alltså ur den installerade funktionen och inte ur
en migration någon kan ha glömt köra. En omkastad tie-break i TypeScript ger 9
avvikelser över 416 rader — testet är sett fälla.

ETL-skripten ligger i `scripts/etl/`. `run.mjs` är kommenterad, och funktionen
`aggregat_vyer()` i databasen styr vilka materialiserade vyer som uppdateras och
i vilken ordning.

---

## Hur repot är byggt

Koden är i allt väsentligt skriven med Claude Code. Det syns i historiken — 72
av 114 commits är samsignerade — och står här för att repot är lättare att läsa
när man vet det.

Arbetsreglerna ligger i [CLAUDE.md](CLAUDE.md) och läses vid varje session.
Flera av dem är formulerade i efterhand, efter att något gått fel:

- **Aldrig ett batchjobb utan validering på 20–50 exempel först** — $22 brändes
  i oktober 2025 på en prompt som mätte fel sak
- **Verifiera mot databasen i stället för att anta** — `forslagspunkt.vinnare`
  ser ut att ange vem som vann och gör det inte; den ger 5 förluster där rätt
  svar är 2
- **Skriv ut när ett fynd gäller flera partier** — M, KD och L röstar lika i
  99,9–100 % av voteringarna, så vilket av dem som hamnar i en rubrik avgörs av
  tiondelar

Det är den delen av arbetet som inte går att lämna ifrån sig, och skälet till
att `/metod` redovisar ett negativt huvudfynd i stället för en snyggare historia.

---

## Läs vidare

| Dokument | Vad |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Arbetsregler, verifierade API-begränsningar och mätta grundfakta |
| [docs/](docs/) | Sex dokument om varför sajten ser ut som den gör — [`docs/README.md`](docs/README.md) är vägvisaren |
| [docs/LAGE_2026-08.md](docs/LAGE_2026-08.md) | Vad sajten är i dag och vad som återstår |
| [docs/BESLUT_2026-08.md](docs/BESLUT_2026-08.md) | Varför hyckleriidén lades ned |
| [docs/VALIDERING.md](docs/VALIDERING.md) | Vad de två LLM-valideringarna visade före batch |

Dokumentation som beskrev något som aldrig byggdes, eller som senare mätningar
motsade, är borttagen i stället för att stå kvar med förbehåll — listan finns i
[`docs/README.md`](docs/README.md#vad-som-är-borttaget). Git-historiken bär den
om någon behöver se vad som var tänkt.

## Källa

All data kommer från [data.riksdagen.se](https://data.riksdagen.se). Hittar du
ett fel,
[öppna ett ärende](https://github.com/emarkensten/riksdagsgranskning/issues/new).

## Licens

Två licenser, eftersom repot innehåller tre olika saker.

| Vad | Licens | Fil |
|---|---|---|
| Koden — appen, ETL-skripten, migrationerna | MIT | [`LICENSE`](LICENSE) |
| Sajtens texter, klarspråket och de härledda talen | CC BY 4.0 | [`LICENSE-DATA`](LICENSE-DATA) |
| Källdatan från riksdagen | Riksdagens egna villkor | — |

Creative Commons avråder från CC-licenser på programvara, och därför är det två
och inte en.

Källdatan är inte min att licensiera. Riksdagen anger att öppna data får
användas fritt utan avgifter eller licenser, men att Sveriges riksdag alltid ska
anges som källa — och det villkoret följer med talen vidare till den som
återanvänder dem härifrån.
