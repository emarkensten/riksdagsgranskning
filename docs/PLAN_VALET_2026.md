# Plan: Riksdagskammaren inför valet 2026

**Beslutat 2026-08-17.** Sajten heter **Riksdagskammaren**, domänen är
`riksdagskammaren.se`. Valet är 13 september — 27 dagar.

Det här är byggdokumentet. Ordningen är prioritetsordning, inte önskelista.
Två tidigare versioner av planen vilade på premisser som föll; skälen står
bevarade under *Struket* så att besluten inte behöver fattas om.

---

## Vad sajten är, och vad framgång betyder

2 587 riksdagsbeslut från mandatperioden 2022–2026 i klarspråk — vad frågan
gällde, vad ett ja innebar, vad ett nej innebar, och varje partis linje.

**Det är ett referensverk, inte en produkt med återvändande användare.** Ingen
har ett återkommande behov av att veta hur riksdagen röstade, och datan är
färdig — mandatperioden är slut. Framgång är att bli **använd som källa**: en
journalist som länkar en sida i en valartikel, en lärare, en tråd som avgörs med
en länk. En enda redaktionell användning är värd mer än tiotusen ströbesök.

Sajtens enhet är därför **den enskilda sidan som landningssida via delad länk**,
inte startsidan.

**Valet är deadline för uppmärksamheten, inte för värdet.** Blir det tyst den
13 september finns ändå ett referensverk med etablerad domän och fyra år till
nästa val.

---

## AP0 — Namnbytet. Görs först, allt annat köar bakom

Varje mejl, varje delad länk och varje socialt kort är värdelöst tills adressen
håller. Sociala kort cachas; en adress som byts efter spridning tappar allt.

- `lib/sajt.ts` — `SAJT`, `UNDERTITEL`, `SAJT_URL`. `REPO` ändras **inte**:
  repot heter fortfarande `riksdagsgranskning` och det är avsiktligt.
- `app/layout.tsx` — ordmärket. Sammansättningen delas som i dag med andra
  halvan i signalfärg: Riksdags**kammaren**.
- `NEXT_PUBLIC_SITE_URL` i Vercel → `https://riksdagskammaren.se`. Utan den
  pekar delningsbilder och sitemap på gamla adressen.
- Domänen kopplas i Vercel, med `riksdagsgranskning.vercel.app` kvar som
  omdirigering.
- Delningsbildernas text och `alt` följer namnet.

**Kontrollera på produktionssajten, inte lokalt.** Båda delningsbuggarna som
hittades 2026-08-16 var osynliga i utveckling.

## AP5 — Instrumentering. Samma push som AP0

Sajten har ingen webbanalys alls. Två premisser om trafikvägar har diskuterats
under dagen utan att någon kunnat avgöras, eftersom ingenting mäts.

- Vercel Web Analytics på.
- Sajtkartan in i Google Search Console. **Indexering tar dagar** — frågesidorna
  är sajtens enda sökmotoryta, och varje dags fördröjning är förlorad räckvidd i
  september.

## AP2 — De nio frågesidorna

Ny sidtyp `/fragor/[slug]`. Urvalet är SVT:s valkompass 2026 — vi lånar
**urvalet, inte formuleringarna**, och länkar källan.

### Underlaget, verifierat mot databasen 2026-08-17

Första mätningen sa 24 av 35. Ett adversariellt motbevisningspass sänkte det
till **9** — av 19 prövade påståenden föll 15. Fällningsgrunderna var
"utvärdering av X är inte X", "reduktionsplikt är inte bensinskatt",
"anslagsnivå är inte uppdrag", och framför allt riktningen: av 30 granskade
voteringar klarade ~10 ämnesprövningen men bara 5 hade entydig riktning.

Dessa nio står. Samtliga har `sakerhet = hög`.

