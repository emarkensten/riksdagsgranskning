-- Vyn joinade de fyra räkningarna med inre join på rm. Ett riksmöte som ännu
-- saknar rader i en av tabellerna föll då ur vyn helt i stället för att visa
-- noll — och ETL:n läser betänkanden före anföranden, så det tillståndet är
-- ett normalt mellanläge under en körning, inte ett fel. Volymkortet hade
-- visat ett riksmöte färre än tabellerna på samma sida, utan att något
-- kastade.
create or replace view riksmote_volym as
with riksmoten as (
  select rm from betankande
  union
  select rm from forslagspunkt
  union
  select rm from reservation
  union
  select rm from anforande
),
b as (
  select rm, count(*) as betankanden from betankande group by 1
),
f as (
  select rm, count(*) as forslagspunkter, count(distinct votering_id) as voteringar
  from forslagspunkt group by 1
),
r as (
  select
    rm,
    count(*) as reservationer,
    count(*) filter (where partier is null or cardinality(partier) = 0) as utan_parti
  from reservation group by 1
),
a as (
  select rm, count(*) as anforanden from anforande group by 1
)
select
  riksmoten.rm,
  coalesce(b.betankanden, 0) as betankanden,
  coalesce(f.forslagspunkter, 0) as forslagspunkter,
  coalesce(f.voteringar, 0) as voteringar,
  coalesce(r.reservationer, 0) as reservationer,
  coalesce(r.utan_parti, 0) as utan_parti,
  coalesce(a.anforanden, 0) as anforanden
from riksmoten
left join b using (rm)
left join f using (rm)
left join r using (rm)
left join a using (rm);
