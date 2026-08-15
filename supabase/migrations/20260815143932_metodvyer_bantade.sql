-- parti_disciplin behövde aldrig läsa rost.
--
-- Migrationen 20260815142348 materialiserade vyn därför att den tog 4,3 s mot
-- anons statement_timeout på 3 s. Rätt fix var att inte läsa 909 145 röstrader
-- till att börja med: underlaget finns färdigaggregerat i parti_rost, där ja,
-- nej och avstår står per (votering_id, parti). Avvikande röster är aritmetik
-- på dem — avlagda minus de som låg på linjen.
--
-- Kontrollerat att talen är identiska båda vägarna: 1 070 avvikande av
-- 770 029 avlagda. 4 300 ms blev 18 ms, vyn behöver inte materialiseras, och
-- ETL:n slipper en refresh.
--
-- CASE-satsen upprepas medvetet. punkt_linje äger samma regel, men den är
-- nycklad på forslagspunkt_id och begränsad till punkter med klarspråk —
-- disciplinen mäts över hela röstuniversumet. En gemensam primitiv per
-- votering_id vore rätt nivå, men den kräver att fyra materialiserade vyer
-- byggs om och hör därför till en egen migration.
drop materialized view if exists parti_disciplin;

create view parti_disciplin as
with linje as (
  select parti, ja, nej, avstar,
         case when ja >= nej and ja >= avstar and ja > 0 then 'Ja'
              when nej >= avstar and nej > 0 then 'Nej'
              when avstar > 0 then 'Avstår' end as linje
  from parti_rost
  where parti in ('S', 'M', 'SD', 'C', 'V', 'KD', 'MP', 'L')
)
select parti,
       sum(ja + nej + avstar) as avlagda,
       sum(ja + nej + avstar - case linje
             when 'Ja' then ja when 'Nej' then nej when 'Avstår' then avstar
             else 0 end) as avvikande
from linje
group by parti;

comment on view parti_disciplin is
  'Avlagda röster som avviker från det egna partiets linje. Frånvaro räknas inte som avvikelse.';

-- Vyn är inte längre materialiserad och ska inte refreshas.
create or replace function public.aggregat_vyer()
returns text[]
language sql
stable
as $function$
  select array[
    'parti_rost',
    'ledamot_franvaro',
    'riksmote_summering',
    'jamn_votering',
    'partisamstammighet',
    'punkt_linje',
    'punkt_ensam',
    'parti_ensam',
    'ensam_exempel',
    'amne_oversikt',
    'amne_exempel'
  ];
$function$;

-- punkt_linje är redan byggd med join mot punkt_klartext, så joinen här
-- filtrerade bort noll rader. Den var dessutom en risk: fick punkt_klartext
-- någonsin två rader per förslagspunkt skulle voteringar multipliceras.
create or replace view parti_utfall as
with utfall as (
  select f.id as forslagspunkt_id,
         case when j.ja > j.nej then 'Ja'
              when j.nej > j.ja then 'Nej' end as vann
  from forslagspunkt f
  join jamn_votering j on j.votering_id = upper(f.votering_id)
)
select l.parti,
       count(*) as voteringar,
       count(*) filter (where l.linje = u.vann) as med_vinnaren,
       round(100.0 * count(*) filter (where l.linje = u.vann) / count(*), 1) as andel
from punkt_linje l
join utfall u using (forslagspunkt_id)
where l.linje is not null
group by l.parti;

-- Fyra head-counts mot retorik_rost, en per kategori, missade tyst varje
-- kategori som inte stod i frontendens hårdkodade lista. Samma mönster som
-- klartext_summering: låt databasen gruppera.
create view retorik_summering as
select overensstammelse, count(*) as antal
from retorik_rost
group by overensstammelse;

comment on view retorik_summering is
  'Antal bedömningar per överensstämmelse mellan anförande och partiets röst.';

revoke all on parti_disciplin, retorik_summering from anon, authenticated;
grant select on parti_disciplin, retorik_summering to anon, authenticated;
