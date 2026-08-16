-- Särskilda yttranden — det svagare instrumentet bredvid reservationen.
--
-- En reservation är ett motförslag som ställs mot utskottets och röstas om.
-- Ett särskilt yttrande markerar en avvikande uppfattning utan att opponera
-- mot beslutet: det röstas aldrig om, och syns därför inte i en enda siffra
-- sajten haft hittills. /blocken ställer frågan om ett parti som slutar
-- reservera sig har tystnat eller fått igenom sin politik i förväg, och utan
-- det här måttet kan sidan bara svara med tre citat.
--
-- Ingen textkolumn, till skillnad från reservation. Två skäl:
--
--   Reservationstexten behövs för att tolka en röst — ett Nej betyder i regel
--   "vi föredrar reservation N", och voteringssidan skriver ut vad det var.
--   Ett särskilt yttrande avgör ingen votering och behöver inte tolkas.
--
--   Databasen har 91 MB kvar av 500, och reservation väger 32 MB varav nästan
--   allt är text. Läsaren når originalet via betänkandelänken.
create table if not exists sarskilt_yttrande (
  id          bigint generated always as identity primary key,
  bet_dok_id  text not null references betankande(dok_id) on delete cascade,
  rm          text not null,
  beteckning  text not null,
  nummer      text not null,
  punkt       text,
  partier     text[],
  rubrik      text,
  unique (bet_dok_id, nummer)
);

comment on table sarskilt_yttrande is
  'Särskilda yttranden i utskottsbetänkanden. Extraherade ur betänkandets HTML '
  '(p.Srskiltyttranderubrik) — de finns inte i dokmotforslag, som bara bär '
  'reservationer. Ingen text sparas, se migrationens kommentar.';

create index if not exists sarskilt_yttrande_rm_idx on sarskilt_yttrande (rm);
create index if not exists sarskilt_yttrande_partier_idx on sarskilt_yttrande using gin (partier);

-- RLS i samma migration som tabellen. En ny tabell i public utan RLS är öppen
-- för skrivning från internet, eftersom Supabase ger anon `grant all` som
-- standard — se CLAUDE.md.
alter table sarskilt_yttrande enable row level security;

create policy "publik lasning" on sarskilt_yttrande
  for select to anon, authenticated using (true);
