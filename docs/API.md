# API Documentation

## Overview

The API provides fast, pre-computed access to all analysis results. No LLM calls happen on request - all data is pre-computed via batch processing.

## Base URL

```
https://riksdagsgranskning.se/api
```

## Authentication

Currently no authentication required. Rate limiting via Vercel.

## Endpoints

### Members

#### GET /api/ledamoter
List all members with basic info.

**Query Parameters:**
- `parti`: Filter by party (S, M, SD, etc.)
- `limit`: Max results (default: 100)
- `offset`: Pagination (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "100001",
      "namn": "Anna Andersson",
      "parti": "S",
      "valkrets": "Stockholm",
      "kon": "Kvinna",
      "fodd_ar": 1965,
      "bild_url": "https://data.riksdagen.se/..."
    }
  ],
  "total": 349
}
```

#### GET /api/ledamoter/[id]
Get detailed member info with analysis preview.

**Response:**
```json
{
  "data": {
    "id": "100001",
    "namn": "Anna Andersson",
    "parti": "S",
    "valkrets": "Stockholm",
    "kon": "Kvinna",
    "fodd_ar": 1965,
    "bild_url": "https://data.riksdagen.se/...",
    "stats": {
      "total_votings": 234,
      "absence_rate": 12.5,
      "top_absence_category": "Miljö",
      "top_gap_score": 45
    }
  }
}
```

### Analysis Results

#### GET /api/ledamoter/[id]/absence
Absence analysis for a specific member.

**Response:**
```json
{
  "data": {
    "id": 1,
    "ledamot_id": "100001",
    "kategorier": [
      {
        "name": "HBTQ-frågor",
        "count": 23,
        "percentage": 78,
        "baseline": 15
      },
      {
        "name": "Klimat",
        "count": 12,
        "percentage": 35,
        "baseline": 14
      }
    ],
    "total_voteringar": 234,
    "total_franvaro": 28,
    "franvaro_procent": 12.5,
    "analyzed_at": "2025-10-19T10:00:00Z"
  }
}
```

#### GET /api/ledamoter/[id]/rhetoric
Rhetoric vs. action gap for a member.

**Response:**
```json
{
  "data": [
    {
      "amne": "klimat",
      "anforanden_count": 45,
      "mentions_count": 12,
      "positiv_sentiment": true,
      "relevanta_voteringar": 8,
      "positiva_roster": 2,
      "negativa_roster": 6,
      "franvarande_roster": 0,
      "gap_score": 75
    }
  ]
}
```

#### GET /api/ledamoter/[id]/motions
Motion quality analysis for a member.

**Query Parameters:**
- `limit`: Max results (default: 50)

**Response:**
```json
{
  "data": [
    {
      "motion_id": "mot-2024-1234",
      "titel": "Motion om klimatmål",
      "substantiell_score": 7,
      "kategori": "substantiell",
      "har_konkreta_forslag": 8,
      "har_kostnader": 6,
      "har_specifika_mal": 9,
      "har_lagtext": 5,
      "har_implementation": 7,
      "sammanfattning": "Motion föreslår konkreta åtgärder..."
    }
  ],
  "stats": {
    "average_quality": 5.2,
    "empty_motions_percent": 35
  }
}
```

### Rankings

#### GET /api/rankings/absence
Top-ranked members by absence rate in specific categories.

**Query Parameters:**
- `category`: Filter by category (optional)
- `limit`: Top N results (default: 10)

**Response:**
```json
{
  "data": [
    {
      "rank": 1,
      "ledamot_id": "100001",
      "namn": "Anna Andersson",
      "parti": "S",
      "absence_rate": 78,
      "category": "HBTQ-frågor",
      "baseline": 15
    }
  ]
}
```

#### GET /api/rankings/gap-score
Top-ranked members by rhetoric-action gap.

**Response:**
```json
{
  "data": [
    {
      "rank": 1,
      "ledamot_id": "100001",
      "namn": "Anna Andersson",
      "parti": "S",
      "top_gap_score": 85,
      "top_gap_topic": "klimat",
      "average_gap_score": 62
    }
  ]
}
```

#### GET /api/rankings/motion-quality
Top-ranked members by motion quality.

**Response:**
```json
{
  "data": [
    {
      "rank": 1,
      "ledamot_id": "100001",
      "namn": "Anna Andersson",
      "parti": "S",
      "average_quality": 8.2,
      "motion_count": 23,
      "substantiell_percent": 75
    }
  ]
}
```

### Party Comparisons

#### GET /api/partier
List all parties with aggregate stats.

**Response:**
```json
{
  "data": [
    {
      "parti": "S",
      "namn": "Socialdemokraterna",
      "member_count": 98,
      "average_absence_rate": 14.2,
      "average_gap_score": 45.3,
      "average_motion_quality": 6.1
    }
  ]
}
```

#### GET /api/partier/[party]/comparison
Detailed comparison for a specific party.

**Response:**
```json
{
  "data": {
    "parti": "S",
    "namn": "Socialdemokraterna",
    "member_count": 98,
    "stats": {
      "absence": {
        "average_rate": 14.2,
        "total_votes": 25000,
        "total_absence": 3500
      },
      "rhetoric": {
        "average_gap_score": 45.3,
        "topics_covered": ["klimat", "skatter", "försvar"]
      },
      "motions": {
        "average_quality": 6.1,
        "total_motions": 450,
        "substantiell_percent": 62
      }
    }
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid parameter",
  "message": "Parameter 'limit' must be between 1 and 100"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Member with id '100001' not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Server error",
  "message": "An unexpected error occurred"
}
```

## Caching

All endpoints are cached using Next.js `unstable_cache`:
- Member data: 24 hours
- Analysis results: 30 days
- Rankings: 7 days

To invalidate cache, modify timestamps in database analysis records.

## Rate Limiting

- 100 requests per minute per IP (via Vercel)
- Contact for higher limits

## Future Extensions

- Real-time WebSocket updates when new analyses complete
- Export to CSV/JSON
- Advanced filtering and custom queries
- Historical data (10+ years)
