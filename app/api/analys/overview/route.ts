import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Call backend API for analysis overview data
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002'
    const response = await fetch(
      `${backendUrl}/api/analys/overview`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BACKEND_API_KEY || 'dev-secret-key-2025'}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.statusText}`)
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Analysis overview error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analysis overview data' },
      { status: 500 }
    )
  }
}
