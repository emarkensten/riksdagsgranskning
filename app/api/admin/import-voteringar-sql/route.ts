import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import readline from 'readline'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123'

// Parse SQL INSERT statement to extract values
function parseInsertValues(sqlLine: string): any {
  // Extract VALUES(...) part
  const valuesMatch = sqlLine.match(/VALUES\s*\((.*)\);?$/i)
  if (!valuesMatch) return null

  const valuesStr = valuesMatch[1]

  // Split by commas, but respect quoted strings
  const values: string[] = []
  let current = ''
  let inQuote = false
  let quoteChar = ''

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i]

    if ((char === "'" || char === '"') && valuesStr[i - 1] !== '\\') {
      if (!inQuote) {
        inQuote = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuote = false
      }
      current += char
    } else if (char === ',' && !inQuote) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current) values.push(current.trim())

  // Clean up values
  return values.map(v => {
    v = v.trim()
    if (v === "''") return null
    if (v.startsWith("'") && v.endsWith("'")) {
      return v.slice(1, -1)
    }
    if (v === 'NULL' || v === 'null') return null
    return v
  })
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { sqlFile } = await request.json()

    if (!sqlFile) {
      return NextResponse.json(
        { error: 'sqlFile parameter required' },
        { status: 400 }
      )
    }

    console.log(`\nStarting SQL import from: ${sqlFile}\n`)

    if (!supabaseAdmin) throw new Error('Supabase admin client not available')

    let totalLines = 0
    let insertedRows = 0
    let batch: any[] = []
    const batchSize = 500 // Insert 500 rows at a time

    // Column order from SQL: rm,beteckning,hangar_id,votering_id,punkt,namn,intressent_id,parti,valkrets,valkretsnummer,iort,rost,avser,votering,banknummer,fornamn,efternamn,kon,fodd,datum
    const columns = ['rm', 'beteckning', 'hangar_id', 'votering_id', 'punkt', 'namn', 'intressent_id', 'parti', 'valkrets', 'valkretsnummer', 'iort', 'rost', 'avser', 'votering', 'banknummer', 'fornamn', 'efternamn', 'kon', 'fodd', 'datum']

    // Read file line by line
    const fileStream = fs.createReadStream(sqlFile)
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    })

    let currentStatement = ''
    for await (const line of rl) {
      const trimmed = line.trim()

      // Accumulate multi-line statements
      if (trimmed.startsWith('INSERT INTO votering')) {
        currentStatement = line
      } else if (currentStatement && trimmed.startsWith('VALUES')) {
        // Complete the statement
        currentStatement += ' ' + line

        // Parse the complete statement
        const values = parseInsertValues(currentStatement)
        if (values && values.length === columns.length) {
          const row: any = {}
          columns.forEach((col, i) => {
            row[col] = values[i]
          })
          batch.push(row)
          totalLines++

          // Execute batch when it reaches batchSize
          if (batch.length >= batchSize) {
            try {
              const { error, count } = await supabaseAdmin
                .from('votering_import')
                .insert(batch, { count: 'exact' })

              if (!error && count !== null) {
                insertedRows += count
              } else if (error) {
                console.error(`Error inserting batch:`, error)
              }

              console.log(`  Processed ${totalLines} rows, inserted ${insertedRows}`)
            } catch (error) {
              console.error(`Error executing batch:`, error)
            }

            batch = [] // Clear batch
          }
        }

        // Reset for next statement
        currentStatement = ''
      }
    }

    // Execute remaining lines
    if (batch.length > 0) {
      try {
        const { error, count } = await supabaseAdmin
          .from('votering_import')
          .insert(batch, { count: 'exact' })

        if (!error && count !== null) {
          insertedRows += count
        }
        console.log(`  Processed final batch (${batch.length} rows)`)
      } catch (error) {
        console.error(`Error executing final batch:`, error)
      }
    }

    console.log(`\n✓ Import complete!`)
    console.log(`  Total INSERT statements: ${totalLines}`)
    console.log(`  Rows inserted: ${insertedRows}`)

    return NextResponse.json(
      {
        success: true,
        message: 'SQL import complete',
        stats: {
          total_inserts: totalLines,
          inserted: insertedRows,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error during SQL import:', error)
    return NextResponse.json(
      { error: 'Import failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Use POST to import SQL file. Requires Bearer token.',
      example: {
        sqlFile: '/path/to/votering-202223.sql',
      },
    },
    { status: 405 }
  )
}
