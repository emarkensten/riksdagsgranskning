# Validering lager 2 — voteringspunkt till klarspråk

**Datum:** 2026-08-15
**Modell:** `gpt-5.6-luna`
**Urval:** 30 voteringspunkter spridda över utskott, riksmöte 2024/25
**Kostnad:** $0,0232

Kör om med `node scripts/lager2/validera.mjs 30 gpt-5.6-luna`.

---

## Utfall

| | |
|---|---|
| Lyckade svar | 30 av 30 |
| Självskattad säkerhet | 29 hög, 1 medel |
| Kostnad för hela riksmötet (649 punkter) i batch | **$0,25** |
| Kostnad för mandatperioden (~2 600 punkter) i batch | **~$1,00** |

## Bedömning: prompten håller

Det avgörande testet var om modellen undviker metodfällan — att tolka ett Nej som
motstånd mot sakfrågan istället för stöd för en reservation. Den gör det
genomgående:

> **Nej innebar:** Nej innebar att man i stället stödde Centerpartiets
> reservation. Regeringen skulle då få se över hur arbetsgivare kan få bättre
> stöd i det förebyggande arbetsmiljöarbetet, med särskilt fokus på små företag.

Reservationen namnges med parti och innehåll. Det är precis den formulering som
gör påståendet försvarbart.

Språket är konkret snarare än svävande, och tonen är beskrivande utan att värdera.

## Kalibrering ser rimlig ut

Det enda fallet med säkerhet "medel" var korrekt flaggat. Modellen noterade
självmant att underlaget var tunt:

> Reservationen innehöll dock inte mer detaljer om varför lagförslagen skulle
> avslås; skälen hänvisades till separata särskilda yttranden.

Att den hittar och rapporterar en brist i sitt eget underlag är ett gott tecken.
29 av 30 på "hög" är ändå värt att hålla ögonen på — om andelen "låg" förblir noll
över hela batchen bör kalibreringen granskas om.

## Åtgärdat efter validering

Ämnestaxonomin saknade **jämställdhet och diskriminering**, vilket gjorde att
jämställdhetspolitiska voteringar hamnade under "konstitution och demokrati".
Kategorin är tillagd. Övriga ämnen fördelade sig rimligt över de 30 exemplen.

## Kvarstår att bevaka i full körning

- Andelen "låg" säkerhet — noll vore misstänkt
- Voteringspunkter helt utan reservation (0,2 % i 2024/25); de bör konsekvent
  få lägre säkerhet
- Stickprov mot ämnesfördelningen, så inte "övrigt" blir en slaskkategori
