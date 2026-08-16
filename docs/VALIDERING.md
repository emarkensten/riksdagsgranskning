# Valideringar före betalda körningar

Två LLM-lager har körts i projektet, och båda validerades på ett litet urval
innan något batchjobb beställdes. Det här dokumentet är utfallet av de
valideringarna.

Regeln de följer står i [`../CLAUDE.md`](../CLAUDE.md): aldrig batch utan att
först köra prompten på 20–50 exempel och granska utfallet manuellt. Skälet till
att regeln finns står i [`BESLUT_2026-08.md`](BESLUT_2026-08.md) — $22 brändes i
oktober 2025 på en prompt som mätte fel sak.

De två lagren slutade olika. Lager 2 blev produkten som sajten bygger på. Lager
3 lades ned, och det är det mer lärorika av de två.

---

# Lager 2 — voteringspunkt till klarspråk

**Datum:** 2026-08-15
**Modell:** `gpt-5.6-luna`
**Urval:** 30 voteringspunkter spridda över utskott, riksmöte 2024/25
**Kostnad:** $0,0232
**Utfall:** godkänd, körd i batch — det är den här texten sajten visar

Kör om med `node scripts/lager2/validera.mjs 30 gpt-5.6-luna`.

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

## Kvarstod att bevaka i full körning

- Andelen "låg" säkerhet — noll vore misstänkt
- Voteringspunkter helt utan reservation (0,2 % i 2024/25); de bör konsekvent
  få lägre säkerhet
- Stickprov mot ämnesfördelningen, så inte "övrigt" blir en slaskkategori

---

# Lager 3 — sagt mot röstat

**Datum:** 2026-08-15
**Utfall:** nedlagd. Inga publicerbara fynd, och skälet står nedan.

## Frågan

Idén var att hitta ledamöter som argumenterar för en sak och röstar för en annan.
På individnivå är den död: **0,14 %** av rösterna avviker från det egna partiet.
Frågan lager 3 ställde var om mönstret finns på **partinivå** — talar partiets
företrädare för något partiet sedan röstar emot?

## Tre oberoende mätningar, samma riktning

| Metod | Underlag | Andel "motsäger" |
|---|---|---|
| `gpt-5.6-luna` | 36 bedömningar | 11 % |
| `gpt-5.6-terra` | 49 bedömningar | 4 % |
| Claude-agenter (första vågen) | 135 bedömningar | **0 %** |

Motsägelser är alltså sällsynta oavsett metod. Men spridningen 0–11 % var för
stor för att slutsatsen skulle kunna dras.

## Varför agenternas nolla inte kunde tas för sanning

En agent redovisade självmant sitt resonemang:

> flera tveksamma fall (t.ex. Vänsterpartiets tal om kompetensförsörjning i
> SoU22, där partiet argumenterade brett för en nationell plan men röstade Ja
> utan att stå bakom en egen reservation) hoppades över helt i stället för att
> pressas in i en osäker "motsäger"-bedömning

Det som beskrivs där **är** definitionen av en motsägelse i vår skala: partiet
röstade emot det talaren argumenterade för, utan eget alternativ. Fallet
kastades alltså i stället för att klassificeras.

En annan agent redovisade en närliggande glidning:

> i de fall talare argumenterade för något partiet ändå röstade "fel" väg på ...
> klassades som "stämmer" snarare än motsägelse

Nollan var därför **delvis ett artefakt av instruktionen**, inte enbart ett
faktum om riksdagen. Formuleringarna "var återhållsam" och "använd sparsamt" fick
agenterna att utelämna i stället för att gradera.

## Men en annan agent pekade åt motsatt håll

En agent i samma våg redovisade ett helt annat skäl till sin nolla:

> flera fall som såg ut som motsägelser visade sig vara partier som var
> medreservanter men formellt röstade "Avstår" på grund av voteringsordning vid
> flera samtidiga reservationer

Det är en verklig mekanism i riksdagen: när flera reservationer ställs mot
varandra kan ett parti tvingas avstå i ett delmoment trots att det står bakom en
reservation. Den agenten kastade alltså inte fall av slarv — den identifierade
ett äkta procedurartefakt som `motforslag_partier` ensamt inte fångar.

Det öppnade en tredje möjlighet: att `gpt-5.6-luna` och `gpt-5.6-terra`
**över-flaggade** därför att de inte kände till voteringsordningen. Deras 4–11 %
kunde alltså vara falska positiva snarare än fynd agenterna missat.

## Åtgärd: instruktionen skrevs om

Instruktionen fick en regel som saknades:

> Du får ALDRIG utelämna en förslagspunkt som talaren faktiskt uttalar sig om.
> Om du tvekar mellan två kategorier: välj den du lutar åt och sätt `sakerhet`
> till "låg".

