-- Platt lista över de förklarade voteringarna, för /voteringar.
--
-- Finns för att listan ska kunna sorteras på datum och pagineras i databasen.
-- Tidigare sorterades den på forslagspunkt_id, vilket INTE är kronologiskt:
-- riksmötet 2024/25 har id 2–2344 därför att det importerades först, medan
-- 2025/26 ligger på 6565–8973. En lista kapad vid 120 rader visade alltså
-- 2024/25 överst av ren importordning — samma slump som gjorde den gamla
-- rubriken "Riksmötet 2024/25" sann utan att vara det av rätt skäl.
--
-- Datumet är betänkandets. Riksmötena överlappar i datum eftersom ett
-- betänkande kan avgöras efter att nästa riksmöte inletts; sorteringen svarar
-- på "när beslutades det", vilket är den ordning en läsare förväntar sig.
--
-- 36 ms för de fyrtio första raderna. Se tresekundersregeln i CLAUDE.md.
create or replace view votering_lista as
select k.forslagspunkt_id,
       f.rm,
       f.beteckning,
       f.punkt,
       f.votering_id,
       f.motforslag_partier,
       b.datum,
       b.titel as betankande,
       b.organ,
       k.sakfraga,
       k.amne,
       k.sakerhet
from punkt_klartext k
join forslagspunkt f on f.id = k.forslagspunkt_id
join betankande b on b.dok_id = f.bet_dok_id;

comment on view votering_lista is
  'De förklarade voteringarna som en platt lista, sorterbar på datum och pagineringsbar.';

revoke all on votering_lista from anon, authenticated;
grant select on votering_lista to anon, authenticated;
