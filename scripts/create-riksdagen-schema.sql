-- ================================================================
-- RIKSDAGSGRANSKNING - DATABASE SCHEMA
-- ================================================================
-- This SQL schema creates all tables and indexes needed for the
-- Riksdagsgranskning project.
--
-- Run this in Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/kdwfiuzbnidukyywmflx/sql/new
--
-- Total tables: 7
-- Total indexes: 7
-- ================================================================

-- ================================================================
-- 1. LEDAMOTER (Members of Parliament)
-- ================================================================
CREATE TABLE IF NOT EXISTS ledamoter (
  id VARCHAR(50) PRIMARY KEY,
  namn TEXT NOT NULL,
  parti VARCHAR(10),
  valkrets TEXT,
  kon VARCHAR(10),
  fodd_ar INTEGER,
  bild_url TEXT,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- 2. VOTERINGAR (Votings)
-- ================================================================
CREATE TABLE IF NOT EXISTS voteringar (
  id SERIAL PRIMARY KEY,
  votering_id VARCHAR(50),
  dokument_id VARCHAR(50),
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  datum DATE,
  titel TEXT,
  rost VARCHAR(20),
  riksmote VARCHAR(20),
  beteckning TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- 3. MOTIONER (Motions)
-- ================================================================
CREATE TABLE IF NOT EXISTS motioner (
  id VARCHAR(50) PRIMARY KEY,
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  titel TEXT,
  datum DATE,
  riksmote VARCHAR(20),
  organ TEXT,
  dokument_typ VARCHAR(10),
  fulltext TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- 4. ANFÖRANDEN (Speeches)
-- ================================================================
CREATE TABLE IF NOT EXISTS anforanden (
  id SERIAL PRIMARY KEY,
  anforande_id VARCHAR(50),
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  debatt_id VARCHAR(50),
  titel TEXT,
  text TEXT,
  datum DATE,
  taltid INTEGER,
  parti VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- 5. FRÅNVARO_ANALYS (Absence Analysis)
-- ================================================================
CREATE TABLE IF NOT EXISTS franvaro_analys (
  id SERIAL PRIMARY KEY,
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  kategorier JSONB,
  total_voteringar INTEGER,
  total_franvaro INTEGER,
  franvaro_procent DECIMAL,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ledamot_id, analyzed_at)
);

-- ================================================================
-- 6. RETORIK_ANALYS (Rhetoric Analysis)
-- ================================================================
CREATE TABLE IF NOT EXISTS retorik_analys (
  id SERIAL PRIMARY KEY,
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  parti VARCHAR(10),
  amne TEXT,
  anforanden_count INTEGER,
  mentions_count INTEGER,
  positiv_sentiment BOOLEAN,
  relevanta_voteringar INTEGER,
  positiva_roster INTEGER,
  negativa_roster INTEGER,
  franvarande_roster INTEGER,
  gap_score DECIMAL,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ledamot_id, amne, analyzed_at)
);

-- ================================================================
-- 7. MOTION_KVALITET (Motion Quality)
-- ================================================================
CREATE TABLE IF NOT EXISTS motion_kvalitet (
  id SERIAL PRIMARY KEY,
  motion_id VARCHAR(50) REFERENCES motioner(id),
  ledamot_id VARCHAR(50) REFERENCES ledamoter(id),
  har_konkreta_forslag INTEGER,
  har_kostnader INTEGER,
  har_specifika_mal INTEGER,
  har_lagtext INTEGER,
  har_implementation INTEGER,
  substantiell_score INTEGER,
  kategori VARCHAR(20),
  sammanfattning TEXT,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(motion_id, analyzed_at)
);

-- ================================================================
-- INDEXES (for query performance)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_voteringar_ledamot ON voteringar(ledamot_id);
CREATE INDEX IF NOT EXISTS idx_voteringar_franvarande ON voteringar(rost) WHERE rost = 'Frånvarande';
CREATE INDEX IF NOT EXISTS idx_voteringar_datum ON voteringar(datum DESC);
CREATE INDEX IF NOT EXISTS idx_motioner_ledamot ON motioner(ledamot_id);
CREATE INDEX IF NOT EXISTS idx_motioner_datum ON motioner(datum DESC);
CREATE INDEX IF NOT EXISTS idx_anforanden_ledamot ON anforanden(ledamot_id);
CREATE INDEX IF NOT EXISTS idx_franvaro_kategorier ON franvaro_analys USING GIN (kategorier);

-- ================================================================
-- VERIFICATION QUERY
-- ================================================================
-- Run this after creating tables to verify:
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'ledamoter',
  'voteringar',
  'motioner',
  'anforanden',
  'franvaro_analys',
  'retorik_analys',
  'motion_kvalitet'
)
ORDER BY tablename;
