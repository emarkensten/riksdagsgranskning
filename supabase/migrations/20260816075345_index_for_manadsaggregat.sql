-- parti_manad räknar rader per parti och månad, men båda tabellerna bär en
-- bred textkolumn: anforande.text är i snitt 2 953 tecken, så ett svep över
-- 56 177 rader läser ungefär 165 MB från heapen för att komma åt två små
-- fält. Det tog 1,3 s, och anon har 3 s.
--
-- Täckande index i stället: de två fälten ryms i indexet, och frågan behöver
-- aldrig röra raden. Efter det 172 ms, med Heap Fetches: 0 i båda
-- index only-scanningarna. Tabellerna skrivs med upsert och byggs aldrig om,
-- så indexen överlever ETL-körningarna.
create index if not exists anforande_parti_datum_idx
  on anforande (parti, datum);

create index if not exists reservation_bet_dok_id_partier_idx
  on reservation (bet_dok_id) include (partier);

analyze anforande;
analyze reservation;
