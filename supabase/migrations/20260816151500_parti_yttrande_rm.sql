-- Särskilda yttranden per parti och riksmöte, bredvid reservationerna.
--
-- Finns för att svara på /blockens svåraste invändning: ett parti som slutar
-- reservera sig kanske bara bytte instrument. Ett särskilt yttrande markerar
-- avvikande uppfattning utan att opponera mot beslutet, och vore det naturliga
-- steget för ett regeringsunderlag som fortfarande har invändningar.
--
-- Rutnätet med alla åtta partier gånger alla riksmöten är avsiktligt, precis
-- som i parti_reservation_rm: ett parti som inte skrev ett enda yttrande ska
-- ge en nolla och inte försvinna ur tabellen. Skillnaden mellan "noll" och
-- "raden saknas" är hela poängen med måttet.
--
-- Ett yttrande med flera partier räknas för vart och ett — samma konvention
-- som reservationerna, annars går de två talen inte att jämföra.
create or replace view parti_yttrande_rm as
with rutnat as (
  select p.parti, r.rm
  from unnest(array['S','M','SD','C','V','KD','MP','L']) p(parti)
  cross join (select distinct rm from betankande) r
), raknat as (
  select u.p as parti, y.rm, count(*) as yttranden
  from sarskilt_yttrande y, lateral unnest(y.partier) u(p)
  group by u.p, y.rm
)
select rutnat.parti,
       rutnat.rm,
       coalesce(raknat.yttranden, 0) as yttranden
from rutnat
left join raknat on raknat.parti = rutnat.parti and raknat.rm = rutnat.rm;

comment on view parti_yttrande_rm is
  'Särskilda yttranden per parti och riksmöte. Nollrader bevaras med flit.';

grant select on parti_yttrande_rm to anon, authenticated;
