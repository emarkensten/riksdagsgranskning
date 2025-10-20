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
  titel: string // Actual field from API
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

// Hämta voteringar för en specifik session - use sz=10000 + pagination
export async function fetchVotings(
  riksmote: string,
  page: number = 1,
  bet?: string,
  punkt?: string
): Promise<{ votings: Voting[], metadata: VotingMetadata }> {
  try {
    const params: any = {
      utformat: 'json',
      sz: 10000,
      p: page  // Pagination parameter
    }
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

// Fetch ALL votings for a riksmöte with automatic pagination
// IMPORTANT: Voteringar can be 50,000+ per riksmöte, so pagination is critical
export async function fetchAllVotingsForRiksmote(riksmote: string): Promise<any[]> {
  try {
    console.log(`  Fetching all votings for riksmöte ${riksmote}...`)

    let allVotings: any[] = []
    let page = 1
    let hasMore = true

    // Voteringar API doesn't have @sidor, so we keep fetching until we get <10000 records
    while (hasMore) {
      console.log(`    Fetching page ${page}...`)

      const params: any = {
        utformat: 'json',
        sz: 10000,
        p: page,
        rm: riksmote
      }

      const response = await axios.get(`${BASE_URL}/voteringlista/`, {
        params,
        timeout: 30000,
      })

      const data = response.data.voteringlista
      if (!data || !data.votering) {
        console.log(`    No more votings found on page ${page}`)
        break
      }

      let votings = data.votering
      // Normalize to array
      if (!Array.isArray(votings)) {
        votings = [votings]
      }

      allVotings.push(...votings)
      console.log(`    Got ${votings.length} votings (total so far: ${allVotings.length})`)

      // If we got less than 10000, this is the last page
      if (votings.length < 10000) {
        hasMore = false
      } else {
        page++
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`    ✓ Fetched ${allVotings.length} votings for ${riksmote}`)
    return allVotings
  } catch (error) {
    console.error(`Error fetching all votings for ${riksmote}:`, error)
    throw error
  }
}

// Hämta motioner - use sz=10000 for all records, supports both riksmote and date range
export async function fetchMotions(riksmote?: string, fromDate?: string, toDate?: string, page: number = 1): Promise<Motion[]> {
  try {
    const params: any = {
      doktyp: 'mot',
      utformat: 'json',
      sz: 10000,
      p: page, // Pagination parameter
    }

    // Use date range if provided (format: YYYY-MM-DD), otherwise use riksmote
    if (fromDate) {
      params.from = fromDate
      // If toDate provided, use it; otherwise set it to today
      if (toDate) {
        params.tom = toDate
      } else {
        const today = new Date().toISOString().split('T')[0]
        params.tom = today
      }
    } else if (riksmote) {
      params.rm = riksmote
    }

    const response = await axios.get(`${BASE_URL}/dokumentlista/`, {
      params,
      timeout: 30000,
    })

    const data = response.data.dokumentlista
    if (!data) return []

    // API returns dokument as either object or array
    let dokument = data.dokument
    if (!dokument) return []

    // Normalize to array
    if (!Array.isArray(dokument)) {
      dokument = [dokument]
    }

    return dokument
  } catch (error) {
    console.error(`Error fetching motions:`, error)
    throw error
  }
}

// Fetch ALL motions for a riksmöte with automatic pagination
export async function fetchAllMotionsForRiksmote(riksmote: string): Promise<Motion[]> {
  try {
    console.log(`  Fetching all motions for riksmöte ${riksmote}...`)

    // First request to get total count and page info
    const params: any = {
      doktyp: 'mot',
      utformat: 'json',
      sz: 10000,
      rm: riksmote,
      p: 1
    }

    const firstResponse = await axios.get(`${BASE_URL}/dokumentlista/`, {
      params,
      timeout: 30000,
    })

    const metadata = firstResponse.data.dokumentlista
    const totalHits = parseInt(metadata['@traffar'] || '0')

    // IMPORTANT: API returns "@sidor" which is total pages needed
    // API seems to return ~200 records per page regardless of sz parameter
    const totalPages = parseInt(metadata['@sidor'] || '1')

    console.log(`    Total motions: ${totalHits}, pages needed: ${totalPages}`)

    let allMotions: Motion[] = []

    // Add first page results
    let firstPageMotions = firstResponse.data.dokumentlista.dokument
    if (!firstPageMotions) {
      return []
    }
    if (!Array.isArray(firstPageMotions)) {
      firstPageMotions = [firstPageMotions]
    }
    allMotions.push(...firstPageMotions)

    // Fetch remaining pages
    for (let page = 2; page <= totalPages; page++) {
      console.log(`    Fetching page ${page}/${totalPages}...`)
      const motions = await fetchMotions(riksmote, undefined, undefined, page)
      allMotions.push(...motions)

      // Small delay to avoid rate limiting
      if (page < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`    ✓ Fetched ${allMotions.length} motions for ${riksmote}`)
    return allMotions
  } catch (error) {
    console.error(`Error fetching all motions for ${riksmote}:`, error)
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
