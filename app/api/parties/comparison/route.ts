import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Call backend API for party comparison data
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002'
    const response = await fetch(
      `${backendUrl}/api/parties/comparison`,
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
    console.error('Party comparison error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch party comparison data' },
      { status: 500 }
    )
  }
}
