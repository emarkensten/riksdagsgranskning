-- All data är offentlig riksdagsdata avsedd att visas publikt.
-- Alla får läsa, ingen får skriva via API:et. ETL kör med service role,
-- som kringgår RLS.
alter table ledamot        enable row level security;
alter table betankande     enable row level security;
alter table forslagspunkt  enable row level security;
alter table rost           enable row level security;
alter table anforande      enable row level security;
alter table reservation    enable row level security;
alter table punkt_klartext enable row level security;

create policy "publik lasning" on ledamot        for select to anon, authenticated using (true);
create policy "publik lasning" on betankande     for select to anon, authenticated using (true);
create policy "publik lasning" on forslagspunkt  for select to anon, authenticated using (true);
create policy "publik lasning" on rost           for select to anon, authenticated using (true);
create policy "publik lasning" on anforande      for select to anon, authenticated using (true);
create policy "publik lasning" on reservation    for select to anon, authenticated using (true);
create policy "publik lasning" on punkt_klartext for select to anon, authenticated using (true);

-- Kvarlevor från motionskvalitetsspåret.
drop function if exists public.get_motion_quality_coverage() cascade;
drop function if exists public.get_motions_without_analysis(integer) cascade;
