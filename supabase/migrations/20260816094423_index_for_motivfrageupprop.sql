-- Partiellt med flit. Motivfrågeröster är 12 564 av 909 145 rader — 1,4 % — och
-- ett fullt index på (votering_id, avser) väger ~90 MB på en databas som har
-- 91 MB kvar av sina 500. Predikatet i indexdefinitionen gör det till 112 kB.
--
-- Behövs därför att avser saknar index helt: utan det blir "vilka voteringar
-- gällde motivfrågan" en seq scan över 283 MB, alltså över anon-takets 3 s.
create index if not exists rost_motivfragan_idx
  on rost (votering_id)
  where avser = 'motivfrågan';
