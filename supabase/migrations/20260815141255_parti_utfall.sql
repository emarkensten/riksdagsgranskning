-- Hur ofta ett partis linje låg på den vinnande sidan.
--
-- Utskottets förslag ställs alltid som ja och reservationen som nej, så
-- vinnaren räknas ur ja/nej i stället för att läsas ur forslagspunkt.vinnare
-- — det fältet innehåller 'bifall', 'Avslagen' och null även för punkter som
-- utskottet faktiskt vann.
--
-- En vanlig vy, inte materialiserad: den aggregerar ~20 000 rader på någon
-- millisekund och kostar inget utrymme i en databas som ligger på 407 MB av 500.
create or replace view parti_utfall as
with utfall as (
  select f.id as forslagspunkt_id,
         case when j.ja > j.nej then 'Ja'
              when j.nej > j.ja then 'Nej' end as vann
  from forslagspunkt f
  join jamn_votering j on j.votering_id = upper(f.votering_id)
  join punkt_klartext k on k.forslagspunkt_id = f.id
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

-- Vyer stöder inte RLS. Supabase delar dessutom ut grant all till anon som
-- standard, så rättigheterna måste sättas uttryckligen — se migrationen
-- 20260815135952.
revoke all on parti_utfall from anon, authenticated;
grant select on parti_utfall to anon, authenticated;
