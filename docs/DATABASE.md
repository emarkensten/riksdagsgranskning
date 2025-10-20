# Database Schema & Structure

## Overview

The Riksdagsgranskning database is built on Supabase (PostgreSQL) and contains comprehensive Swedish parliamentary data from 2010-2025, with voting records extending to 1990+ for historical context.

**Total Data: 1.3+ million records**

---

## Production Tables (Ready for Analysis)

### voteringar (Voting Records)
**Purpose**: Individual member votes on parliamentary motions
**Rows**: 1,006,865
**Period**: 2021-09-22 → 2025-06-18
**Coverage**: 96.4% of available data (4 parliamentary terms)

```sql
CREATE TABLE voteringar (
  id SERIAL PRIMARY KEY,
  votering_id VARCHAR,           -- Unique voting ID (UUID)
  dokument_id VARCHAR,           -- Related document
  ledamot_id VARCHAR,            -- Member ID (intressent_id)
  datum DATE,                    -- Vote date
  titel TEXT,                    -- Vote description
  rost VARCHAR,                  -- Vote: "Ja", "Nej", "Frånvarande"
  riksmote VARCHAR,              -- Parliamentary term (2021/22, 2022/23, etc.)
  beteckning TEXT,               -- Motion reference
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_voteringar_datum ON voteringar(datum);
CREATE INDEX idx_voteringar_ledamot ON voteringar(ledamot_id);
CREATE INDEX idx_voteringar_votering_id ON voteringar(votering_id);
```

**Data Quality**:
- ✅ No duplicates (unique votering_id)
- ✅ Consistent date formats
- ✅ All vote types present (Ja, Nej, Frånvarande)
- ⚠️ FK constraint dropped (pending person migration)

**Analysis Use Cases**:
- Member voting patterns across terms
- Party discipline analysis
- Absence analysis
- Voting alignment studies

---

### anforanden (Speeches)
**Purpose**: Parliamentary speeches and statements
**Rows**: 147,359
**Period**: 2010-10-04 → 2025-10-17
**Coverage**: 100% from Sagtochgjort source (2010-2025)

```sql
CREATE TABLE anforanden (
  id SERIAL PRIMARY KEY,
  anforande_id VARCHAR UNIQUE,   -- Speech ID (UUID)
  ledamot_id VARCHAR,            -- Speaker ID
  debatt_id VARCHAR,             -- Debate/document ID
  titel TEXT,                    -- Speech topic/title
  text TEXT,                     -- Full speech content (currently NULL)
  datum DATE,                    -- Speech date
  taltid INTEGER,                -- Speaking time in seconds
  parti VARCHAR,                 -- Political party
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_anforanden_datum ON anforanden(datum);
CREATE INDEX idx_anforanden_ledamot ON anforanden(ledamot_id);
CREATE INDEX idx_anforanden_debatt ON anforanden(debatt_id);
```

**Data Quality**:
- ✅ 147,359 complete records from 2010-2025
- ✅ Speaking time available for analysis
- ✅ Party affiliation included
- ⚠️ Full speech text not yet populated (future enhancement)

**Analysis Use Cases**:
- Rhetoric analysis (what topics do they discuss)
- Speaking frequency and patterns
- Party messaging consistency
- Topic focus by member

---

### motioner (Motions/Proposals)
**Purpose**: Legislative proposals submitted by members
**Rows**: 56,745
**Period**: 2010-09-06 → 2025-10-17
**Coverage**: 100% from Sagtochgjort source (4.6x increase from API data)

```sql
CREATE TABLE motioner (
  id VARCHAR PRIMARY KEY,        -- Motion ID (unique)
  ledamot_id VARCHAR,            -- Proposer ID (first signatory)
  titel TEXT,                    -- Motion title/description
  datum DATE,                    -- Submission date
  riksmote VARCHAR,              -- Parliamentary term
  organ TEXT,                    -- Committee (AU, CU, KU, etc.)
  dokument_typ VARCHAR,          -- Motion type
  fulltext TEXT,                 -- Full motion text (partially populated)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_motioner_datum ON motioner(datum);
CREATE INDEX idx_motioner_ledamot ON motioner(ledamot_id);
CREATE INDEX idx_motioner_organ ON motioner(organ);
```

**Data Quality**:
- ✅ 56,745 motions from 2010-2025
- ✅ Multiple co-signatories tracked in source data
- ✅ Committee assignment available
- ⚠️ Fulltext not yet complete (from bet-2022-2025.sql)

