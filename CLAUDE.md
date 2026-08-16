# Namnupprop

Granskar Sveriges riksdag 2022–2026 med öppna data från `data.riksdagen.se`.
Next.js 14 + Supabase + OpenAI Batch API.

---

## HÅRDA ARBETSREGLER

Dessa gäller alltid och går före default-beteende.

### Git och PR
1. **Arbeta aldrig direkt på `master`.** Skapa branch för varje arbetsuppgift.
2. **Gör PR löpande** — små, avgränsade PR:ar hellre än en stor.
3. **Före varje merge: kör `/simplify` och/eller `/code-review`.** Du avgör vilken
   som passar; vid tveksamhet kör båda.
4. **Efter merge: ta bort branchen** om den inte behövs mer.

### Frontend
5. **All frontend byggs med `/frontend-design` och/eller `/impeccable`.**
   Du avgör vilken som passar uppgiften.

### Skills
6. **Du bedömer själv när en skill ska tillämpas.** Reglerna ovan är obligatoriska;
   i övrigt väljer du.

### Pengar
7. **Aldrig ett LLM-batchjobb utan föregående kostnadsuppskattning till användaren.**
8. **Aldrig batch utan validering först** — kör prompten på 20–50 exempel, granska
   utfallet manuellt, och först därefter batch. Se `docs/BESLUT_2026-08.md` för
   varför denna regel finns ($22 brändes 2025-10 på en prompt som mätte fel sak).

---

## Databas

**Använd alltid Supabase MCP för SQL**, aldrig JS-klienten (1000-radersgräns,
opålitlig för verifiering).

- Projekt-ref: `chwvalgrgbebfhgfpnfb`
- Nycklar i `.env.local` (`SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`)

### Åtkomst — kontrollerad 2026-08-16

RLS är **på** för alla nio tabeller, med exakt en policy var: `SELECT` för
`anon` och `authenticated`. Skrivning är stängd — ett `INSERT` med anon-nyckeln
svarar 401 (prövat 2026-08-15).

Kvarstående risk att känna till: Supabase delar ut `grant all` till `anon` som
standard, och det är bara RLS som stoppar skrivningarna. **En ny tabell i
`public` utan `enable row level security` är därför öppen för skrivning från
internet.** Slå på RLS i samma migration som skapar tabellen.

Materialiserade vyer stöder inte RLS och skyddas bara av `grant`. Ge dem
`select` till `anon` bara om frontend faktiskt läser dem. Samma sak gäller
vanliga vyer.

### Tre sekunder är taket för allt frontend läser

`anon` har `statement_timeout = 3s`, `authenticated` 8 s, `service_role` inget.
En vy som känns snabb i SQL-editorn kan alltså vara för långsam i webbläsaren —
editorn kör som `postgres`, utan tak.

Värre är att det inte syns: **supabase-js kastar inte, den svarar med tom lista
och ett `error`**. En avbruten fråga blir därför en nolla på sidan i stället för
ett fel. Kör varje fråga genom `rader()` eller `rakna()` i `lib/db.ts`, som
läser `error` och kastar.

Mät med `explain analyze` innan en ny vy släpps till frontend. Ligger den nära
taket: aggregera på ett befintligt aggregat i stället för på rådata
(`parti_disciplin` gick från 4 300 ms till 18 ms så) — och först om det inte
räcker, materialisera och lägg till vyn i `aggregat_vyer()`.

---

## Riksdagens API — verifierade begränsningar

Testat 2026-08-15. Dessa fallgropar kostar timmar om man inte känner till dem.

| Sak | Verklighet |
|---|---|
| `sz=10000` | Hårt tak. Allt över kapas tyst. |
| `p=` (paginering) | **Fungerar inte** på `voteringlista`/`anforandelista` — returnerar samma data. |
| `from`/`tom` | **Ignoreras** på `voteringlista`/`anforandelista`. |
| Uppräkna anföranden | Iterera `parti=` (S, SD, M, C, V, KD, MP, L, -). Ger ~14 000/riksmöte. |
| Uppräkna voteringar | Iterera `bet=` per betänkande (~330/riksmöte). |
| `anforandetext` | Tom i listan. Hämta per st: `/anforande/{dok_id}-{nr}.json` (~0,08 s). |
| Joinen sagt↔röstat | `anforande.rel_dok_id` → `votering.dok_id`. Verifierad. |
| Voteringspunkternas innebörd | `/dokument/HC01{bet}.json` → `dokutskottsforslag` |

**`dokutskottsforslag` är projektets viktigaste fält.** Per förslagspunkt ger den
`rubrik` (klarspråk), `forslag`, `motforslag_nummer`, `motforslag_partier`
(vilka partier som stod bakom motförslaget) och `vinnare`. Utan `motforslag_partier`
går det inte att tolka en votering korrekt — se `docs/BESLUT_2026-08.md`.

---

## Mätta grundfakta (2022–2026)

