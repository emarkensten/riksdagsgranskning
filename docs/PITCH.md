# Pitch och demo-rutt

Underlag för att visa sajten för någon. Talen läses live ur databasen — kontrollera
dem på skärmen samma dag, de ändras när ETL:n körs.

---

## Hisspitchen

> I riksdagen ställs alltid utskottets förslag som ja och reservationen som nej.
> Ett parti som röstar nej till mer pengar till skolan har därför oftast röstat
> för *sitt eget* förslag om mer pengar till skolan. Sajten förklarar varje
> votering under mandatperioden på vanlig svenska — vad frågan gällde, vad ett ja
> innebar, vad ett nej innebar. Utan den upplysningen blir varje slutsats om ett
> partis hållning missvisande.

Om det bara får bli en mening: **ett nej i riksdagen betyder nästan aldrig nej,
och det är därför riksdagsdata är så lätt att läsa fel.**

---

## Längre version, ungefär två minuter

**1. Problemet.** Riksdagens öppna data är fritt tillgängligt och nästan
oanvändbart. Voteringarna heter saker som "SfU16 punkt 3", och utfallet är ja
eller nej mot ett procedurförslag, inte mot sakfrågan. Den som läser rakt av får
fel svar.

**2. Vad sajten gör.** Varje votering 2022–2026 översatt till klarspråk, med
originaltexten öppen bredvid för granskning. Ovanpå det ligger måtten: vem röstar
med vem, vem står ensam, var är kammaren oenig, vem var inte på plats.

**3. Vad den visar.** Fyra tal som säger något:

- Två av regeringspartierna röstade lika i **samtliga** voteringar. Deras linjer
  gick aldrig isär.
- Ett oppositionsparti stod ensamt mot alla sju andra **hundratals gånger**.
  Regeringspartierna: noll — och sajten skriver ut att den nollan är mekanisk,
  inte ett tecken på lojalitet.
- Utskottets förslag föll i kammaren **2 gånger** på fyra år.
- **13,4 %** frånvaro. Ett tiotal voteringar hade kunnat sluta annorlunda om alla
  frånvarande röstat med sitt parti.

**4. Poängen — avsluta här.** Det mest intressanta är vad sajten *inte* gör. Jag
letade efter hyckleri: politiker som säger en sak i talarstolen och röstar
tvärtom. Tre resultat sänkte idén.

- Enskilda ledamöter avviker från partilinjen i **0,14 %** av rösterna. Det finns
  ingen berättelse på individnivå.
- På partinivå gav samma modell och samma underlag **fyrtio gånger** fler träffar
  när prompten bad om vaksamhet i stället för försiktighet. Måttet mätte
  formuleringen, inte riksdagen.
- Av de nio starkaste fallen överlevde **noll** en granskning som var satt att
  motbevisa dem.

Så jag byggde det inte. Det negativa resultatet ligger på metodsidan i
stället.

---

## Demo-rutt, fem minuter

| Sida | Vad du säger |
|---|---|
| `/` | De fem fynden i nyhetsvärde. Stanna vid det mörka fältet — frånvaron — och peka på förbehållet bredvid: *aritmetik, inte anklagelse.* |
| `/voteringar` | Skanna listan. Färgmönstret till höger visar vem som röstade lika **utan att man läser**. |
| en votering | "Ett ja innebar" / "Ett nej innebar" sida vid sida. Det är hela produkten i en skärm. |
| `/samstammighet` | Alla 28 partipar, inga partifärger — ingen av parterna äger relationen. |
| `/metod#hyckleri` | Det negativa resultatet. Avsluta där. |

---

## Frågor som kommer

**"Varför säger startsidan ett tal och voteringssidan ett annat?"**
2 587 förslagspunkter har en klarspråksförklaring. 2 569 av dem avgjordes med
namnupprop om sakfrågan. Skillnaden står utskriven på voteringssidan.

**"Saknas röster för de 18?"**
Nej. Varje sådan votering har 349 rader i databasen, en per ledamot. Riksdagen kan
hålla namnupprop om två olika saker: sakfrågan, alltså vad som ska beslutas, och
motivfrågan, alltså hur beslutet ska motiveras. För de 18 gällde uppropet
motiveringen. De rösterna säger inget om partiernas hållning i sakfrågan och
räknas därför inte in i något mått.

**"Litar ni på att modellen sammanfattat rätt?"**
Nej, och därför ligger originaltexten öppen på varje voteringssida, modellen
skattar sin egen säkerhet, och punkter under *hög* är märkta redan i listan.
Instruktionen prövades på 30 punkter som lästes manuellt innan hela batchen kördes.

**"Varför ser tre partisidor likadana ut?"**
Därför att partierna röstar likadant. Moderaterna, Kristdemokraterna och
Liberalerna ligger på 99,9–100 % inbördes samstämmighet. Förbehållet står överst
på var och en av de tre sidorna — det är ett resultat, inte ett fel i mätningen.

**"Kan man lita på siffrorna?"**
Varje tal går att räkna om ur riksdagens öppna data, och metodsidan har
definitionen bakom vart och ett. Sajten redovisar dessutom öppet vad materialet
*inte* kan svara på, bland annat att kvittningen inte syns och att de flesta
besluten togs helt utan omröstning.