**Analysis Use Cases**:
- Motion quality analysis (concrete proposals vs. vague statements)
- Committee-specific legislative patterns
- Member collaboration patterns
- Legislative productivity

---

### fragor (Written Questions)
**Purpose**: Written questions to government
**Rows**: 60,830
**Period**: 2010-10-06 → 2025-10-17
**Coverage**: 100% from Sagtochgjort source (NEW TABLE)

```sql
CREATE TABLE fragor (
  id SERIAL PRIMARY KEY,
  dokument_id VARCHAR,           -- Question ID
  ledamot_id VARCHAR,            -- Questioner ID
  titel TEXT,                    -- Question title
  datum DATE,                    -- Submission date
  riksmote VARCHAR,              -- Parliamentary term
  organ VARCHAR,                 -- Target ministry/organ
  beteckning VARCHAR,            -- Question reference (e.g., "250")
  roll VARCHAR,                  -- Role: "undertecknare" or "besvaradav"
  parti VARCHAR,                 -- Political party
  tecken INTEGER,                -- Character count
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fragor_datum ON fragor(datum);
CREATE INDEX idx_fragor_ledamot ON fragor(ledamot_id);
CREATE INDEX idx_fragor_dokument ON fragor(dokument_id);
```

**Data Quality**:
- ✅ 60,830 complete records
- ✅ Multiple rows per question (questioner + answerer)
- ✅ Character count available for analysis

**Analysis Use Cases**:
- Government scrutiny analysis
- Question patterns by party
- Response timelines
- Ministry-specific scrutiny

---

### interpellationer (Interpellations)
**Purpose**: Formal questions raising emergency parliamentary debate
**Rows**: 18,212
**Period**: 2010-10-07 → 2025-10-17
**Coverage**: 100% from Sagtochgjort source (NEW TABLE)

```sql
CREATE TABLE interpellationer (
  id SERIAL PRIMARY KEY,
  dokument_id VARCHAR,           -- Interpellation ID
  ledamot_id VARCHAR,            -- Initiator ID
  titel TEXT,                    -- Topic
  datum DATE,                    -- Submission date
  riksmote VARCHAR,              -- Parliamentary term
  organ VARCHAR,                 -- Target ministry
  beteckning VARCHAR,            -- Reference
  roll VARCHAR,                  -- Role
  parti VARCHAR,                 -- Political party
  tecken INTEGER,                -- Character count
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interpellationer_datum ON interpellationer(datum);
CREATE INDEX idx_interpellationer_ledamot ON interpellationer(ledamot_id);
```

**Data Quality**:
- ✅ 18,212 complete records (2010-2025)
- ✅ High-priority scrutiny events

**Analysis Use Cases**:
- Crisis response analysis
- Opposition vs. government patterns
- Emergency vs. routine scrutiny

---

### betankanden (Committee Reports)
**Purpose**: Official committee reports and decisions
**Rows**: 1,135
**Period**: 2022-10-06 → 2025-10-17
**Coverage**: Basic data only (potential SQL upgrade)

```sql
CREATE TABLE betankanden (
  id VARCHAR PRIMARY KEY UNIQUE,
  hangar_id VARCHAR,             -- Hansard ID
  riksmote VARCHAR,              -- Parliamentary term
  beteckning VARCHAR,            -- Reference
  typ VARCHAR,                   -- Report type
  subtyp VARCHAR,                -- Report subtype
  doktyp VARCHAR,                -- Document type
  datum DATE,                    -- Report date
  publicerad TIMESTAMP,          -- Publication timestamp
  titel TEXT,                    -- Title
  html TEXT,                     -- HTML content (partial)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_betankanden_datum ON betankanden(datum);
```

**Data Quality**:
- ⚠️ Only 1,135 records (2022-2025)
- ⚠️ HTML content incomplete
- 🎯 Upgrade available: bet-2022-2025.sql has 31 columns and richer data

**Planned Enhancement**:
- Import bet-2022-2025.sql (308 MB, 2.78M lines)
- Add complete HTML content
- Include debate transcripts where available
- Expand historical coverage

---

### ledamoter (Members)
**Purpose**: Parliamentary members
**Rows**: 349
**Period**: Current members
**Coverage**: Current roster only

```sql
CREATE TABLE ledamoter (
  id VARCHAR PRIMARY KEY,        -- Member ID (intressent_id)
  namn TEXT,                     -- Full name
  parti VARCHAR,                 -- Political party
  valkrets TEXT,                 -- Electoral district
  kon VARCHAR,                   -- Gender
  fodd_ar INTEGER,               -- Birth year
  bild_url TEXT,                 -- Portrait image URL
  status TEXT,                   -- Member status
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ledamoter_parti ON ledamoter(parti);
```