| Fråga | forslagspunkt_id | Betänkande | Datum |
|---|---:|---|---|
| Sveriges anslutning till Nato | 4022 | UU16 p1 | 2023-03-16 |
| Permanent uppehållstillstånd | 3557 | SfU15 p1 | 2023-04-12 |
| Statligt huvudansvar för sjukvården | 3107 | SoU12 p1 | 2023-04-24 |
| Kommunalt veto mot vindkraft | 2932 | MJU13 p13 | 2023-05-03 |
| Skydd av skog med höga naturvärden | 2716 | MJU15 p9 | 2023-05-12 |
| Reserverade föräldrapenningdagar | 5463 | SfU12 p3 | 2024-04-12 |
| DCA-avtalet med USA | 4674 | UFöU1 p4 | 2024-06-13 |
| Avgiftsfri tandvård, åldersgräns | 2254 | SoU4 p1 | 2024-11-14 |
| Avverkningsregler, naturvärdes- och friluftsskog | 8659 | MJU6 p5 | 2026-01-16 |

Skogsfrågan bärs av två voteringar över två riksmöten med samma reservant —
samma ställningstagande upprepat, alltså svårare att vifta bort.

### Minsta försvarbara form

- Rubrik som en väljare bär frågan. **Egen formulering, aldrig SVT:s text.**
  Källrad anger att urvalet är SVT:s, med länk.
- Ett stycke: vad riksdagen beslutade, när, vad ja respektive nej innebar —
  hämtat ur befintligt klarspråk.
- **Propositionsasymmetrin står före listan.** Regeringens gärning ligger i
  propositioner utan namnupprop medan oppositionens syns som reservationer, så
  sidan riskerar att visa mer av oppositionen — genom datans form, inte genom
  partiskhet. Efter listan är för sent; det är läxan från `/fynd`.
- `Rostrad`, länk till voteringssidan, länk till ämnessökningen.
  `sakerhet`-flaggan följer med.
- Delningsbild via befintlig OG-generator.
- **Ingen mappning till kompassens svarsskala.** Sidan redovisar voteringen på
  dess egna villkor och låter läsaren dra kopplingen. Det *eliminerar*
  riktningsproblemet i stället för att hantera det, och är skälet till att formen
  håller.
- **Manuell slutkontroll per sida**, cirka 15 minuter: är voteringen verkligen
  det frågan gäller? Nio sidor, en människa, ingen agent.

Nio oantastliga slår tjugofyra angripbara — en enda fälld sida smittar de andra
åtta.

Byt några av startsidans 16 byråkratiska ämneschips mot de nio frågorna.
`/fragor` får en indexsida med en ärlig rad: nio frågor där en votering
ordagrant matchar; för övriga har ingen entydig votering kunnat fastställas.

## AP2b — "Hur hade du röstat?" Egen PR efter AP2

Kollegans andra idé: besökaren röstar själv i de nio frågorna och jämförs med
hur partierna faktiskt röstade. Premissen mättes mot databasen före beslutet:
partilinjerna över de tio voteringarna ger **sex distinkta profiler av åtta
partier** — bara M, KD och L är identiska — så quizet särskiljer på riktigt.

Varför det inte är det avvisade 2022-spåret: jämförelsen går **din röst mot
partiets röst**, inte partiets ord mot partiets röst. Ingen anklagas. Ingen
SVT-data behövs. Riktningsproblemet uppstår aldrig, eftersom användaren svarar
på samma instrument som partierna — själva voteringen, med vad ja och vad nej
innebar utskrivet.

**Placering: egen sida på `/rosta`, inte ny startsida.** Startsidan är sajtens
ansikte mot den som bedömer källan — en journalist som överväger att citera ska
mötas av materialet, inte av ett quiz. Quizet får en tydlig ingång högst upp på
startsidan och delas som egen länk med egen delningsbild. Efter valet tonas
ingången ned utan ny arkitekturändring.

Villkor, formulerade för att fälla quizet om de bryts:

- **"Du röstade som partiet i X av 9" — aldrig procent.** Nio frågor bär inte
  procentsatser.
- **Resultatet är matrisen, inte en dom.** Per fråga, alla åtta linjer synliga,
  avstår redovisat som avstår. Ingen "du är X-partist"-skärm.
- **M/KD/L-likheten skrivs ut innan resultatet**, inte efter.
- **Ramen är "samma val som kammaren stod inför"** — förslag mot motförslag,
  båda förklarade — inte "vad tycker du om sakfrågan".
- **Svaren lämnar aldrig webbläsaren.** Ingen lagring, inga analytics-händelser
  på svaren, och det står utskrivet på sidan. Hur man skulle rösta är en
  politisk åsikt — en känslig personuppgift.
- Varje fråga länkar till sin frågesida. Partilinjerna hämtas ur `parti_rost`
  vid bygget, aldrig hårdkodade.

Quizet är den delbara komponent distributionen saknade: lärarmejlet blir "låt
klassen rösta i riksdagens riktiga beslut och se facit".


## AP4 — Distribution

**Pitcha sidan, inte sajten.** Ingen redaktion adopterar ett verktyg i valspurt;
en reporter som skriver om marknadshyror använder en länk som ger exakt
partiernas röster.

**Presspaket:** en sida — vem, vad, metod, vad datan *inte* kan säga, kontakt.
Mejlmall på 8–10 rader med personlig första rad och länk till den fråga som är
relevant för just mottagaren. Spåra i ett ark. En påminnelse efter fyra–fem
dagar, aldrig fler.

**Våg 1, ~15 mejl:** statsvetare — be dem inte sprida, be dem **göra sönder
metoden**. Det är kvalitetssäkring och distribution i samma handling. Plus
datajournalister på SVT, Ekot, TT och Altinget, hittade via byline på deras egna
valkompass- och faktagranskningsartiklar, aldrig via tipsadressen.

**Våg 2, ~25 mejl:** lärarkanaler — snabbast väg till faktisk användning, och
förstagångsväljare i klassrummet är sajtens mest naturliga publik. Sedan
regionala politikreportrar, som har mindre konkurrens om inkorgen. Sist egna
kanaler: LinkedIn, en tråd per frågesida under #svpol — data först, aldrig
partipoäng.

**Löpande:** svara samma dag. Framhåll felanmälan på `/metod` i varje mejl. En
snabb rättelse av ett påpekat fel är det starkaste trovärdighetsbevis som finns
att få.

---

## Tidplan

Fable dimensionerade den ursprungliga tidplanen för en person som bygger på
kvällar. Bygget görs i stället i en session. **Det förkortar inte projektet — det
förlänger distributionsfönstret**, vilket är hela poängen: mejlsvar,
indexering och uppföljning tar kalendertid som inte går att komprimera.

| När | Vad | Vem |
|---|---|---|
| **17 aug, kväll** | AP0 + AP5 + AP2 i sin helhet, därefter AP2b som egen PR. | Bygget |
| 17–18 aug | Registrera `riksdagskammaren.se`, koppla i Vercel, sätt `NEXT_PUBLIC_SITE_URL`. Sajtkartan till Search Console. Heads-up till arbetsgivaren. | Erik |
| 18–20 aug | Presspaket + våg 1 — statsvetare och datajournalister | Erik |
| 20 aug–5 sep | Våg 2, lärarkanaler, regionalt, egna kanaler. Uppföljning. | Erik |
| **5 sep** | **Kodstopp** | |
| 6–13 sep | Enbart reaktivt: svara samma dag, rätta, följa upp | Erik |

Distributionen startar alltså en vecka tidigare än Fable räknade med, och det är
den enda vinsten som betyder något — den är det enda arbetspaket som inte kan
göras ikapp efteråt.

**Regel mot den dokumenterade vanan att välja kod: när bygget är klart köps varje
ny kodtimme med ett skickat mejl först.**

---

