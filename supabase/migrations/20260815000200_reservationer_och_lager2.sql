-- Reservationstexten finns bara i betänkandets HTML, inte strukturerat.
create table reservation (
  id bigserial primary key,
  bet_dok_id text not null references betankande(dok_id) on delete cascade,
  rm text not null, beteckning text not null, nummer text not null,
  punkt text, partier text[], rubrik text, text text,
  unique (bet_dok_id, nummer));
create index on reservation (bet_dok_id, punkt);

-- Lager 2: översättning av procedur till klarspråk, inte omdöme.
create table punkt_klartext (
  forslagspunkt_id bigint primary key references forslagspunkt(id) on delete cascade,
  sakfraga text not null, ja_innebar text not null, nej_innebar text not null,
  amne text, sakerhet text, modell text not null,
  skapad timestamptz default now());
create index on punkt_klartext (amne);
