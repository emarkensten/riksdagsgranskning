# Kostnadsuppskattning

**Datum:** 2026-08-15
**Underlag:** faktiska teckenmängder ur databasen, inte uppskattningar.

---

## Leverantörsval: OpenAI

| Skäl | |
|---|---|
| Pris | 5–15× billigare än Anthropic för volymjobbet (se jämförelse nedan) |
| Befintlig kod | `lib/openai-batch.ts` fungerar redan — sparar en dags arbete |
| Batch API | 50 % rabatt, och vi har ingen brådska som kräver synkrona anrop |

**Nyckel som behövs:** `OPENAI_API_KEY` i `.env.local`.
(Just nu finns bara Supabase-nycklarna där.)

---

## Mätta volymer

Ur databasen, riksmöte 2024/25:

| | Antal | Tecken |
|---|---:|---:|
| Voteringspunkter (lager 2) | 649 | 204 691 |
| Anföranden kopplade till votering (lager 3) | 4 590 | 12 369 401 |

Hela mandatperioden ≈ 4× detta: ~2 600 voteringspunkter, ~18 400 anföranden.

Tokenberäkning utgår från 2,8 tecken/token (svenska är mindre tokeneffektivt än
engelska) plus promptomkostnad per anrop.

---

## Kostnad

Batchpriser: `gpt-5-nano` $0,025/$0,20 per Mtok, `gpt-5.6-luna` $0,10/$0,60 per Mtok.

### POC — enbart 2024/25

| Steg | Modell | In | Ut | Kostnad |
|---|---|---:|---:|---:|
| Lager 2: voteringspunkter → klarspråk | gpt-5.6-luna | 0,33 M | 0,23 M | **$0,17** |
| Lager 3: anföranden → position | gpt-5-nano | 6,7 M | 0,92 M | **$0,35** |
| Lager 3 om vi väljer luna istället | gpt-5.6-luna | 6,7 M | 0,92 M | *$1,22* |

**POC totalt: $0,50 – $1,40**

### Hela mandatperioden 2022–2026

| Steg | Modell | In | Ut | Kostnad |
|---|---|---:|---:|---:|
| Lager 2 | gpt-5.6-luna | 1,33 M | 0,91 M | **$0,68** |
| Lager 3 | gpt-5-nano | 26,9 M | 3,7 M | **$1,41** |
| Lager 3 om vi väljer luna | gpt-5.6-luna | 26,9 M | 3,7 M | *$4,91* |

**Fullt totalt: $2,10 – $5,60**

### Jämförelse Anthropic

Lager 3, hela mandatperioden med `claude-haiku-4-5` i batch ($0,50/$2,50):
**$22,70** — alltså 5–16× dyrare för samma jobb.

---

## Slutsats

**Kostnaden är inte projektets risk.** Hela pipelinen för fyra års riksdagsarbete
går på under $6. Även med tre gångers felmarginal i tokenberäkningen landar det
under $20.

De $22 som brändes i oktober 2025 slösades inte för att tokens var dyra — de
slösades för att prompten mätte fel sak. Slutsatsen är därför inte "välj billigare
modell" utan **"validera frågan innan du skalar"**.

### Kostnad för validering

Innan något batchjobb: kör prompten på 30–50 exempel, granska manuellt.
Det kostar under $0,05 och är den enda utgift som verkligen betyder något.

---

## Förbehåll

- Priserna är hämtade från OpenAI:s prissida 2026-08-15. Dokumentationen nämner ett
  10 %-påslag på Batch för modeller släppta efter 2026-03-05; vid dessa belopp är
  det försumbart, men verifiera mot live-priser innan ett större jobb.
- Databasen tar 92 MB per riksmöte. Fyra riksmöten ≈ 370 MB mot gratisnivåns
  500 MB. Det ryms, men utan marginal för LLM-resultattabellerna — räkna med att
  behöva uppgradera Supabase eller sluta lagra text för anföranden som inte används.