## Struket

**Jakten på bättre kandidater bland de 26 återstående frågorna.** 79 procents
fällningsgrad på det som prövats. Varje timme där konkurrerar med distribution
till sämre väntevärde. Undantag: en redaktion frågar om en specifik fråga.

**Nollsidorna.** En tidigare version av planen ville behålla dem. Efter
motbevisningspasset vet vi att de 26 är **oavgjorda, inte tomma** — och att
publicera en overifierad negation ("riksdagen har aldrig tagit ställning till
detta") är exakt vad en statsvetare fäller. Sajtens vallgrav är att ingenting på
den faller.

**Innehållspipelinen med agenter.** Kandidatmatchning, syntesagenter,
granskningskedja — allt dimensionerat för 25 sidor. Nio sidor på en votering var
skrivs av en människa ur redan validerat klarspråk.

**Antrop som avsändare för det här valet.** Parkerat till efter valet; fyra
veckor räcker inte för kund- och pressdimensionerna. Sidfoten står kvar:
partipolitiskt obunden, privat initiativ. **Men ge arbetsgivaren en heads-up den
här veckan** — risken är inte logotypen i sidfoten, den är att Antrops vd får ett
oförberett samtal från en journalist som googlat på tre sekunder.

**Löfte mot handling med 2022 års valkompass.** Prövat och avvisat. Tekniskt
möjligt — SVT:s kompass från 2022 ligger kvar med partiernas fullständiga svar —
men fällan sitter i påståendet, inte i datat: partisvaret bredvid rösten gör ett
hyckleripåstående genom sammanställningen. Ett A–D-svar renar sagt-sidan men
inte votering-sidan; flera av avfärdningsgrunderna i
[`VALIDERING.md`](VALIDERING.md) ligger på voteringssidan av bron. Ett parti som
svarade A och sedan förhandlade Tidöavtalet har regerat, inte ljugit. Och
eftersom M, KD och L röstar lika i 99,9–100 % skulle spåret hitta tre partier som
bryter identiska löften identiskt — ett fynd omförpackat som tre. Rätt produkt,
fel år: dokumentera urvalet nu, bygg uppföljningen under nästa mandatperiod, med
partiernas egna valmanifest som källa i stället för SVT:s sammanställning.

**Ledamotssidor** (0,139 % avvikelse — ingen population att jämföra),
**innehållsanalys av anföranden** (cirkulär), **scrollytelling kring ett enskilt
fynd** (trafikmaximering; ett oprövat verktyg som pekar ut partier dagarna före
ett val är en trovärdighetsrisk), **ny ETL**, **redesign**.

---

## Prognos

**60–70 procents risk att sajten inte får någon redaktionell uppmärksamhet
alls.** Utan distributionen: nära 100. Realistisk bästa utgång är en till tre
verkliga citeringar plus några tusen besök kring valveckan. Viralitet genom utpekande fynd är
inte ett utfall den här sajten ska ha. Quizet är det medvetna undantaget:
delning av ett eget resultat pekar inte ut någon.

Oddsen är ändå värda att ta: distributionsinsatsen kostar ~15 timmar mot de
månader som redan är nedlagda, så väntevärdet är positivt även vid 30 procents
träffchans.

---

## Fallgropar

`CLAUDE.md` gäller: M/KD/L-förbehållet överallt där ett av dem namnges,
frånvarons två nivåer blandas inte, `nej > ja`-aritmetiken och inte
`vinnare`-fältet, Supabase MCP för all verifiering, tresekundersregeln för allt
frontend läser, `npm run kontrollera` efter varje ändring som rör partilinjen.

**Och en dyrköpt: premisser antas i stället för mätas.** Trafikvägen från
valkompass antogs utan prövning. Mätningen som sa 24 av 35 höll inte heller —
den föll till 9 så fort någon fick i uppdrag att motbevisa den. Mät, och låt
någon försöka fälla mätningen.
