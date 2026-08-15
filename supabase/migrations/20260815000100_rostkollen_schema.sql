-- Omstart 2026-08: voteringsdata i centrum. Se docs/BESLUT_2026-08.md.
-- Gamla motionskvalitetstabellerna var tomma och ersattes.
-- Tillämpad via Supabase MCP 2026-08-15; sparad här för spårbarhet.
create table ledamot (
  intressent_id text primary key, fornamn text, efternamn text, parti text,
  valkrets text, kon text, fodd_ar int, bild_url text, status text,
  uppdaterad timestamptz default now());

create table betankande (
  dok_id text primary key, rm text not null, beteckning text not null,
  organ text, titel text, datum date);
create index on betankande (rm);
create index on betankande (organ);

-- motforslag_partier är avgörande för korrekt tolkning av en votering.
create table forslagspunkt (
  id bigserial primary key,
  bet_dok_id text not null references betankande(dok_id) on delete cascade,
  rm text not null, beteckning text not null, punkt text not null,
  rubrik text, forslag text, beslutstyp text,
  motforslag_nummer text, motforslag_partier text[],
  votering_id text, vinnare text,
  unique (bet_dok_id, punkt));
create index on forslagspunkt (votering_id);
create index on forslagspunkt (rm);

create table rost (
  id bigserial primary key, votering_id text not null,
  intressent_id text not null, parti text, rost text not null,
  avser text, rm text, beteckning text, punkt text,
  unique (votering_id, intressent_id, avser));
create index on rost (intressent_id);
create index on rost (parti);
create index on rost (rost);
create index on rost (rm);

create table anforande (
  anforande_id text primary key, dok_id text, anforande_nummer text,
  rm text, datum date, intressent_id text, talare text, parti text,
  avsnittsrubrik text, kammaraktivitet text, rel_dok_id text, replik text,
  text text, tecken int generated always as (length(text)) stored);
create index on anforande (rel_dok_id);
create index on anforande (intressent_id);
create index on anforande (parti);
create index on anforande (rm);
create index on anforande (kammaraktivitet);
