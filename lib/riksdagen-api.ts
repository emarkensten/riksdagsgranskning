import axios from 'axios'

const BASE_URL = 'https://data.riksdagen.se'

export interface RiksdagenMember {
  intressent_id: string
  namn: string
  parti: string
  valkrets: string
  kon: string
  fodd_ar: string
  bild_url_97: string
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

// Hämta alla ledamöter
export async function fetchMembers(): Promise<RiksdagenMember[]> {
  try {
    const response = await axios.get(`${BASE_URL}/personlista/`, {
      params: { utformat: 'json' },
      timeout: 30000,
    })
    return response.data.personlista?.person || []
  } catch (error) {
    console.error('Error fetching members:', error)
    throw error
  }
}

// Hämta voteringar för en specifik session
export async function fetchVotings(
  riksmote: string,
  bet?: string,
  punkt?: string
): Promise<{ votings: Voting[], metadata: VotingMetadata }> {
  try {
    const params: any = { utformat: 'json' }
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

// Hämta motioner
export async function fetchMotions(riksmote: string): Promise<Motion[]> {
  try {
    const response = await axios.get(`${BASE_URL}/dokumentlista/`, {
      params: {
        doktyp: 'mot',
        rm: riksmote,
        utformat: 'json',
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

// Hämta anföranden
export async function fetchAnforanden(riksmote: string): Promise<Anforande[]> {
  try {
    const response = await axios.get(`${BASE_URL}/anforandelista/`, {
      params: {
        rm: riksmote,
        utformat: 'json',
      },
      timeout: 30000,
    })
    return response.data.anforandelista?.anforande || []
  } catch (error) {
    console.error(`Error fetching anföranden for ${riksmote}:`, error)
    throw error
  }
}

// Get current and recent riksmöte values
export function getCurrentRiksmote(): string[] {
  const year = new Date().getFullYear()
  const months = [
    `${year}/25`,
    `${year - 1}/25`,
    `${year - 1}/24`,
    `${year - 2}/25`,
  ]
  return months
}
