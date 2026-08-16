-- Fem aggregat som sidan /blocken läser. Vanliga vyer, inte materialiserade:
-- underlaget är redan aggregerat (punkt_linje) eller litet (reservation,
-- betankande), och ingen av frågorna ligger nära anons tak på tre sekunder.

-- Andel voteringar där partiets linje sammanföll med utskottets förslag, per
-- riksmöte. Utskottets förslag ställs alltid som ja och reservationen som nej,
-- så andelen ja ÄR andelen med utskottet. Nämnaren är alla voteringar med
-- namnupprop och klarspråksförklaring, alltså samma 2 569 för varje parti.
create or replace view parti_linje as
select
  l.parti,
  l.rm,
  count(*) as voteringar,
  count(*) filter (where l.linje = 'Ja') as med_utskottet,
  round(100.0 * count(*) filter (where l.linje = 'Ja') / count(*), 1) as andel
from punkt_linje l
group by l.parti, l.rm;

-- Reservationer per parti och riksmöte, och hur många av dem partiet skrev
-- tillsammans med minst ett annat.
--
-- Rutnätet parti × riksmöte fylls i förväg och vänsterjoinas: Liberalerna
-- skrev noll reservationer 2025/26, och utan rutnätet hade den raden helt
-- enkelt saknats. En nolla som uteblir blir ett tomt fält på sidan i stället
-- för siffran noll, vilket är ett annat påstående.
create or replace view parti_reservation_rm as
with rutnat as (
  select p.parti, r.rm
  from unnest(array['S','M','SD','C','V','KD','MP','L']) as p(parti)
  cross join (select distinct rm from betankande) as r
),
raknat as (
  select
    u.p as parti,
    res.rm,
    count(*) as reservationer,
    count(*) filter (where cardinality(res.partier) > 1) as gemensamma
  from reservation res,
    lateral unnest(res.partier) as u(p)
  group by 1, 2
)
select
  rutnat.parti,
  rutnat.rm,
  coalesce(raknat.reservationer, 0) as reservationer,
  coalesce(raknat.gemensamma, 0) as gemensamma,
  case
    when coalesce(raknat.reservationer, 0) > 0
    then round(100.0 * raknat.gemensamma / raknat.reservationer, 1)
  end as andel_gemensamma
from rutnat
left join raknat on raknat.parti = rutnat.parti and raknat.rm = rutnat.rm;

-- Reservationer och anföranden per parti och månad.
--
-- Bara månader där kammaren gjorde något finns med. Sommaruppehållet är
-- därmed frånvaro av rader, inte rader med nollor — sidan ritar det som ett
-- glapp, och en nolla i juli hade varit ett påstående om att partiet lät bli.
-- Reservationens månad är betänkandets datum; reservationen har inget eget.
--
-- Skrivs om direkt i 20260816075313, av prestandaskäl. Se den migrationen.
create or replace view parti_manad as
with manader as (
  select distinct date_trunc('month', datum)::date as manad
  from (
    select datum from betankande where datum is not null
    union all
    select datum from anforande where datum is not null
  ) as d
),
rutnat as (
  select p.parti, m.manad
  from unnest(array['S','M','SD','C','V','KD','MP','L']) as p(parti)
  cross join manader as m
),
res as (
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
)
select
  rutnat.parti,
  rutnat.manad,
  coalesce(res.antal, 0) as reservationer,
  coalesce(anf.antal, 0) as anforanden
from rutnat
left join res on res.parti = rutnat.parti and res.manad = rutnat.manad
left join anf on anf.parti = rutnat.parti and anf.manad = rutnat.manad;

-- Volymen per riksmöte. Svaret på invändningen att det sista riksmötet skulle
-- vara ofullständigt: nämnaren ska kunna läsas bredvid täljaren.
create or replace view riksmote_volym as
with b as (
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
select b.rm, b.betankanden, f.forslagspunkter, f.voteringar,
       r.reservationer, r.utan_parti, a.anforanden
from b
join f using (rm)
join r using (rm)
join a using (rm);

-- Samma mått som parti_linje, men brutet på utskott. Prövar om en förändring
-- är koncentrerad till vissa sakområden eller ligger jämnt över alla.
create or replace view utskott_linje as
select
  b.organ,
  l.rm,
  l.parti,
  count(*) as voteringar,
  count(*) filter (where l.linje = 'Ja') as med_utskottet,
  round(100.0 * count(*) filter (where l.linje = 'Ja') / count(*), 1) as andel
from punkt_linje l
join forslagspunkt f on f.id = l.forslagspunkt_id
join betankande b on b.dok_id = f.bet_dok_id
group by 1, 2, 3;

-- ------------------------------------------------------------------ grants
-- Vyer stöder inte RLS och skyddas bara av grants. De fem läser publika
-- aggregat och inget annat, och frontend läser alla fem.
grant select on parti_linje, parti_reservation_rm, parti_manad,
                riksmote_volym, utskott_linje
  to anon, authenticated;
