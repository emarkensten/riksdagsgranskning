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

// Hämta alla ledamöter (historisk data från 2018) - use sz=10000 for all records
export async function fetchMembers(): Promise<RiksdagenMember[]> {
  try {
    // Fetch all members from 2018 onwards without status filter (to get historical data)
    const response = await axios.get(`${BASE_URL}/personlista/`, {
      params: {
        utformat: 'json',
        sz: 10000,
        // Don't filter by status to get historical members
      },
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

// Hämta motioner - use sz=10000 for all records, supports both riksmote and date range
export async function fetchMotions(riksmote?: string, fromDate?: string): Promise<Motion[]> {
  try {
    const params: any = {
      doktyp: 'mot',
      utformat: 'json',
      sz: 10000,
    }

    // Use date range if provided (format: YYYY-MM-DD), otherwise use riksmote
    if (fromDate) {
      params.from = fromDate
      // If no toDate, set it to today
      const today = new Date().toISOString().split('T')[0]
      params.tom = today
    } else if (riksmote) {
      params.rm = riksmote
    }

    const response = await axios.get(`${BASE_URL}/dokumentlista/`, {
      params,
      timeout: 30000,
    })
    return response.data.dokumentlista?.dokument || []
  } catch (error) {
    console.error(`Error fetching motions:`, error)
    throw error
  }
}

// Hämta fulltext för en motion (titel + proposaltext från XML)
export async function fetchMotionFulltext(dokId: string): Promise<{ titel: string; fulltext: string }> {
  try {
    // Fetch from XML endpoint which has the actual content
    const response = await axios.get(
      `${BASE_URL}/dokument/${dokId}/text`,
      { timeout: 30000 }
    )

    const xml = response.data

    // Parse XML to extract titel
    const titelMatch = xml.match(/<titel>([^<]*)<\/titel>/)
    const titel = titelMatch ? titelMatch[1] : ''

    // Extract all lydelse (proposal text) from dokforslag
    const lydelser: string[] = []
    const lydelseMatches = xml.matchAll(/<lydelse>([^<]*)<\/lydelse>/g)
    for (const match of lydelseMatches) {
      if (match[1]) {
        lydelser.push(match[1])
      }
    }

    // Combine into fulltext: titel + all proposals
    const fulltext = [titel, ...lydelser].filter(Boolean).join('\n\n')

    return { titel, fulltext }
  } catch (error) {
    console.error(`Error fetching motion fulltext for ${dokId}:`, error)
    return { titel: '', fulltext: '' }
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
