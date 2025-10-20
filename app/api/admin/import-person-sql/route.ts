import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import readline from 'readline'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123'

// Parse SQL INSERT statement to extract values
function parseInsertValues(sqlLine: string): any {
  const valuesMatch = sqlLine.match(/VALUES\s*\((.*)\);?$/i)
  if (!valuesMatch) return null

  const valuesStr = valuesMatch[1]
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

    console.log(`\nStarting person.sql import from: ${sqlFile}\n`)

    if (!supabaseAdmin) throw new Error('Supabase admin client not available')

    // Track stats for each table
    const stats = {
      person: { total: 0, inserted: 0 },
      personuppdrag: { total: 0, inserted: 0 },
      personuppgift: { total: 0, inserted: 0 }
    }

    let currentTable = ''
    let currentColumns: string[] = []
    let batch: any[] = []
    const batchSize = 500

    // Column definitions
    const columnMaps: Record<string, string[]> = {
      person: ['intressent_id', 'fodd_ar', 'kon', 'efternamn', 'tilltalsnamn', 'sorteringsnamn', 'iort', 'parti', 'valkrets', 'status'],
      personuppdrag: ['organ_kod', 'roll_kod', 'ordningsnummer', 'status', 'typ', 'from_date', 'tom_date', 'uppgift', 'intressent_id'],
      personuppgift: ['uppgift_kod', 'uppgift', 'uppgift_typ', 'intressent_id']
    }

    const tableNames: Record<string, string> = {
      person: 'person_import',
      personuppdrag: 'personuppdrag_import',
      personuppgift: 'personuppgift_import'
    }

    // Flush batch helper
    async function flushBatch(table: string) {
      if (batch.length === 0) return

      try {
        const { error, count } = await supabaseAdmin
          .from(tableNames[table])
          .insert(batch, { count: 'exact' })

        if (!error && count !== null) {
          stats[table as keyof typeof stats].inserted += count
        } else if (error) {
          console.error(`Error inserting ${table} batch:`, error)
        }

        console.log(`  ${table}: Processed ${stats[table as keyof typeof stats].total} rows, inserted ${stats[table as keyof typeof stats].inserted}`)
      } catch (error) {
        console.error(`Error executing ${table} batch:`, error)
      }

      batch = []
    }

    // Read file line by line
    const fileStream = fs.createReadStream(sqlFile)
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    })

    let currentStatement = ''
    for await (const line of rl) {
      const trimmed = line.trim()

      // Detect which table we're inserting into
      if (trimmed.startsWith('INSERT INTO person') && !trimmed.includes('uppdrag') && !trimmed.includes('uppgift')) {
        // Flush previous batch if switching tables
        if (currentTable && currentTable !== 'person') {
          await flushBatch(currentTable)
        }
        currentTable = 'person'
        currentColumns = columnMaps.person
        currentStatement = line
      } else if (trimmed.startsWith('INSERT INTO personuppdrag')) {
        if (currentTable && currentTable !== 'personuppdrag') {
          await flushBatch(currentTable)
        }
        currentTable = 'personuppdrag'
        currentColumns = columnMaps.personuppdrag
        currentStatement = line
      } else if (trimmed.startsWith('INSERT INTO personuppgift')) {
        if (currentTable && currentTable !== 'personuppgift') {
          await flushBatch(currentTable)
        }
        currentTable = 'personuppgift'
        currentColumns = columnMaps.personuppgift
        currentStatement = line
      } else if (currentStatement && trimmed.startsWith('VALUES')) {
        // Complete the statement
        currentStatement += ' ' + line

        // Parse the complete statement
        const values = parseInsertValues(currentStatement)
        if (values && values.length === currentColumns.length && currentTable) {
          const row: any = {}
          currentColumns.forEach((col, i) => {
            row[col] = values[i]
          })
          batch.push(row)
          stats[currentTable as keyof typeof stats].total++

          // Execute batch when it reaches batchSize
          if (batch.length >= batchSize) {
            await flushBatch(currentTable)
          }
        }

        // Reset for next statement
        currentStatement = ''
      }
    }

    // Flush final batch
    if (currentTable && batch.length > 0) {
      await flushBatch(currentTable)
    }

    console.log(`\n✓ Import complete!`)
    console.log(`  person: ${stats.person.total} total, ${stats.person.inserted} inserted`)
    console.log(`  personuppdrag: ${stats.personuppdrag.total} total, ${stats.personuppdrag.inserted} inserted`)
    console.log(`  personuppgift: ${stats.personuppgift.total} total, ${stats.personuppgift.inserted} inserted`)

    return NextResponse.json(
      {
        success: true,
        message: 'person.sql import complete',
        stats,
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
      message: 'Use POST to import person.sql file. Requires Bearer token.',
      example: {
        sqlFile: '/Users/erikmarkensten/Downloads/sql/ledamöter/person.sql',
      },
    },
    { status: 405 }
  )
}
