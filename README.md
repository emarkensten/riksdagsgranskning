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

---

## Siffrorna i materialet

Kontrollerade mot databasen 2026-08-15. Sajten räknar fram dem live vid varje
rendering — tabellen nedan är en ögonblicksbild, inte en sanning som ska
underhållas för hand.

| | |
|---|---|
| Förslagspunkter med klarspråksförklaring | 2 587 |
| …varav avgjorda med namnupprop om sakfrågan | 2 569 |
| Förslagspunkter totalt 2022–2026 | 8 977 |
| Betänkanden | 1 442 |
| Anföranden (hämtade, inte sammanfattade) | 56 177 |
| Voteringar där nej-sidan vann | 2 |

Skillnaden mellan 2 587 och 2 569 är punkter där namnuppropet gällde
motivfrågan, alltså hur beslutet skulle motiveras — inte vad som beslutades. De
rösterna säger inget om partiernas hållning i sakfrågan och räknas därför inte in
i något mått.

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

ETL-skripten ligger i `scripts/etl/`. `run.mjs` är kommenterad, och funktionen
`aggregat_vyer()` i databasen styr vilka materialiserade vyer som uppdateras och
i vilken ordning.

---

## Läs vidare

| Dokument | Vad |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Arbetsregler, verifierade API-begränsningar och mätta grundfakta |
| [docs/LAGE_2026-08.md](docs/LAGE_2026-08.md) | Vad sajten är i dag och vad som återstår |
| [docs/DESIGN_GUIDELINES.md](docs/DESIGN_GUIDELINES.md) | Formspråk och copy-regler |
| [docs/BESLUT_2026-08.md](docs/BESLUT_2026-08.md) | Varför hyckleriidén lades ned |
| [docs/PITCH.md](docs/PITCH.md) | Sajten i pitchform, med demo-rutt |

Fyra dokument från projektets första vecka — `SETUP.md`, `QUICKSTART.md`,
`API.md` och `DEVELOPMENT.md` — beskrev ett åtta veckors MVP-upplägg som aldrig
byggdes, med endpoints under `/api/admin/` som inte finns. De är borttagna.
Git-historiken bär dem om någon behöver se vad som var tänkt.

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
