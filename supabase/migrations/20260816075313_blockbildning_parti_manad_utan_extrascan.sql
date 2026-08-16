-- Månadslistan togs först ur betankande union anforande, alltså ett tredje
-- svep över de två breda tabellerna: 2 337 ms, för nära anons tak på tre
-- sekunder. Månaderna finns redan i de två aggregaten nedan, och plockas
-- därifrån i stället.
create or replace view parti_manad as
with res as (
  select
    u.p as parti,
    date_trunc('month', b.datum)::date as manad,
    count(*) as antal
  from reservation r
  join betankande b on b.dok_id = r.bet_dok_id,
    lateral unnest(r.partier) as u(p)
  where b.datum is not null
  group by 1, 2
),
anf as (
  select parti, date_trunc('month', datum)::date as manad, count(*) as antal
  from anforande
  where datum is not null
  group by 1, 2
),
rutnat as (
  select p.parti, m.manad
  from unnest(array['S','M','SD','C','V','KD','MP','L']) as p(parti)
  cross join (
    select manad from res
    union
    select manad from anf
  ) as m
)
select
  rutnat.parti,
  rutnat.manad,
  coalesce(res.antal, 0) as reservationer,
  coalesce(anf.antal, 0) as anforanden
from rutnat
left join res on res.parti = rutnat.parti and res.manad = rutnat.manad
left join anf on anf.parti = rutnat.parti and anf.manad = rutnat.manad;
