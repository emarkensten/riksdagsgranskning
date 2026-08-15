-- Debatten som hör till ett betänkande, sammanräknad per parti.
--
-- Joinen anforande.rel_dok_id → betankande.dok_id är verifierad: 23 304 av
-- 47 718 anföranden med rel_dok_id pekar på ett betänkande vi har, fördelade
-- på 1 121 av 1 442 betänkanden. Median 15 anföranden, spann 1–131.
--
-- Notera nivån: debatten hör till BETÄNKANDET, inte till en enskild
-- förslagspunkt. Ett betänkande kan innehålla flera punkter, och anförandena
-- går inte att fördela mellan dem utan tolkning. Frontend skriver ut det.
--
-- Ingen text summeras här. All summering av anförandena kräver LLM-batch och
-- därmed kostnadsuppskattning enligt arbetsreglerna i CLAUDE.md.
--
-- 6,8 ms per betänkande via anforande_rel_dok_id_idx.
create or replace view betankande_debatt as
select rel_dok_id as bet_dok_id,
       parti,
       count(*) as anforanden,
       count(distinct intressent_id) as talare
from anforande
where rel_dok_id is not null and parti is not null
group by rel_dok_id, parti;

comment on view betankande_debatt is
  'Antal anföranden och talare per parti i debatten om ett betänkande.';

revoke all on betankande_debatt from anon, authenticated;
grant select on betankande_debatt to anon, authenticated;
