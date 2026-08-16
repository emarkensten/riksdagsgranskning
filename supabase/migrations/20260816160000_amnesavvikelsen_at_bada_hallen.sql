-- Ämnesavvikelsen mättes bara åt ena hållet.
--
-- amne_oversikt valde det avvikande paret med min(delta) och sorterade på
-- delta stigande. Båda plockar det *mest negativa* paret — det som röstar mer
-- olikt än vanligt. Ett par som röstar ovanligt *lika* i ett ämne kunde alltså
-- aldrig vinna urvalet, hur stort utslaget än var.
--
-- Sidorna påstod under tiden absolutbelopp. Startsidan skrev "Ingen annan
-- ämnesskillnad i riksdagen är större" om KD–SD i näringsliv, −23,0. Men
-- KD–MP i konstitution och demokrati ligger +24,8 — en större ämnesskillnad,
-- osynlig för vyn. Tre ämnen hade en större positiv än negativ avvikelse, och
-- två av dem sorterades till /amnens "saknar tydlig avvikelse" med motiveringen
-- att det mest avvikande paret låg under fem procentenheter från sin normalnivå.
-- KD–MP låg 24,8 från sin. Sajten avfärdade alltså ett av riksdagens starkaste
-- ämnesmönster: regeringspartierna och MP möts i grundlagsfrågor.
--
-- Måttet är avståndet från parets egen normalnivå. Ett avstånd har ingen
-- riktning, så urvalet rankas nu på abs(delta) och tecknet följer med ut som
-- avvikande_delta för den som ska formulera meningen. avvikande_storlek finns
-- för att PostgREST ska kunna sortera utan att räkna om uttrycket.
--
-- De fem array_agg(... order by delta, parti_1)[1] är samtidigt utbytta mot
-- distinct on. De gav rätt svar bara så länge alla fem sorteringarna hölls
-- identiska; ändrades en och glömdes en annan kom parti_1 från ett par och
-- samstammighet från ett annat, hopfogat till en rad som aldrig funnits.
-- distinct on säger i stället att alla fält kommer från samma rad.

drop materialized view if exists amne_exempel;
drop materialized view if exists amne_oversikt;

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
-- Paret som ligger längst från sin egen normalnivå i ämnet, åt endera hållet.
avvikande as (
  select distinct on (amne) amne, parti_1, parti_2, samstammighet, normalt, delta
  from par
  order by amne, abs(delta) desc, parti_1, parti_2
),
-- Paret som var mest oenigt i absoluta tal. Ett annat mått, eget urval.
lagsta as (
  select distinct on (amne) amne, parti_1, parti_2, samstammighet
  from par
  order by amne, samstammighet, parti_1, parti_2
),
helhet as (
  select amne,
         max(gemensamma)              as voteringar,
         -- Sannolikheten att två slumpvis valda partier hamnade på samma linje.
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
       -- Tecknet bär riktningen: negativt = röstar mer olikt än vanligt.
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

-- De tre senaste voteringarna som illustrerar ämnets avvikelse.
--
-- Vilka voteringar som illustrerar den beror på riktningen. Går paret isär mer
-- än vanligt är det de voteringar där de faktiskt gick isär som visar det. Är
-- paret ovanligt samstämmigt vore samma urval en illustration av undantaget i
-- stället för av mönstret — då är det de gemensamma rösterna som bär siffran.
-- Urvalet är datumordnat, inte handplockat.
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
    -- Negativ avvikelse vill ha särskiljandet, positiv vill ha sammanfallet.
    and (a.linje <> b.linje) = (o.avvikande_delta < 0)
) x
where nr <= 3;

comment on materialized view amne_exempel is
  'Tre voteringar per ämne som illustrerar avvikelsen. Urvalet följer '
  'riktningen: isärgående vid negativ avvikelse, gemensamma vid positiv.';

-- Samma publika läsrätt som före omskrivningen.
grant select on amne_oversikt, amne_exempel to anon, authenticated;
