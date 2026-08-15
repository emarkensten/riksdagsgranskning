# Validering lager 3 — sagt mot röstat

**Datum:** 2026-08-15
**Status:** pågående, slutsats ännu inte fastställd

---

## Frågan

Fables idé 1 var att hitta ledamöter som argumenterar för en sak och röstar för
en annan. På individnivå är den död: **0,14 %** av rösterna avviker från det egna
partiet. Frågan lager 3 ställer är om mönstret finns på **partinivå** — talar
partiets företrädare för något partiet sedan röstar emot?

## Tre oberoende mätningar, samma riktning

| Metod | Underlag | Andel "motsäger" |
|---|---|---|
| `gpt-5.6-luna` | 36 bedömningar | 11 % |
| `gpt-5.6-terra` | 49 bedömningar | 4 % |
| Claude-agenter (första vågen) | 135 bedömningar | **0 %** |

Motsägelser är alltså sällsynta oavsett metod. Men spridningen 0–11 % är för stor
för att slutsatsen ska kunna dras än.

## Varför agenternas nolla inte kan tas för sanning

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

Nollan är därför **delvis ett artefakt av instruktionen**, inte enbart ett faktum
om riksdagen. Formuleringarna "var återhållsam" och "använd sparsamt" fick
agenterna att utelämna i stället för att gradera.

## Men en annan agent pekar åt motsatt håll

En agent i samma våg redovisade ett helt annat skäl till sin nolla:

> flera fall som såg ut som motsägelser visade sig vara partier som var
> medreservanter men formellt röstade "Avstår" på grund av voteringsordning vid
> flera samtidiga reservationer

Det är en verklig mekanism i riksdagen: när flera reservationer ställs mot
varandra kan ett parti tvingas avstå i ett delmoment trots att det står bakom en
reservation. Den agenten kastade alltså inte fall av slarv — den identifierade
ett äkta procedurartefakt som `motforslag_partier` ensamt inte fångar.

Det öppnar en tredje möjlighet: att `gpt-5.6-luna` och `gpt-5.6-terra`
**över-flaggade** därför att de inte kände till voteringsordningen. Deras 4–11 %
kan alltså vara falska positiva snarare än fynd agenterna missade.

Vilken förklaring som gäller avgörs av A/B:t nedan.

## Åtgärd

Instruktionen är omskriven med en regel som saknades:

> Du får ALDRIG utelämna en förslagspunkt som talaren faktiskt uttalar sig om.
> Om du tvekar mellan två kategorier: välj den du lutar åt och sätt `sakerhet`
> till "låg".

Utelämnande förstör underlaget. En lågt graderad bedömning kan granskas i
efterhand; ett kastat fall kan inte återskapas.

Mönstret som eftersöks beskrivs nu också uttryckligen: talaren argumenterar för
en åtgärd, partiet röstar Ja till att avslå motionerna om den, och partiet står
inte bakom någon reservation i den riktningen.

## A/B-resultatet: instruktionen tystade fyndet

Samma modell, samma underlagstyp, oberoende portioner ur 2022/23:

| Instruktion | Bedömningar | Andel "motsäger" |
|---|---:|---:|
| Gammal — "var återhållsam, använd sparsamt" | 704 | **0,3 %** |
| Rättad — "utelämna aldrig, gradera osäkerheten" | 134 | **12,7 %** |

Fyrtiofaldig skillnad. Slutsatsen "idé 1 hittar inget" var alltså ett artefakt av
formuleringen, inte ett faktum om riksdagen.

Fallen som den rättade instruktionen fångar är substantiella. Exempel: en
KD-talare argumenterar för en äldreboendegaranti för alla över 85 år, och
partiet röstar för att avslå Vänsterpartiets reservation om exakt det, utan eget
alternativ. En MP-talare säger uttryckligen att han vill se en utredning om
älvdalskan, och partiet röstar för avslag på SD:s reservation om just en sådan
utredning.

## Men nu finns motsatt risk

Den rättade instruktionen säger "tveka inte att använda etiketten". Den kan
alltså över-flagga lika lätt som den gamla under-flaggade. Sanningen ligger
någonstans mellan 0,3 % och 12,7 %, och ingen tredje promptformulering kan
avgöra var — den skulle bara vara en tredje gissning.

## Åtgärd: adversariell verifiering

Varje flaggat fall granskas av en oberoende agent vars uppgift är att
**motbevisa** påståendet, med instruktionen att utgå från att det är fel.
Kända avfärdningsgrunder anges uttryckligen: allmän sympati snarare än konkret
krav, reservation som innehåller mer än talaren begärde, frågan hanteras i annan
ordning, partiet står bakom reservationen trots att `motforslag_partier` inte
listar det, talaren är statsråd, eller voteringsordningen.

Endast fall som överlever granskningen publiceras. Detta namnger verkliga
politiker — ett felaktigt påstående är värre än ett missat fynd.

## Verifieringens utfall: inget håller

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

## Slutsats om idé 1

**Idé 1 ger inga publicerbara fynd.** Slutsatsen vilar nu på tre oberoende ben
i stället för en gissning:

1. Individnivån är utesluten av partidisciplinen (0,14 % avvikelse)
2. Partinivåns träffar varierar 0,3–12,7 % beroende enbart på promptformulering
3. Ingen av de starkaste träffarna överlever adversariell granskning

Detta redovisas öppet på sajten med siffrorna framme. Ett granskningsverktyg som
berättar vad det inte hittade är mer trovärdigt än ett som bara visar träffarna.

## Lärdom

En instruktion om försiktighet kan tysta exakt det fynd man letar efter, och en
instruktion om vaksamhet kan framkalla fynd som inte finns. Ingen av dem går att
upptäcka genom att titta på resultatet — bara genom att köra båda och jämföra.

Att agenterna redovisade sina resonemang var det enda skälet till att detta
upptäcktes. En batchkörning hade levererat 0,3 % utan att någonsin berätta varför.

**Lärdomen oavsett utfall:** en instruktion om försiktighet kan tysta exakt det
fynd man letar efter. Att agenterna redovisade sitt resonemang var det enda
skälet till att det upptäcktes — en batchkörning hade bara levererat nollan.
