-- Två vyer som metodsidan behöver, båda för att slippa hårdkodade påståenden.

-- Hur ofta en enskild ledamot röstade mot sitt eget partis linje.
--
-- Hyckleri-avsnittet stod tidigare med 0,14 %, mätt på 40 slumpade betänkanden
-- ur 2024/25. Siffran för hela mandatperioden går inte att räkna fram i
-- frontend: underlaget är 909 145 röstrader.
create or replace view parti_disciplin as
with linje as (
  select votering_id, parti,
         case when ja >= nej and ja >= avstar and ja > 0 then 'Ja'
              when nej >= avstar and nej > 0 then 'Nej'
              when avstar > 0 then 'Avstår' end as linje
  from parti_rost
  where parti in ('S', 'M', 'SD', 'C', 'V', 'KD', 'MP', 'L')
)
select l.parti,
       count(*) filter (where r.rost <> 'Frånvarande') as avlagda,
       count(*) filter (where r.rost <> 'Frånvarande' and r.rost <> l.linje) as avvikande,
       round(100.0 * count(*) filter (where r.rost <> 'Frånvarande' and r.rost <> l.linje)
             / nullif(count(*) filter (where r.rost <> 'Frånvarande'), 0), 3) as andel
from rost r
join linje l on l.votering_id = r.votering_id and l.parti = r.parti
where r.avser = 'sakfrågan'
group by l.parti;

comment on view parti_disciplin is
  'Avlagda röster som avviker från det egna partiets linje. Frånvaro räknas inte som avvikelse.';

-- Vilken modell som skrev klarspråket, och hur den kalibrerade sig själv.
-- Metodsidan måste namnge modellen, och namnet får inte stå hårdkodat i en
-- mening som blir tyst osann nästa gång batchen körs med en annan modell.
create or replace view klartext_summering as
select modell, sakerhet, count(*) as antal
from punkt_klartext
group by modell, sakerhet;

comment on view klartext_summering is
  'Antal klarspråksförklaringar per modell och självskattad säkerhet.';

revoke all on parti_disciplin, klartext_summering from anon, authenticated;
grant select on parti_disciplin, klartext_summering to anon, authenticated;
