-- Frånvaro per parti och riksmöte.
--
-- Bygger på ledamot_franvaro (1 511 rader), inte på rost (909 145). Samma skäl
-- som parti_disciplin: aggregera på ett befintligt aggregat, annars slår vyn i
-- anons statement_timeout på 3 s. Se CLAUDE.md. Kör på 1 ms.
--
-- Partinivån räknas på alla ledamöter, även de som suttit kort period. Att
-- filtrera bort korttidsledamöter är rätt för en lista över enskilda men fel
-- för en jämförelse mellan partier — ersättare är en del av partiets närvaro.
--
-- Politiskt oberoende ('-') utesluts. Partisidan jämför partiets tal mot
-- kammarsnittet räknat ur samma vy, så båda talen måste ha samma population.
create or replace view parti_franvaro as
select parti,
       rm,
       sum(voteringar) as roster,
       sum(franvarande) as franvarande,
       round(100.0 * sum(franvarande) / nullif(sum(voteringar), 0), 1) as andel
from ledamot_franvaro
where parti is not null and parti <> '-'
group by parti, rm;

comment on view parti_franvaro is
  'Frånvaro per parti och riksmöte, räknad på alla ledamöter partiet haft i kammaren.';

-- Reservationer per parti.
--
-- reservation.partier är en text[], så räkningen kräver unnest och går inte att
-- göra i frontend.
--
-- Talet mäter maktposition minst lika mycket som aktivitet: regeringspartierna
-- ÄR utskottsmajoriteten och behöver därför nästan aldrig reservera sig
-- (MP 3 510, M 11). Det får aldrig presenteras som en rangordning mellan
-- partier — se docs/PLAN_EFTER_GRANSKNING.md.
create or replace view parti_reservation as
select p as parti,
       count(*) as reservationer,
       count(*) filter (where array_length(r.partier, 1) = 1) as ensamma
from reservation r, unnest(r.partier) as p
where p in ('S', 'M', 'SD', 'C', 'V', 'KD', 'MP', 'L')
group by p;

comment on view parti_reservation is
  'Antal reservationer partiet stod bakom, och hur många av dem det stod ensamt bakom.';

revoke all on parti_franvaro, parti_reservation from anon, authenticated;
grant select on parti_franvaro, parti_reservation to anon, authenticated;
