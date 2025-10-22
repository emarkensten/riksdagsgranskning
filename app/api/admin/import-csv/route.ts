import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import readline from 'readline'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123'

// Parse CSV line respecting quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuote = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuote && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        inQuote = !inQuote
      }
    } else if (char === ',' && !inQuote) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { csvFile, tableName } = await request.json()

    if (!csvFile || !tableName) {
      return NextResponse.json(
        { error: 'csvFile and tableName parameters required' },
        { status: 400 }
      )
    }

    console.log(`\nStarting CSV import from: ${csvFile} to table: ${tableName}\n`)

    if (!supabaseAdmin) throw new Error('Supabase admin client not available')

    let totalLines = 0
    let insertedRows = 0
    let batch: any[] = []
    const batchSize = 1000

    // Column names from Sagtochgjort.csv
    const columns = ['id', 'fodd', 'kon', 'valkrets', 'dokumenttyp', 'subtyp', 'riksmote', 'dokument_id', 'beteckning', 'organ', 'datum', 'talare', 'parti', 'roll', 'titel', 'talartid', 'tecken', 'aktiviteter']

    // Read file line by line
    const fileStream = fs.createReadStream(csvFile)
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    })

    let isFirstLine = true
    for await (const line of rl) {
      // Skip header
      if (isFirstLine) {
        isFirstLine = false
        continue
      }

      const values = parseCSVLine(line)
      if (values.length === columns.length) {
        const row: any = {}
        columns.forEach((col, i) => {
          let value: string | null = values[i]
          // Convert empty strings to null
          if (value === '' || value === '-' || value === '0') {
            value = null
          }
          row[col] = value
        })
        batch.push(row)
        totalLines++

        // Execute batch when it reaches batchSize
        if (batch.length >= batchSize) {
          try {
            const { error, count } = await supabaseAdmin
              .from(tableName)
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
    }

    // Execute remaining lines
    if (batch.length > 0) {
      try {
        const { error, count } = await supabaseAdmin
          .from(tableName)
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
    console.log(`  Total CSV rows processed: ${totalLines}`)
    console.log(`  Rows inserted: ${insertedRows}`)

    return NextResponse.json(
      {
        success: true,
        message: 'CSV import complete',
        stats: {
          total_rows: totalLines,
          inserted: insertedRows,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error during CSV import:', error)
    return NextResponse.json(
      { error: 'Import failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Use POST to import CSV file. Requires Bearer token.',
      example: {
        csvFile: '/path/to/file.csv',
        tableName: 'sagt_och_gjort_import',
      },
    },
    { status: 405 }
  )
}
