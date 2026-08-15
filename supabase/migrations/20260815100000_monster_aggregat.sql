-- Aggregat för mönster-först: startsidans fem siffror och ämnessidan.
-- Ren aritmetik på röstdata som redan finns. Inga LLM-anrop.

-- ------------------------------------------------------------------ primitiv
-- Ett partis linje per förslagspunkt. Samma CASE som partisamstammighet och
-- jamn_votering redan använder, bruten ur dem så att regeln finns på ett ställe.
create materialized view punkt_linje as
select f.id                 as forslagspunkt_id,
       f.rm,
       k.amne,
       pr.parti,
       case
         when pr.ja  >= pr.nej and pr.ja >= pr.avstar and pr.ja  > 0 then 'Ja'
         when pr.nej >= pr.avstar                     and pr.nej > 0 then 'Nej'
         when pr.avstar > 0                                          then 'Avstår'
       end as linje
from forslagspunkt f
join punkt_klartext k on k.forslagspunkt_id = f.id
join parti_rost    pr on pr.votering_id = upper(f.votering_id)
where f.votering_id is not null
  and pr.parti in ('S', 'M', 'SD', 'C', 'V', 'KD', 'MP', 'L');

create index punkt_linje_punkt_idx on punkt_linje (forslagspunkt_id);
create index punkt_linje_parti_idx on punkt_linje (parti);

-- -------------------------------------------------------------- ensam mot alla
-- Ett parti stod ensamt när ingen av de sju andra hade samma linje.
-- Kravet på att alla åtta har en linje är inte kosmetiskt: saknas ett parti
-- blir "ensam" ibland ett mätfel i stället för ett politiskt faktum.
create materialized view punkt_ensam as
with atta as (
  select forslagspunkt_id
  from punkt_linje
  where linje is not null
  group by forslagspunkt_id
  having count(*) = 8
)
select l.forslagspunkt_id, l.parti, l.linje, l.amne, l.rm
from punkt_linje l
join atta a using (forslagspunkt_id)
where l.linje is not null
  and not exists (
    select 1 from punkt_linje o
    where o.forslagspunkt_id = l.forslagspunkt_id
      and o.parti <> l.parti
      and o.linje = l.linje
  );

create index punkt_ensam_parti_idx on punkt_ensam (parti);

-- Alla åtta partier finns med, även de som aldrig stod ensamma — att M, KD och
-- L har noll är en del av fyndet och får inte försvinna genom en inner join.
create materialized view parti_ensam as
with atta as (
  select count(*) as voteringar
  from (
    select forslagspunkt_id
    from punkt_linje
    where linje is not null
    group by forslagspunkt_id
    having count(*) = 8
  ) x
),
partier as (select unnest(array['S', 'M', 'SD', 'C', 'V', 'KD', 'MP', 'L']) as parti)
select p.parti,
       count(e.forslagspunkt_id)                       as ensam,
       (select voteringar from atta)                   as av,
       round(100.0 * count(e.forslagspunkt_id)
             / nullif((select voteringar from atta), 0), 1) as andel
from partier p
left join punkt_ensam e on e.parti = p.parti
group by p.parti;

-- De tre senaste per parti. Urvalet är datumordnat och därför inte handplockat.
create materialized view ensam_exempel as
select parti, linje, forslagspunkt_id, amne, beteckning, punkt, datum, sakfraga
from (
  select e.parti, e.linje, e.forslagspunkt_id, e.amne,
         f.beteckning, f.punkt, b.datum, k.sakfraga,
         row_number() over (partition by e.parti order by b.datum desc, f.id desc) as nr
  from punkt_ensam    e
  join forslagspunkt  f on f.id = e.forslagspunkt_id
  join betankande     b on b.dok_id = f.bet_dok_id
  join punkt_klartext k on k.forslagspunkt_id = e.forslagspunkt_id
) x
where nr <= 3;

-- --------------------------------------------------- när utskottet förlorade
-- Utskottets förslag ställs som Ja, reservationen som Nej. Kontrollerat mot
-- forslagspunkt.vinnare: i samtliga 2 569 voteringar med röstdata sammanfaller
-- ja > nej med vinnare = 'utskottet', utan ett enda motexempel.
--
-- Aritmetiken används ändå framför vinnare-fältet, eftersom fältet också
-- innehåller etiketterna 'bifall' och 'Avslagen' för punkter som utskottet
-- faktiskt vann — den som räknar `vinnare <> 'utskottet'` får 5 i stället för 2.
create view utskottet_forlorade as
select f.id as forslagspunkt_id, f.rm, f.beteckning, f.punkt, b.datum,
       k.amne, k.sakfraga, k.ja_innebar, k.nej_innebar,
       f.motforslag_nummer, f.motforslag_partier,
       j.ja, j.nej, j.avstar, j.franvarande, j.marginal
