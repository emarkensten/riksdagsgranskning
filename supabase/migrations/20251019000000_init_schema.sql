-- ============================================
-- GRUNDDATA (från Riksdagens API)
-- ============================================

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

-- ============================================
-- ANALYSRESULTAT (från LLM-batch)
-- ============================================

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

-- ============================================
-- INDEX för snabba queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_voteringar_ledamot ON voteringar(ledamot_id);
CREATE INDEX IF NOT EXISTS idx_voteringar_franvarande ON voteringar(rost) WHERE rost = 'Frånvarande';
CREATE INDEX IF NOT EXISTS idx_voteringar_datum ON voteringar(datum DESC);
CREATE INDEX IF NOT EXISTS idx_motioner_ledamot ON motioner(ledamot_id);
CREATE INDEX IF NOT EXISTS idx_motioner_datum ON motioner(datum DESC);
CREATE INDEX IF NOT EXISTS idx_anforanden_ledamot ON anforanden(ledamot_id);
CREATE INDEX IF NOT EXISTS idx_franvaro_kategorier ON franvaro_analys USING GIN (kategorier);
