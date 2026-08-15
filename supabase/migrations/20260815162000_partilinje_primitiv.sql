-- Partilinjen som en funktion, i stället för samma CASE på fyra ställen.
--
-- Migrationen 20260815100000 bröt ut regeln till punkt_linje "så att regeln
-- finns på ett ställe". Sedan dess har den kopierats tillbaka: samma CASE står
-- i punkt_linje, partisamstammighet, jamn_votering och parti_disciplin.
-- Ändras den — till exempel hur lika röstetal mellan ja och nej ska brytas —
-- och en kopia missas, visar sajten två olika partilinjer för samma votering
-- utan att något felar.
--
-- Funktionen är immutable, så planeraren inlinar den. Ingen prestandaskillnad;
-- refreshtiderna är mätta före och efter.
--
-- Kvar utanför: partilinje() i lib/db.ts, som är TypeScript och används på
-- rader hämtade från parti_rost. Den kan inte dela implementation med SQL, men
-- måste hållas i synk — den sorterar stabilt och bryter lika röstetal åt samma
-- håll som CASE:et nedan.

create or replace function partilinje(ja bigint, nej bigint, avstar bigint)
returns text
language sql
immutable
as $$
  select case
    when ja  >= nej and ja >= avstar and ja  > 0 then 'Ja'
    when nej >= avstar               and nej > 0 then 'Nej'
    when avstar > 0                              then 'Avstår'
  end
$$;

comment on function partilinje(bigint, bigint, bigint) is
  'Partiets linje: det alternativ flest närvarande ledamöter valde. Lika röstetal går till ja före nej före avstår.';

-- Hela kedjan byggs om. Ordningen är beroendeordning baklänges vid drop och
-- framlänges vid create — elva objekt, kontrollerade med pg_depend.
drop materialized view if exists amne_exempel;
drop materialized view if exists amne_oversikt;
drop materialized view if exists ensam_exempel;
drop materialized view if exists parti_ensam;
drop materialized view if exists punkt_ensam;
drop view if exists parti_utfall;
drop view if exists parti_disciplin;
drop view if exists utskottet_forlorade;
drop materialized view if exists punkt_linje;
drop materialized view if exists partisamstammighet;
drop materialized view if exists jamn_votering;

-- ------------------------------------------------------------------ ur parti_rost

create materialized view jamn_votering as
with linje as (
  select votering_id, ja, nej, avstar, franvarande,
         partilinje(ja, nej, avstar) as linje
  from parti_rost
), agg as (
  select votering_id,
         sum(ja) as ja, sum(nej) as nej, sum(avstar) as avstar,
         sum(franvarande) filter (where linje = 'Ja')  as franv_ja,
         sum(franvarande) filter (where linje = 'Nej') as franv_nej,
         sum(franvarande) as franvarande
  from linje group by votering_id
)
select votering_id, ja, nej, avstar, franvarande,
       abs(ja - nej) as marginal,
       (ja + coalesce(franv_ja, 0)) - (nej + coalesce(franv_nej, 0)) as marginal_fullsatt,
       sign(ja - nej) <> sign((ja + coalesce(franv_ja, 0)) - (nej + coalesce(franv_nej, 0)))
         and ja <> nej as franvaron_avgjorde
from agg a
where ja + nej > 0;

create unique index jamn_votering_votering_id_idx on jamn_votering (votering_id);
create index jamn_votering_marginal_idx on jamn_votering (marginal);

create materialized view partisamstammighet as
with linje as (
  select pr.votering_id, pr.parti, partilinje(pr.ja, pr.nej, pr.avstar) as linje
  from parti_rost pr
  where pr.parti in ('S', 'M', 'SD', 'C', 'V', 'KD', 'MP', 'L')
), med_amne as (
  select l.votering_id, l.parti, l.linje, f.rm, k.amne
  from linje l
  join forslagspunkt f on upper(f.votering_id) = upper(l.votering_id)
  left join punkt_klartext k on k.forslagspunkt_id = f.id
  where l.linje is not null
)
select a.parti as parti_1,
       b.parti as parti_2,
       coalesce(a.amne, 'alla') as amne,
       count(*) as gemensamma,
       count(*) filter (where a.linje = b.linje) as lika,
       round(100.0 * count(*) filter (where a.linje = b.linje) / count(*), 1) as samstammighet
from med_amne a
join med_amne b on a.votering_id = b.votering_id and a.parti < b.parti
group by grouping sets ((a.parti, b.parti), (a.parti, b.parti, a.amne));

create index partisamstammighet_parti_1_parti_2_idx on partisamstammighet (parti_1, parti_2);
create index partisamstammighet_amne_idx on partisamstammighet (amne);

create materialized view punkt_linje as
select f.id as forslagspunkt_id,
       f.rm,
       k.amne,
       pr.parti,
       partilinje(pr.ja, pr.nej, pr.avstar) as linje
from forslagspunkt f
join punkt_klartext k on k.forslagspunkt_id = f.id
join parti_rost pr on pr.votering_id = upper(f.votering_id)
where f.votering_id is not null
  and pr.parti in ('S', 'M', 'SD', 'C', 'V', 'KD', 'MP', 'L');

create index punkt_linje_punkt_idx on punkt_linje (forslagspunkt_id);
create index punkt_linje_parti_idx on punkt_linje (parti);

-- Avlagda röster som avviker från partiets linje. Aggregerar på parti_rost,
-- inte på rost — se 20260815143932.
create view parti_disciplin as
with linje as (
  select parti, ja, nej, avstar, partilinje(ja, nej, avstar) as linje
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

-- ------------------------------------------------------------- ur punkt_linje

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

-- ---------------------------------------------------------- ur jamn_votering

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

create view parti_utfall as
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

comment on view parti_utfall is
  'Andel voteringar där partiets linje sammanföll med den vinnande sidan. Avstår räknas aldrig som vinnande.';

-- ------------------------------------------------------------------- ämnen

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
       round(avg(samstammighet), 1) as kammarens_enighet,
       (array_agg(parti_1        order by delta, parti_1))[1] as avvikande_1,
       (array_agg(parti_2        order by delta, parti_1))[1] as avvikande_2,
       (array_agg(samstammighet  order by delta, parti_1))[1] as avvikande_har,
       (array_agg(normalt        order by delta, parti_1))[1] as avvikande_normalt,
       min(delta)                                             as avvikande_delta,
       (array_agg(parti_1        order by samstammighet, parti_1))[1] as lagsta_1,
       (array_agg(parti_2        order by samstammighet, parti_1))[1] as lagsta_2,
       min(samstammighet)                                             as lagsta
from par
group by amne;

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

-- ------------------------------------------------------------------ grants
-- punkt_linje och punkt_ensam lämnas oåtkomliga för anon: frontend läser dem
-- inte, och 20 552 rader ska inte ligga öppna utan läsare. Se 20260815135952.
revoke all on punkt_linje, punkt_ensam from anon, authenticated;
grant select on jamn_votering, partisamstammighet, parti_disciplin, parti_ensam,
                ensam_exempel, utskottet_forlorade, parti_utfall,
                amne_oversikt, amne_exempel
  to anon, authenticated;