from forslagspunkt  f
join jamn_votering  j on j.votering_id = upper(f.votering_id)
join betankande     b on b.dok_id = f.bet_dok_id
join punkt_klartext k on k.forslagspunkt_id = f.id
where j.nej > j.ja;

-- ------------------------------------------------------------------- ämnen
-- Alla 28 partipar mäts likadant. Att peka ut ett par i förväg — säg M mot SD —
-- vore ett axelval, och projektet har redan avvisat axelval en gång på den
-- grunden (se docs/VALIDERING_LAGER3.md). Här får datat peka i stället.
--
-- Det högsta paret i ett ämne är alltid 100 % (M, KD och L röstar lika) och
-- därför oanvändbart som fynd. Det som bär är i stället avvikelsen: hur långt
-- ett par ligger från sin egen normalnivå i just det här ämnet.
create materialized view amne_oversikt as
with bas as (
  select parti_1, parti_2, samstammighet as normalt
  from partisamstammighet
  where amne = 'alla'
),
par as (
  select p.amne, p.parti_1, p.parti_2, p.gemensamma, p.samstammighet,
         b.normalt,
         p.samstammighet - b.normalt as delta
  from partisamstammighet p
  join bas b using (parti_1, parti_2)
  where p.amne <> 'alla'
)
select amne,
       max(gemensamma)              as voteringar,
       -- Sannolikheten att två slumpvis valda partier hamnade på samma linje.
       round(avg(samstammighet), 1) as kammarens_enighet,
       -- Paret som avviker mest från sin egen normalnivå i det här ämnet.
       (array_agg(parti_1        order by delta, parti_1))[1] as avvikande_1,
       (array_agg(parti_2        order by delta, parti_1))[1] as avvikande_2,
       (array_agg(samstammighet  order by delta, parti_1))[1] as avvikande_har,
       (array_agg(normalt        order by delta, parti_1))[1] as avvikande_normalt,
       min(delta)                                             as avvikande_delta,
       -- Paret som var mest oenigt i absoluta tal.
       (array_agg(parti_1        order by samstammighet, parti_1))[1] as lagsta_1,
       (array_agg(parti_2        order by samstammighet, parti_1))[1] as lagsta_2,
       min(samstammighet)                                             as lagsta
from par
group by amne;

-- De tre senaste voteringarna där ämnets mest avvikande par faktiskt gick isär.
-- Exemplen illustrerar därmed exakt den siffra de står bredvid, och urvalet är
-- datumordnat i stället för handplockat.
create materialized view amne_exempel as
select amne, forslagspunkt_id, parti_1, parti_2, linje_1, linje_2,
       beteckning, punkt, datum, sakfraga
from (
  select o.amne, a.forslagspunkt_id,
         o.avvikande_1 as parti_1, o.avvikande_2 as parti_2,
         a.linje as linje_1, b.linje as linje_2,
         f.beteckning, f.punkt, bt.datum, k.sakfraga,
         row_number() over (partition by o.amne order by bt.datum desc, f.id desc) as nr
  from amne_oversikt  o
  join punkt_linje    a  on a.amne = o.amne and a.parti = o.avvikande_1
  join punkt_linje    b  on b.forslagspunkt_id = a.forslagspunkt_id
                        and b.parti = o.avvikande_2
  join forslagspunkt  f  on f.id = a.forslagspunkt_id
  join betankande     bt on bt.dok_id = f.bet_dok_id
  join punkt_klartext k  on k.forslagspunkt_id = a.forslagspunkt_id
  where a.linje is not null and b.linje is not null and a.linje <> b.linje
) x
where nr <= 3;

-- ------------------------------------------------------------------ refresh
-- ETL:n uppdaterade tidigare tre vyer som den räknade upp vid namn i skriptet.
-- Följden blev att partisamstammighet och jamn_votering aldrig uppdaterades
-- efter att de lagts till, och sajten visade gamla siffror helt tyst.
--
-- Listan flyttas därför hit, i beroendeordning. Skriptet frågar efter den och
-- uppdaterar en vy per anrop — elva refresh i samma anrop spränger PostgREST:s
-- statement timeout.
create or replace function public.aggregat_vyer()
returns text[]
language sql
stable
as $$
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
$$;

create or replace function public.refresh_aggregat(vy text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Vitlistan gör format('%I') ofarlig och håller ordningen på ett ställe.
  if not (vy = any (public.aggregat_vyer())) then
    raise exception 'Okänd vy: %', vy;
  end if;
  execute format('refresh materialized view %I', vy);
end;
$$;

-- Samma publika läsrätt som övriga aggregat.
grant select on parti_ensam, ensam_exempel, amne_oversikt, amne_exempel,
                utskottet_forlorade
  to anon, authenticated;

-- punkt_linje och punkt_ensam är mellansteg utan egen läsare i frontend. Att
-- utelämna dem ovan räcker inte: Supabase delar ut läsrätt till anon som
-- standard, så de måste återkallas uttryckligen.
revoke select on punkt_linje, punkt_ensam from anon, authenticated;