Underlag för alla designbeslut. Kontrollerade mot databasen 2026-08-15 med
Supabase MCP, inte gissade. Siffrorna nedan gäller **hela mandatperioden** —
det är den vanligaste felkällan i det här projektet.

- **2 587** förslagspunkter med klarspråksförklaring, varav **2 569** har
  röstdata. Skillnaden är punkter utan namnupprop.
- **0,139 %** — andel avlagda röster som avviker från det egna partiets linje
  (1 070 av 770 029). Individuell "sagt vs röstat" är därför inte en produkt.
- **13,4 %** — frånvaro över hela perioden (119 768 av 896 581). Per riksmöte:
  14,0 / 14,9 / 14,7 / 10,6 %. Blanda inte ihop dem.
- **56 177** anföranden totalt, varav **23 740** i ärendedebatt. Av dem saknar
  **28** text: de hämtades men kom aldrig hem, och `pool()` svalde bortfallet
  tyst fram till 2026-08-16. Nu stannar körningen i stället.
- Medellängd anförandetext: **2 666 tecken**, räknat på de 23 712 som har text.
  Stod som 2 953 fram till 2026-08-16 — mätt på något annat, inte på den här
  populationen.
- **11 274** reservationer och **1 013** särskilda yttranden. Talen var
  11 316 och 1 141 fram till 2026-08-16. Skillnaden är 170 tomma
  `<p class="Reservationsrubrik">`-stycken som uppmärkningen innehåller och som
  lagrades som verkliga poster — inte data som gått förlorad.

### Reservation och särskilt yttrande är två olika saker

En **reservation** är ett motförslag som ställs mot utskottets och röstas om.
Ett **särskilt yttrande** markerar avvikande uppfattning utan att opponera mot
beslutet, och röstas aldrig om. Bara det förstnämnda syns i röstdata.

Yttrandena finns **inte** i `dokmotforslag` — fältet har en `typ`-kolumn, men
den står på `reservation` i varje post. De går bara att nå genom betänkandets
HTML, via `<p class="Srskiltyttranderubrik">`. `scripts/etl/reservationer.mjs`
plockar båda i samma pass.

### Två fallgropar som redan kostat fel siffror

**`forslagspunkt.vinnare` är inte tillförlitlig.** Fältet innehåller `bifall`,
`Avslagen` och `null` för punkter som utskottet faktiskt vann. Den som räknar
`vinnare <> 'utskottet'` får 5 förluster; rätt svar är 2.

Utskottets förslag ställs alltid som ja och reservationen som nej. Använd
aritmetiken `nej > ja`. Kontrollerat: den sammanfaller med
`vinnare = 'utskottet'` i samtliga 2 569 voteringar med röstdata, utan
motexempel.

**M, KD och L röstar lika i 99,9–100 % av alla voteringar.** Varje fynd som
namnger ett av dem gäller i praktiken alla tre, och vilket som hamnar i
rubriken avgörs ofta av tiondelar. Skriv alltid ut det bredvid siffran.

---

## Kommandon

```bash
npm run dev          # utvecklingsserver
npm run kontrollera  # prövar partilinje() i SQL mot den i TypeScript
```

`npm run kontrollera` är repots enda test. Den finns därför att partilinjen är
skriven två gånger — som SQL-funktion och i `lib/db.ts` — och inte kan dela
implementation. Går de isär visar startsidan och voteringssidan olika linje för
samma votering, utan att något felar. Kör den efter varje ändring i endera.

ETL-skript ligger i `scripts/etl/`. Det finns ingen separat ETL-dokumentation —
`run.mjs` är kommenterad och `aggregat_vyer()` i databasen styr vilka
materialiserade vyer som uppdateras och i vilken ordning.

Det finns ingen `app/api`-katalog. Sidorna läser databasen direkt i server
components, och enda route handlern är `/underlag`. Dokument som beskriver
endpoints under `/api/admin/` är borttagna — de beskrev ett upplägg som aldrig
byggdes.

Schemat står i migrationerna under `supabase/`. De är källan — inte något
dokument. `docs/DATABASE.md` beskrev tabeller som aldrig funnits i schemat och
är borttagen av samma skäl (2026-08-16).

**Dokumentation som beskriver något som aldrig byggdes, eller som en senare
mätning motsagt, tas bort i stället för att stå kvar med förbehåll.** Ett
dokument ingen länkar till är ett dokument ingen märker när det blir osant.
`docs/README.md` listar vad som gått den vägen och varför.

---

## Läget

`docs/LAGE_2026-08.md` beskriver vad sajten är i dag och vad som återstår.
Börja där. `docs/PLAN_EFTER_GRANSKNING.md` är genomförd och står kvar som
underlag för varför sidorna ser ut som de gör.

`docs/README.md` är vägvisaren till dokumenten och säger vilka som är aktuella
och vilka som står kvar som historik.

---

## Kodstil

- TypeScript för API-routes och komponenter
- `async/await`, inte `.then()`
- Verifiera alltid faktisk databasstatus med MCP innan du antar något
