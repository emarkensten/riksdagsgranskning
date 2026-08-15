-- parti_disciplin skapades som vanlig vy i migrationen 20260815141400 och tog
-- 4,3 sekunder: den läser hela rost (909 145 rader). Under postgres-rollen
-- märktes det inte. anon har statement_timeout 3 s, så PostgREST avbröt frågan
-- och metodsidan fick noll rader — och skrev ut "0 av 0 avlagda röster".
--
-- Lärdomen som gäller framåt: en vy som är snabb nog i SQL-editorn kan vara
-- för långsam för frontend, och supabase-js svarar med tom lista i stället för
-- att kasta. Läs alltid `error`.
--
-- Åtta rader materialiserade kostar inget utrymme. Refreshen tar 4,3 s, vilket
-- ryms i de 8 s som gäller för rollen ETL:n kör som.
drop view if exists parti_disciplin;

create materialized view parti_disciplin as
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

comment on materialized view parti_disciplin is
  'Avlagda röster som avviker från det egna partiets linje. Frånvaro räknas inte som avvikelse.';

revoke all on parti_disciplin from anon, authenticated;
grant select on parti_disciplin to anon, authenticated;

-- Ordningen styr ETL:ns refresh. parti_disciplin bygger på parti_rost och
-- måste därför uppdateras efter den.
create or replace function public.aggregat_vyer()
returns text[]
language sql
stable
as $function$
  select array[
    'parti_rost',
    'parti_disciplin',
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