**Data Quality**:
- ✅ Current 349 members
- ⚠️ NO historical data (members since 1990+)
- 🎯 Upgrade available: person_import has 2,086 historical members

**Planned Enhancement**:
- Migrate from person_import (2,086 members from 1990+)
- Add uppdrag history (all roles and assignments)
- Link to personuppgift data
- Create member timeline tracking

---

## Import Tables (Staging/Temporary)

### person_import (Temporary)
**Rows**: 2,086
**Source**: person.sql (historical ledamöter from 1990+)
**Status**: Imported, waiting for migration to ledamoter

```sql
CREATE TABLE person_import (
  intressent_id VARCHAR PRIMARY KEY,
  fodd_ar INTEGER,
  kon VARCHAR,
  efternamn VARCHAR,
  tilltalsnamn VARCHAR,
  sorteringsnamn VARCHAR,
  iort VARCHAR,
  parti VARCHAR,
  valkrets VARCHAR,
  status VARCHAR
);
```

---

### personuppdrag_import (Temporary)
**Rows**: 31,378
**Source**: person.sql (all member roles and assignments)
**Status**: Imported, waiting for migration

```sql
CREATE TABLE personuppdrag_import (
  id SERIAL PRIMARY KEY,
  organ_kod VARCHAR,             -- Organization code
  roll_kod VARCHAR,              -- Role code
  ordningsnummer INTEGER,        -- Ordering number
  status VARCHAR,                -- Status (Tjänstgörande, etc.)
  typ VARCHAR,                   -- Type (kammaruppdrag, partiuppdrag, etc.)
  uppgift VARCHAR,               -- Task/description
  intressent_id VARCHAR,         -- Member ID
  from_date TIMESTAMP,           -- Start date
  tom_date TIMESTAMP             -- End date
);
```

---

### personuppgift_import (Temporary)
**Rows**: 4,019
**Source**: person.sql (member contact info and metadata)
**Status**: Imported, waiting for migration

```sql
CREATE TABLE personuppgift_import (
  id SERIAL PRIMARY KEY,
  uppgift_kod VARCHAR,           -- Task code
  uppgift VARCHAR,               -- Task/info
  uppgift_typ VARCHAR,           -- Type (val, etc.)
  intressent_id VARCHAR          -- Member ID
);
```

---

### votering_import (Temporary - Can be Dropped)
**Status**: Already migrated to voteringar (1,006,865 rows)
**Action**: Safe to drop after verification

---

### sagt_och_gjort_import (Temporary - Can be Dropped)
**Status**: Already migrated to production tables (372,078 rows)
**Breakdown**:
- anforanden: 147,359
- motioner: 56,745
- fragor: 60,830
- interpellationer: 18,212
**Action**: Safe to drop after verification

---

## Data Statistics

### Current State (2025-10-20)

| Table | Rows | Status | Period |
|-------|------|--------|--------|
| voteringar | 1,006,865 | ✅ Production | 2021-2025 |
| anforanden | 147,359 | ✅ Production | 2010-2025 |
| motioner | 56,745 | ✅ Production | 2010-2025 |
| fragor | 60,830 | ✅ Production | 2010-2025 |
| interpellationer | 18,212 | ✅ Production | 2010-2025 |
| betankanden | 1,135 | ⚠️ Partial | 2022-2025 |
| ledamoter | 349 | ⚠️ Current only | Now |
| person_import | 2,086 | 🎯 Ready | 1990+ |
| personuppdrag_import | 31,378 | 🎯 Ready | 1990+ |
| personuppgift_import | 4,019 | 🎯 Ready | 1990+ |

**Production: 1,291,495 rows**
**Import (pending): 37,483 rows**
**Total: 1,328,978 rows**

---

## Foreign Key Constraints

### Current Status

| FK | Status | Reason |
|----|--------|--------|
| voteringar.ledamot_id → ledamoter.id | ⚠️ Dropped | Temp for import (1M records reference historical IDs) |
| anforanden.ledamot_id → ledamoter.id | ⚠️ Dropped | Temp for import (147k records reference historical IDs) |
| motioner.ledamot_id → ledamoter.id | ⚠️ Dropped | Temp for import (56k records reference historical IDs) |
| fragor.ledamot_id → ledamoter.id | ❓ Check | May need to drop |
| interpellationer.ledamot_id → ledamoter.id | ❓ Check | May need to drop |

### Restoration Plan

