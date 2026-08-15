-- Databasen låg på 460 MB av gratisplanens 500. Tre index på rost stod för
-- 53 MB utan att någon fråga använde dem.
--
-- Mätt med pg_stat_user_indexes 2026-08-15:
--
--   rost_votering_id_intressent_id_avser_key   114 MB   1 590 853 scans
--   rost_pkey                                   34 MB           0 scans
--   rost_rm_idx                                 14 MB          10 scans
--   rost_intressent_id_idx                      11 MB          15 scans
--   rost_rost_idx                               10 MB           1 scan
--   rost_parti_idx                            8872 kB           1 scan
--
-- Ingenting i app/ eller lib/ läser tabellen rost direkt — allt går via de
-- materialiserade vyerna, som byggs med sekvensiella genomsökningar. Det enda
-- index som faktiskt arbetar är unik-nyckeln, som ETL:ns upsert träffar.

-- Surrogatnyckeln id frågas aldrig. Tabellens verkliga nyckel är
-- (votering_id, intressent_id, avser), och den unika begränsningen står kvar.
-- Kolumnen id lämnas orörd: att släppa den kräver en tabellomskrivning, och
-- den behöver dubbelt utrymme på en disk som redan är trång.
alter table rost drop constraint rost_pkey;

-- Btree över fyra respektive nio distinkta värden. Ett sådant index kan i
-- praktiken inte hjälpa en fråga, och ingen fråga har bett om det.
drop index if exists rost_rost_idx;
drop index if exists rost_parti_idx;

-- rost_rm_idx och rost_intressent_id_idx står kvar med flit. De har låg
-- användning men täcker dimensioner som en framtida fråga rimligen vill ha,
-- och 25 MB behövs inte när de tre ovan räcker för att komma ned till ~407 MB.
