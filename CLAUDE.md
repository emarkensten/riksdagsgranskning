# Riksdagsgranskning

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

⚠️ **RLS är avstängt på alla tabeller.** Måste åtgärdas innan publik lansering.

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

Underlag för alla designbeslut. Mätt 2026-08-15, inte gissat.

- **0,100 %** — andel röster som avviker från det egna partiets majoritet
  (24 av 23 900). Individuell "sagt vs röstat" är därför inte en produkt.
- **15,1 %** — andel frånvaro i voteringar. Rent faktapåstående, ingen tolkning.
- **56 177** anföranden totalt, varav **23 740** i ärendedebatt (vårt underlag).
- **~2 000** voteringspunkter med namnupprop.
- Medellängd anförandetext: **2 953 tecken**.

---

## Kommandon

```bash
npm run dev        # utvecklingsserver
```

ETL-skript ligger i `scripts/etl/`. Se `docs/ETL.md`.

---

## Kodstil

- TypeScript för API-routes och komponenter
- `async/await`, inte `.then()`
- Verifiera alltid faktisk databasstatus med MCP innan du antar något
