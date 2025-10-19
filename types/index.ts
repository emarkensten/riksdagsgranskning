// Member types
export interface Member {
  id: string
  namn: string
  parti: string
  valkrets: string
  kon: string
  fodd_ar: number
  bild_url?: string
  status?: string
}

// Voting types
export interface Voting {
  id: number
  votering_id: string
  dokument_id: string
  ledamot_id: string
  datum: Date
  titel: string
  rost: 'Ja' | 'Nej' | 'Avstår' | 'Frånvarande'
  riksmote: string
  beteckning: string
}

// Motion types
export interface Motion {
  id: string
  ledamot_id?: string
  titel: string
  datum: Date
  riksmote: string
  dokument_typ: string
  fulltext?: string
}

// Anförande types
export interface Anforande {
  id: number
  anforande_id: string
  ledamot_id: string
  debatt_id: string
  titel?: string
  text: string
  datum: Date
  taltid: number
  parti: string
}

// Analysis types
export interface AbsenceAnalysis {
  id: number
  ledamot_id: string
  kategorier: Array<{
    name: string
    count: number
    percentage: number
    baseline: number
  }>
  total_voteringar: number
  total_franvaro: number
  franvaro_procent: number
  analyzed_at: Date
}

export interface RhetoricAnalysis {
  id: number
  ledamot_id: string
  parti: string
  amne: string
  anforanden_count: number
  mentions_count: number
  positiv_sentiment: boolean
  relevanta_voteringar: number
  positiva_roster: number
  negativa_roster: number
  franvarande_roster: number
  gap_score: number
  analyzed_at: Date
}

export interface MotionQuality {
  id: number
  motion_id: string
  ledamot_id: string
  har_konkreta_forslag: number
  har_kostnader: number
  har_specifika_mal: number
  har_lagtext: number
  har_implementation: number
  substantiell_score: number
  kategori: 'substantiell' | 'medium' | 'tom'
  sammanfattning?: string
  analyzed_at: Date
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
