-- Sidfotens tal, på en rad.
--
-- Sidfoten ligger i rotlayouten och renderas alltså på varje sida. Tre
-- separata frågor hade blivit tre tur och retur per sidvisning; den här är en,
-- och tar 22 ms.
--
-- ledamoter räknas ur ledamot_franvaro och inte ur ledamot: tabellen ledamot
-- bär 2 898 rader — alla som någon gång haft ett uppdrag — medan 426 är de som
-- faktiskt lagt en röst under mandatperioden. Det är den senare siffran som
-- svarar på vad sajten omfattar.
create or replace view sajtens_omfattning as
select
  (select count(*) from punkt_klartext) as voteringar,
  (select count(distinct intressent_id) from ledamot_franvaro) as ledamoter,
  (select count(distinct rm) from forslagspunkt) as riksmoten,
  (select max(uppdaterad) from ledamot) as hamtat;

grant select on sajtens_omfattning to anon, authenticated;
