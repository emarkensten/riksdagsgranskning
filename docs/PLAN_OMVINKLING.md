# Plan: vinkla om till mönster-först

**Datum:** 2026-08-15
**Status:** beslutad, ej påbörjad

Sajten är i dag djup-först — den bjuder in till att bläddra bland enskilda
voteringar. Men rubrikerna ligger i aggregaten, och de är verifierade och
obyggda. Den här planen flyttar tyngdpunkten utan att kasta något.

---

## Verifierade siffror att bygga på

Samtliga kontrollerade mot databasen 2026-08-15. Ingen kräver LLM-anrop.

| Fynd | Siffra | Källa |
|---|---|---|
| L och M röstade lika | **2 569 av 2 569** | `partisamstammighet`, verifierat med separat motbevisfråga |
| C stod ensamt mot alla andra | **556 voteringar** | mer än V (465) och SD (372); M, KD och L stod aldrig ensamma |
| Regeringsunderlaget förlorade | **5 av 2 587** | `forslagspunkt.vinnare <> 'utskottet'` |
| Frånvaro i voteringar | **14,7 %** | `riksmote_summering` |
| Voteringar avgjorda med ≤3 röster | **111** | `jamn_votering` |

### M + SD spretar kraftigt mellan ämnen

| Ämne | Samstämmighet |
|---|---:|
| integration och migration | 94,6 % |
| rättsväsende | 89,8 % |
| försvar och säkerhet | 88,0 % |
| miljö och klimat | 82,0 % |
| jämställdhet och diskriminering | 65,2 % |
| trafik och infrastruktur | 64,6 % |
| näringsliv | 56,3 % |

"Eniga om migration, splittrade om näringspolitik" är en rubrik som i dag ligger
dold bakom två klick och ett filterval.

---

## Vad som ska byggas

### 1. Startsidan blir fem siffror
Ersätt dagens tre nyckeltal och den enskilda L/M-rutan med fem stora
verifierade siffror, en mening var, var och en länkad till sin skärning. Ingen
ska behöva läsa för att höja ögonbrynen — läsandet är steg två.

### 2. Ny sida: Ämnen
Visar alla 16 ämnen samtidigt — var blocken håller ihop och var de spricker —
med 2–3 klarspråkade exempelvoteringar per ämne, länkade till detaljvyn.

Detta är sajtens unika korsning: samstämmighetsdatan gånger de 2 587
klartexterna. Ingen konkurrent har båda. Politikerkollen är individ-först,
AI Riksdag gör manifest mot röst, riksdagens egna verktyg ger rådata.

Allt är SQL mot `partisamstammighet`, `forslagspunkt` och `punkt_klartext`.

### 3. Två små sektioner
- **Ensam mot alla** — hur ofta varje parti stod ensamt. Kontraintuitivt: C toppar.
- **När regeringen förlorade** — de fem fallen uppräknade med klartext.

Båda rent aritmetiska.

### 4. Voteringslistan nedgraderas till referens
Sök och detaljvy behålls oförändrade — de är sajtens källmaterial och
trovärdighetsbevis. De slutar bara vara entrén.

---

## Vad som INTE ska byggas

Se `docs/VALIDERING_LAGER3.md` för hela resonemanget.

- **Sagt mot röstat som funktion.** Avvisad efter adversariell granskning:
  0 av 9 flaggade fall höll. `/spanningar` behålls som metodsida.
- **Voteringsindex på en politisk axel.** Någon måste välja axeln, och valet är
  angripbart. airiksdagen.se gör dessutom redan manifest mot röst.
- **Individuell frånvarotoppista som huvudnummer.** Behålls, men partinivån
  ligger först och förbehållet står intill — partiledare har institutionellt hög
  frånvaro.

---

## Ej testat

Fables idé 3 (embeddings över motioner för copy-paste-kluster) och idé 4
(ekonomiska intressen mot voteringar) prövades aldrig. Idé 3 är billig att
testa — motionsdata hämtas med samma ETL-mönster.