Utelämnande förstör underlaget. En lågt graderad bedömning kan granskas i
efterhand; ett kastat fall kan inte återskapas.

Mönstret som eftersöktes beskrevs nu också uttryckligen: talaren argumenterar för
en åtgärd, partiet röstar Ja till att avslå motionerna om den, och partiet står
inte bakom någon reservation i den riktningen.

## A/B-resultatet: instruktionen tystade fyndet

Samma modell, samma underlagstyp, oberoende portioner ur 2022/23:

| Instruktion | Bedömningar | Andel "motsäger" |
|---|---:|---:|
| Gammal — "var återhållsam, använd sparsamt" | 704 | **0,3 %** |
| Rättad — "utelämna aldrig, gradera osäkerheten" | 134 | **12,7 %** |

Fyrtiofaldig skillnad. Slutsatsen "idén hittar inget" var alltså ett artefakt av
formuleringen, inte ett faktum om riksdagen.

Fallen som den rättade instruktionen fångade var substantiella. Exempel: en
KD-talare argumenterar för en äldreboendegaranti för alla över 85 år, och
partiet röstar för att avslå Vänsterpartiets reservation om exakt det, utan eget
alternativ. En MP-talare säger uttryckligen att han vill se en utredning om
älvdalskan, och partiet röstar för avslag på SD:s reservation om just en sådan
utredning.

## Men då fanns motsatt risk

Den rättade instruktionen sa "tveka inte att använda etiketten". Den kunde
alltså över-flagga lika lätt som den gamla under-flaggade. Sanningen låg
någonstans mellan 0,3 % och 12,7 %, och ingen tredje promptformulering kunde
avgöra var — den skulle bara vara en tredje gissning.

## Åtgärd: adversariell verifiering

Varje flaggat fall granskades av en oberoende agent vars uppgift var att
**motbevisa** påståendet, med instruktionen att utgå från att det är fel.
Kända avfärdningsgrunder angavs uttryckligen: allmän sympati snarare än konkret
krav, reservation som innehåller mer än talaren begärde, frågan hanteras i annan
ordning, partiet står bakom reservationen trots att `motforslag_partier` inte
listar det, talaren är statsråd, eller voteringsordningen.

Endast fall som överlevde granskningen skulle publiceras. Detta namnger verkliga
politiker — ett felaktigt påstående är värre än ett missat fynd.

## Verifieringens utfall: inget höll

De nio starkaste flaggade fallen granskades av en agent vars uppgift var att
motbevisa dem.

| Verdikt | Antal |
|---|---:|
| håller | **0** |
| svagt | 2 |
| faller | 7 |

Inte ett enda fall överlevde. Motargumenten är sakliga, och ett mönster
återkommer: **talaren hade formellt yrkat bifall till en annan reservation**,
och det påstådda kravet var en bisats i förbifarten snarare än partiets yrkande
i den aktuella voteringen.

Ett exempel på hur nära det kan se ut utan att hålla — en C-ledamot sa
"regeringen behöver kontinuerligt följa upp denna lagstiftning", nästan
ordagrant vad S-reservationen begärde, men fortsatte direkt: "Det kommer även vi
från Centerpartiet att göra." Hon beskrev sedvanlig politisk bevakning, inte ett
krav på ett tillkännagivande.

Andra vanliga avfärdningsgrunder som föll ut: allmän oro för ett sakområde
förväxlad med krav på den specifika åtgärd voteringen gällde, och reservationer
som innehöll mer än talaren efterfrågat, där partiet kan ha avvisat helheten.

## Slutsats

**Lager 3 ger inga publicerbara fynd.** Slutsatsen vilar på tre oberoende ben i
stället för en gissning:

1. Individnivån är utesluten av partidisciplinen (0,14 % avvikelse)
2. Partinivåns träffar varierar 0,3–12,7 % beroende enbart på promptformulering
3. Ingen av de starkaste träffarna överlever adversariell granskning

Detta redovisas öppet på sajten med siffrorna framme, under `/metod#hyckleri`.
Ett granskningsverktyg som berättar vad det inte hittade är mer trovärdigt än ett
som bara visar träffarna.

## Lärdom

En instruktion om försiktighet kan tysta exakt det fynd man letar efter, och en
instruktion om vaksamhet kan framkalla fynd som inte finns. Ingen av dem går att
upptäcka genom att titta på resultatet — bara genom att köra båda och jämföra.

Att agenterna redovisade sina resonemang var det enda skälet till att detta
upptäcktes. En batchkörning hade levererat 0,3 % utan att någonsin berätta varför.
