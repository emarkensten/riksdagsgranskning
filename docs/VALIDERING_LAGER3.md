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

## Nästa steg

A/B mellan gammal och rättad instruktion på oberoende portioner ur 2022/23.
Slutsatsen om idé 1 dras först när det utfallet finns.

**Lärdomen oavsett utfall:** en instruktion om försiktighet kan tysta exakt det
fynd man letar efter. Att agenterna redovisade sitt resonemang var det enda
skälet till att det upptäcktes — en batchkörning hade bara levererat nollan.