After migrating person_import:
1. Update ledamoter with all 2,086 historical members
2. Create personuppdrag table with role history
3. Verify all FK references can be satisfied
4. Restore all FK constraints
5. Add NOT NULL constraint to ledamot_id where appropriate

---

## Indexing Strategy

### Current Indexes (Optimized for Queries)

```sql
-- voteringar
CREATE INDEX idx_voteringar_datum ON voteringar(datum);
CREATE INDEX idx_voteringar_ledamot ON voteringar(ledamot_id);
CREATE INDEX idx_voteringar_votering_id ON voteringar(votering_id);

-- anforanden
CREATE INDEX idx_anforanden_datum ON anforanden(datum);
CREATE INDEX idx_anforanden_ledamot ON anforanden(ledamot_id);
CREATE INDEX idx_anforanden_debatt ON anforanden(debatt_id);

-- motioner
CREATE INDEX idx_motioner_datum ON motioner(datum);
CREATE INDEX idx_motioner_ledamot ON motioner(ledamot_id);
CREATE INDEX idx_motioner_organ ON motioner(organ);

-- fragor
CREATE INDEX idx_fragor_datum ON fragor(datum);
CREATE INDEX idx_fragor_ledamot ON fragor(ledamot_id);
CREATE INDEX idx_fragor_dokument ON fragor(dokument_id);

-- interpellationer
CREATE INDEX idx_interpellationer_datum ON interpellationer(datum);
CREATE INDEX idx_interpellationer_ledamot ON interpellationer(ledamot_id);

-- ledamoter
CREATE INDEX idx_ledamoter_parti ON ledamoter(parti);
```

### Recommended Additional Indexes (Performance)

```sql
-- For member activity aggregation
CREATE INDEX idx_voteringar_ledamot_datum ON voteringar(ledamot_id, datum);
CREATE INDEX idx_anforanden_ledamot_datum ON anforanden(ledamot_id, datum);

-- For party analysis
CREATE INDEX idx_voteringar_parti ON voteringar(parti);
CREATE INDEX idx_anforanden_parti ON anforanden(parti);

-- For term-based analysis
CREATE INDEX idx_voteringar_riksmote ON voteringar(riksmote);
CREATE INDEX idx_motioner_riksmote ON motioner(riksmote);
```

---

## Data Validation Rules

### Voting Records (voteringar)
- ✅ rost IN ('Ja', 'Nej', 'Frånvarande')
- ✅ datum BETWEEN '2021-01-01' AND '2025-12-31'
- ✅ riksmote IN ('2021/22', '2022/23', '2023/24', '2024/25', '2025/26')
- ✅ No NULL in votering_id, datum, rost, riksmote

### Speeches (anforanden)
- ✅ taltid >= 0 (in seconds)
- ✅ datum BETWEEN '2010-01-01' AND '2025-12-31'
- ✅ anforande_id is UUID format
- ✅ No NULL in anforande_id, datum, titel, taltid

### Motions (motioner)
- ✅ datum BETWEEN '2010-01-01' AND '2025-12-31'
- ✅ id is motion reference (non-NULL)
- ✅ No NULL in id, datum, titel, riksmote

---

## Performance Considerations

### Query Performance Targets
- Member vote lookup (1K rows): <100ms
- Party voting pattern (100K rows): <500ms
- Historical analysis (1M rows): <2s

### Batch Operation Performance
- Insert 1,000 rows: ~700ms
- Insert 10,000 rows: ~7s
- Full migration (1M+ rows): ~10-15 minutes

### Storage Estimate
- Raw data: ~300MB (without full text)
- With indexes: ~500MB
- With betänkanden HTML: +200-300MB

---

## Next Steps

### 1. Migrate Person Data (Priority: HIGH)
```sql
-- 1. Import person_import to ledamoter
INSERT INTO ledamoter (id, namn, parti, valkrets, kon, fodd_ar, status)
SELECT intressent_id, CONCAT(tilltalsnamn, ' ', efternamn), parti, valkrets, kon, fodd_ar, status
FROM person_import;

-- 2. Create personuppdrag table
CREATE TABLE personuppdrag (...);
INSERT INTO personuppdrag SELECT * FROM personuppdrag_import;

-- 3. Restore FK constraints
```

### 2. Import Betänkanden (Priority: MEDIUM)
- Import bet-2022-2025.sql (308 MB, 31 columns)
- Add HTML content to existing betankanden
- Expand historical coverage

### 3. Cleanup (Priority: LOW)
- Drop temporary import tables
- Restore all FK constraints
- Optimize indexes based on query patterns
