import axios from 'axios'

const BASE_URL = 'https://data.riksdagen.se'

export interface RiksdagenMember {
  intressent_id: string
  tilltalsnamn: string
  efternamn: string
  parti: string
  valkrets: string
  kon: string
  fodd_ar: string
  bild_url_192: string
  status?: string
}

export interface Voting {
  intressent_id: string
  rost: string
  namn: string
  parti: string
}

export interface VotingMetadata {
  dok_id: string
  punkt: string
  beteckning: string
  titel: string
  datum: string
  rm: string
}

export interface Motion {
  dok_id: string
  dok_titel: string
  beteckning: string
  publicerad: string
  rm: string
  doktyp: string
}

export interface Anforande {
  anforande_id: string
  intressent_id: string
  namn: string
  text: string
  anforandenummer: number
  debatt_id: string
  datum: string
  taltid: number
  parti: string
}

// Hämta alla ledamöter - use sz=10000 for all records
export async function fetchMembers(): Promise<RiksdagenMember[]> {
  try {
    const response = await axios.get(`${BASE_URL}/personlista/`, {
      params: { utformat: 'json', sz: 10000 },
      timeout: 30000,
    })
    return response.data.personlista?.person || []
  } catch (error) {
    console.error('Error fetching members:', error)
    throw error
  }
}

// Hämta voteringar för en specifik session - use sz=10000
export async function fetchVotings(
  riksmote: string,
  bet?: string,
  punkt?: string
): Promise<{ votings: Voting[], metadata: VotingMetadata }> {
  try {
    const params: any = { utformat: 'json', sz: 10000 }
    if (bet) params.bet = bet
    if (punkt) params.punkt = punkt

    const response = await axios.get(
      `${BASE_URL}/voteringlista/?rm=${riksmote}`,
      { params, timeout: 30000 }
    )

    const data = response.data.voteringlista
    return {
      votings: data?.votering || [],
      metadata: {
        dok_id: data?.dok_id || '',
        punkt: data?.punkt || '',
        beteckning: data?.beteckning || '',
        titel: data?.titel || '',
        datum: data?.datum || '',
        rm: data?.rm || '',
      },
    }
  } catch (error) {
    console.error(`Error fetching votings for ${riksmote}:`, error)
    throw error
  }
}

// Hämta motioner - use sz=10000 for all records
export async function fetchMotions(riksmote: string): Promise<Motion[]> {
  try {
    const response = await axios.get(`${BASE_URL}/dokumentlista/`, {
      params: {
        doktyp: 'mot',
        rm: riksmote,
        utformat: 'json',
        sz: 10000,
      },
      timeout: 30000,
    })
    return response.data.dokumentlista?.dokument || []
  } catch (error) {
    console.error(`Error fetching motions for ${riksmote}:`, error)
    throw error
  }
}

// Hämta fulltext för en motion
export async function fetchMotionFulltext(dokId: string): Promise<string> {
  try {
    const response = await axios.get(
      `${BASE_URL}/dokument/${dokId}.json`,
      { timeout: 30000 }
    )
    return response.data.dokument?.[0]?.fulltext || ''
  } catch (error) {
    console.error(`Error fetching motion fulltext for ${dokId}:`, error)
    return ''
  }
}

// Hämta anföranden - use sz=10000 for all records
export async function fetchAnforanden(riksmote: string): Promise<Anforande[]> {
  try {
    const response = await axios.get(`${BASE_URL}/anforandelista/`, {
      params: {
        rm: riksmote,
        utformat: 'json',
        sz: 10000,
      },
      timeout: 30000,
    })

    const anforandeList = response.data.anforandelista?.anforande
    if (!anforandeList) return []

    // API returns anforande as either an object or array
    if (Array.isArray(anforandeList)) {
      return anforandeList
    } else {
      return [anforandeList]
    }
  } catch (error) {
    console.error(`Error fetching anföranden for ${riksmote}:`, error)
    return []
  }
}

// Get all riksmöte values from the current mandate period (2022 election)
export function getCurrentRiksmote(): string[] {
  // Swedish election 2022, mandate 2022-2026
  // Returns all riksmöte sessions from 2022/23 onwards
  const months = [
    // Current mandate (2022-2026)
    '2025/25',
    '2024/25',
    '2024/24',
    '2023/25',
    '2023/24',
    '2022/25',
    '2022/24',
  ]
  return months
}
