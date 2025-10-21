import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const party = searchParams.get('party')
  const quality = searchParams.get('quality')
  const riksmote = searchParams.get('riksmote')

  try {
    // Build query parameters
    const params = new URLSearchParams()
    if (query) params.append('q', query)
    if (party) params.append('party', party)
    if (quality) params.append('quality', quality)
    if (riksmote) params.append('riksmote', riksmote)

    // Call backend API for motion search
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002'
    const response = await fetch(
      `${backendUrl}/api/motioner/search?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BACKEND_API_KEY || 'dev-secret-key-2025'}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Backend search failed: ${response.statusText}`)
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Motion search error:', error)
    return NextResponse.json(
      { error: 'Motion search failed' },
      { status: 500 }
    )
  }
}
