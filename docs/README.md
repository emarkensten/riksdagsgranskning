# Dokumenten

De beskriver varför sajten ser ut som den gör, inte hur koden fungerar — koden
står för sig själv, och schemat står i migrationerna under
[`../supabase/`](../supabase).

Börja med `LAGE_2026-08.md` om du vill veta vad sajten är. Börja med
`BESLUT_2026-08.md` om du vill veta varför den blev det.

| Dokument | Vad det är | Fortfarande aktuellt |
|---|---|---|
| [`PLAN_VALET_2026.md`](PLAN_VALET_2026.md) | Vändningen till verktyg inför valet: frågesidor, innehållspipeline, designbrief | ja — pågående arbete |
| [`LAGE_2026-08.md`](LAGE_2026-08.md) | Vad sajten är i dag, vad databasen innehåller, vad som återstår | ja — ingången |
| [`BESLUT_2026-08.md`](BESLUT_2026-08.md) | Omstarten mot voteringsdata. Mätningarna som dödade hyckleriidén, metodfällan med ja/nej, och de tre lagren | ja — bär motiveringarna |
| [`DESIGN_GUIDELINES.md`](DESIGN_GUIDELINES.md) | Formspråk, färg, typografi, copy-regler | ja — styr all frontend |
| [`VALIDERING.md`](VALIDERING.md) | Utfallet av de två valideringarna före batch. Lager 2 godkändes, lager 3 lades ned | ja — som underlag |
| [`KOSTNAD.md`](KOSTNAD.md) | Kostnadsuppskattning inför batchjobben, med mätta volymer | metoden ja, talen nej — de gällde 2026-08 |
| [`PLAN_EFTER_GRANSKNING.md`](PLAN_EFTER_GRANSKNING.md) | Planen efter den externa granskningen | genomförd — står kvar som underlag |

`underlag/` innehåller rådata från valideringarna, i dag verdikten från den
adversariella granskningen i lager 3.

Arbetsreglerna — och de verifierade begränsningarna i riksdagens API — står i
[`../CLAUDE.md`](../CLAUDE.md), inte här. `KOSTNAD.md` är märkt historisk för
talens skull, men metoden gäller: regel 7 i `CLAUDE.md` kräver en
kostnadsuppskattning före varje batchjobb, och det dokumentet visar hur en
sådan görs.

## Vad som är borttaget

Dokumentation som beskrev något som aldrig byggdes, eller som motsades av
mätningar längre fram, är borttagen i stället för att stå kvar med förbehåll.
Git-historiken bär den om någon behöver se vad som var tänkt.

- `SETUP.md`, `QUICKSTART.md`, `API.md`, `DEVELOPMENT.md` — ett åtta veckors
  MVP-upplägg som aldrig byggdes, med endpoints under `/api/admin/` som inte
  finns
- `DATABASE.md` — beskrev tabellerna `voteringar`, `motioner`, `fragor` och
  `interpellationer` med 1,3 miljoner rader från 2010. Inget av namnen finns i
  schemat
- `RIKSDAGEN_API_GUIDE.md` — påstod att `p=` fungerar för paginering och att
  `from`/`tom` filtrerar. Båda är prövade och falska; det korrekta står i
  `CLAUDE.md`. Guiden saknade i gengäld `dokutskottsforslag` helt, alltså det
  fält hela klarspråkslagret bygger på. Det enda som försvann med den var
  `personlista`-endpointen, som `scripts/etl/` använder och som är enkel nog
  att läsa ur koden
- `PLAN_OMVINKLING.md` — planen som `PLAN_EFTER_GRANSKNING.md` ersatte
- `PITCH.md` — demo-rutt för att visa sajten muntligt, inget en läsare behöver
