-- 'alla' kunde betyda två saker i partisamstammighet.
--
-- Vyn bygger totalraden och ämnesraderna i samma fråga, med grouping sets, och
-- märkte totalraden med coalesce(a.amne, 'alla'). Coalesce kan inte skilja på
-- "den här raden saknar ämne för att den ÄR totalen" och "den här raden saknar
-- ämne för att förslagspunkten aldrig klassificerades". Båda blev 'alla'.
--
-- Ämnet kommer från en left join mot punkt_klartext. Varje förslagspunkt som
-- har röstdata men saknar klartext ger därför en andra rad märkt 'alla' per
-- partipar — med ett helt annat underlag än totalen.
--
-- Det får inte synas som ett fel någonstans. Det får synas som andra tal:
--
--   * amne_oversikt joinar sin baslinje på amne = 'alla'. Två träffar per par
--     dubblerar raderna, så kammarens_enighet blir ett medelvärde över
--     dubbletter och avvikelsen mäts mot en delvis förorenad normalnivå.
--   * regeringsspann() och partisidornas motpartslistor får 56 rader i stället
--     för 28, och samma parti listas två gånger med olika siffra.
--
-- Ingenting kastar. Sajten visar bara fel.
--
-- Kontrollerat 2026-08-16: 476 rader (28 par × 16 ämnen + 28 totaler), alltså
-- inga dubbletter i dag — men 6 390 förslagspunkter saknar klartext. De når
-- inte vyn bara därför att ingen av dem råkar ha röstdata. En enda punkt med
-- namnupprop som importeras innan lager 2 hunnit klassificera den räcker.
--
-- Fixen låter grouping() avgöra etiketten i stället för värdet. Då kan 'alla'
-- bara uppstå ur det grupperingsset som faktiskt är totalen, och having-satsen
-- kastar den oklassificerade ämnesgruppen. Totalen räknar fortfarande varje
-- votering, klassificerad eller ej — det är rätt baslinje att jämföra mot.

drop materialized view if exists amne_exempel;
drop materialized view if exists amne_oversikt;
drop materialized view if exists partisamstammighet;

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
       -- Etiketten kommer ur grupperingen, inte ur värdet.
       case when grouping(a.amne) = 1 then 'alla' else a.amne end as amne,
       count(*) as gemensamma,
       count(*) filter (where a.linje = b.linje) as lika,
       round(100.0 * count(*) filter (where a.linje = b.linje) / count(*), 1) as samstammighet
from med_amne a
join med_amne b on a.votering_id = b.votering_id and a.parti < b.parti
group by grouping sets ((a.parti, b.parti), (a.parti, b.parti, a.amne))
-- Totalen behålls alltid. Ämnesgruppen behålls bara när ämnet finns.
having grouping(a.amne) = 1 or a.amne is not null;

comment on materialized view partisamstammighet is
  'Hur ofta varje partipar hamnade på samma linje, per ämne och totalt. '
  'Raden amne = ''alla'' är totalen och kan bara uppstå ur totalgruppen.';

create index partisamstammighet_parti_1_parti_2_idx on partisamstammighet (parti_1, parti_2);
create index partisamstammighet_amne_idx on partisamstammighet (amne);

grant select on partisamstammighet to anon, authenticated;

-- Oförändrade sedan 20260816160000, men måste byggas om: de föll med cascade.
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
),
avvikande as (
  select distinct on (amne) amne, parti_1, parti_2, samstammighet, normalt, delta
  from par
  order by amne, abs(delta) desc, parti_1, parti_2
),
lagsta as (
  select distinct on (amne) amne, parti_1, parti_2, samstammighet
  from par
  order by amne, samstammighet, parti_1, parti_2
),
helhet as (
  select amne,
         max(gemensamma)              as voteringar,
         round(avg(samstammighet), 1) as kammarens_enighet
  from par
  group by amne
)
select h.amne,
       h.voteringar,
       h.kammarens_enighet,
       a.parti_1        as avvikande_1,
       a.parti_2        as avvikande_2,
       a.samstammighet  as avvikande_har,
       a.normalt        as avvikande_normalt,
       a.delta          as avvikande_delta,
       abs(a.delta)     as avvikande_storlek,
       l.parti_1        as lagsta_1,
       l.parti_2        as lagsta_2,
       l.samstammighet  as lagsta
from helhet h
join avvikande a using (amne)
join lagsta    l using (amne);

comment on materialized view amne_oversikt is
  'Per ämne: kammarens enighet, paret längst från sin normalnivå (åt endera '
  'hållet — tecknet i avvikande_delta bär riktningen) och det mest oeniga paret.';

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
  where a.linje is not null and b.linje is not null
    and (a.linje <> b.linje) = (o.avvikande_delta < 0)
) x
where nr <= 3;

comment on materialized view amne_exempel is
  'Tre voteringar per ämne som illustrerar avvikelsen. Urvalet följer '
  'riktningen: isärgående vid negativ avvikelse, gemensamma vid positiv.';

grant select on amne_oversikt, amne_exempel to anon, authenticated;
