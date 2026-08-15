-- De fem aggregat som saknades i migrationshistoriken.
--
-- parti_rost, ledamot_franvaro, riksmote_summering, jamn_votering och
-- partisamstammighet skapades utanför migrationerna. Migrationen
-- 20260815100000 bygger punkt_linje ovanpå parti_rost, och allt som kommit
-- sedan dess bygger vidare på dem — men ingen migration skapade dem. En färsk
-- klon plus `supabase db reset` gav därför ett schema som inte fungerar, och
-- felet syns först när en sida kraschar.
--
-- Definitionerna är hämtade ur pg_matviews på den körande databasen, inte
-- återskrivna ur minnet. `if not exists` gör migrationen till en no-op mot
-- produktion och funktionell mot en tom databas.
--
-- Kontrollerat: varje omskriven definition ger exakt samma rader som vyn den
-- ersätter. Symmetrisk differens (A except B plus B except A) är noll för
-- samtliga fem — parti_rost, ledamot_franvaro, riksmote_summering,
-- jamn_votering (2 569 rader) och partisamstammighet (476 rader).
-- Omformateringen är alltså kosmetisk, inte semantisk.
--
-- Ordningen är beroendeordningen: rost → parti_rost → jamn_votering och
-- partisamstammighet. Filen är numrerad 000400 för att sortera efter
-- RLS-migrationen och före 20260815100000, som bygger punkt_linje ovanpå
-- parti_rost. Mot en tom databas körs mappen därmed rakt igenom.

-- ------------------------------------------------------------- ur rost direkt

-- Röster per parti och votering. Grunden för allt partirelaterat på sajten.
create materialized view if not exists parti_rost as
select votering_id,
       parti,
       count(*) filter (where rost = 'Ja')          as ja,
       count(*) filter (where rost = 'Nej')         as nej,
       count(*) filter (where rost = 'Avstår')      as avstar,
       count(*) filter (where rost = 'Frånvarande') as franvarande,
       count(*)                                     as totalt
from rost
where avser = 'sakfrågan'
group by votering_id, parti;

-- Unikt index: krävs för refresh materialized view concurrently, och gör
-- uppslag per votering snabba.
create unique index if not exists parti_rost_votering_id_parti_idx
  on parti_rost (votering_id, parti);

-- Frånvaro per ledamot och riksmöte.
create materialized view if not exists ledamot_franvaro as
select intressent_id,
       parti,
       rm,
       count(*)                                     as voteringar,
       count(*) filter (where rost = 'Frånvarande') as franvarande,
       round(100.0 * count(*) filter (where rost = 'Frånvarande') / count(*), 1) as andel
from rost r
where avser = 'sakfrågan'
group by intressent_id, parti, rm;

create unique index if not exists ledamot_franvaro_intressent_id_parti_rm_idx
  on ledamot_franvaro (intressent_id, parti, rm);
create index if not exists ledamot_franvaro_rm_idx on ledamot_franvaro (rm);

-- Frånvaro och volym per riksmöte. Talet för hela perioden måste summeras ur
-- de här raderna — den enskilda raden är en annan siffra.
create materialized view if not exists riksmote_summering as
select rm,
       count(distinct votering_id)                  as voteringar,
       count(*)                                     as roster,
       count(*) filter (where rost = 'Frånvarande') as franvarande,
       round(100.0 * count(*) filter (where rost = 'Frånvarande') / count(*), 1) as franvaroandel
from rost
where avser = 'sakfrågan'
group by rm;

create unique index if not exists riksmote_summering_rm_idx on riksmote_summering (rm);

-- ------------------------------------------------------------- ur parti_rost

-- Jämna voteringar, och om frånvaron kunde ha vänt utfallet.
--
-- marginal_fullsatt lägger tillbaka varje frånvarande på sitt partis linje.
-- franvaron_avgjorde är sant när tecknet på marginalen då byter — alltså när
-- utfallet hade blivit det motsatta. Ren aritmetik: riksdagen kvittar
-- frånvaro, och vilka voteringar som kvittades framgår inte av öppna data.
create materialized view if not exists jamn_votering as
with linje as (
  select votering_id, parti, ja, nej, avstar, franvarande,
         case
           when ja  >= nej and ja >= avstar and ja  > 0 then 'Ja'
           when nej >= avstar               and nej > 0 then 'Nej'
           when avstar > 0                              then 'Avstår'
         end as linje
  from parti_rost
), agg as (
  select votering_id,
         sum(ja)     as ja,
         sum(nej)    as nej,
         sum(avstar) as avstar,
         sum(franvarande) filter (where linje = 'Ja')  as franv_ja,
         sum(franvarande) filter (where linje = 'Nej') as franv_nej,
         sum(franvarande) as franvarande
  from linje
  group by votering_id
)
select votering_id,
       ja,
       nej,
       avstar,
       franvarande,
       abs(ja - nej) as marginal,
       (ja + coalesce(franv_ja, 0)) - (nej + coalesce(franv_nej, 0)) as marginal_fullsatt,
       sign(ja - nej) <> sign((ja + coalesce(franv_ja, 0)) - (nej + coalesce(franv_nej, 0)))
         and ja <> nej as franvaron_avgjorde
from agg a
where ja + nej > 0;

create unique index if not exists jamn_votering_votering_id_idx
  on jamn_votering (votering_id);
create index if not exists jamn_votering_marginal_idx on jamn_votering (marginal);

-- Samstämmighet för varje partipar, per ämne och totalt.
--
-- GROUPING SETS ger både raden för 'alla' och en rad per ämne i samma pass.
-- Villkoret a.parti < b.parti lagrar varje par en gång; frontend måste vända
-- paret för att hitta alla sju motparter till ett givet parti.
create materialized view if not exists partisamstammighet as
with linje as (
  select pr.votering_id,
         pr.parti,
         case
           when pr.ja  >= pr.nej and pr.ja >= pr.avstar and pr.ja  > 0 then 'Ja'
           when pr.nej >= pr.avstar                     and pr.nej > 0 then 'Nej'
           when pr.avstar > 0                                          then 'Avstår'
         end as linje
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

create index if not exists partisamstammighet_parti_1_parti_2_idx
  on partisamstammighet (parti_1, parti_2);
create index if not exists partisamstammighet_amne_idx on partisamstammighet (amne);

-- Vyer stöder inte RLS och skyddas bara av grant. Supabase delar dessutom ut
-- grant all till anon som standard. Se CLAUDE.md under Databas.
revoke all on parti_rost, ledamot_franvaro, riksmote_summering,
               jamn_votering, partisamstammighet
  from anon, authenticated;
grant select on parti_rost, ledamot_franvaro, riksmote_summering,
                jamn_votering, partisamstammighet
  to anon, authenticated;

-- NOT OM PRODUKTIONSDATABASEN
--
-- Versionen 20260815000400 finns inte i supabase_migrations.schema_migrations
-- på den körande databasen, eftersom vyerna skapades utanför migrationerna.
-- Nästa `supabase db push` kommer därför att applicera filen — vilket är
-- ofarligt: varje sats är `if not exists`, så den är en no-op mot ett schema
-- där vyerna redan finns, och registrerar bara versionen i historiken.
