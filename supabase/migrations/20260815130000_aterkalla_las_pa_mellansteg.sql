-- Migrationen 20260815100000 sa att punkt_linje och punkt_ensam lämnades
-- oåtkomliga, men att utelämna dem ur en grant räcker inte: Supabase delar ut
-- läsrätt till anon som standard. Kontrollerat med anon-nyckeln mot REST-API:et,
-- som svarade 200 på båda.
--
-- Ingen säkerhetsrisk — allt i databasen är offentlig riksdagsdata. Men en
-- kommentar som inte stämmer är värre än ingen, och 20 552 rader ska inte ligga
-- öppna utan läsare.
revoke select on punkt_linje, punkt_ensam from anon, authenticated;
