-- Vad namnuppropet gällde, punkt för punkt — härlett, inte subtraherat.
--
-- /metod förklarar varför voteringssidan listar fler beslut än startsidan
-- räknar mönster på. Talet stod tidigare som `listade - voteringar`, alltså en
-- differens mellan två vyer, och sidan påstod sedan om den differensen att
-- "uppropet gällde motivfrågan". Det var sant, men inte för att någon räknat
-- efter: en punkt som föll ur den ena vyn av något annat skäl hade fått samma
-- påstående klistrat på sig.
--
-- Klassificeringen sker på tre uteslutande fall i stället, så att summan måste
-- gå ihop och en ny orsak dyker upp som ett tal i utan_upprop i stället för att
-- tyst räknas som motivfråga.
--
-- Räknar på parti_rost och inte på rost: matvyn bär redan filtret
-- `avser = 'sakfrågan'` i sin definition, och en votering finns i den bara om
-- den hade ett sakfrågeupprop. Det gör sakfrågeledet till en join mot 4 MB i
-- stället för en scan över 283. Mätt: 3 352 ms -> 24 ms.
--
-- upper() därför att forslagspunkt.votering_id och rost.votering_id inte är
-- garanterat samma skiftläge — punkt_linje gör likadant, och utan det blir
-- svaret en tyst nolla i stället för ett fel.
create or replace view punkt_uppropstyp as
with sak as (
  select distinct votering_id from parti_rost
), motiv as (
  select distinct votering_id from rost where avser = 'motivfrågan'
)
select
  count(*)                                          as listade,
  count(*) filter (where s.votering_id is not null) as sakfragan,
  count(*) filter (where s.votering_id is null
                     and m.votering_id is not null) as motivfragan,
  count(*) filter (where s.votering_id is null
                     and m.votering_id is null)     as utan_upprop
from votering_lista vl
left join sak   s on s.votering_id = upper(vl.votering_id)
left join motiv m on m.votering_id = upper(vl.votering_id);

comment on view punkt_uppropstyp is
  'Förslagspunkter med klarspråk, delade på vad namnuppropet gällde. '
  'Summan sakfragan + motivfragan + utan_upprop = listade.';

grant select on punkt_uppropstyp to anon, authenticated;
