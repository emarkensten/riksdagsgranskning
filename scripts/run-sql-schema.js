const { Client } = require('pg');
const { readFileSync } = require('fs');
const { join } = require('path');

// Supabase connection details
const connectionString = 'postgresql://postgres.kdwfiuzbnidukyywmflx:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd2ZpdXpibmlkdWt5eXdtZmx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgyNDExMywiZXhwIjoyMDY1NDAwMTEzfQ.DyB_-8sUIZ-cWuSUjeIJzQ1J7w7Z6mNT_-FKZX5p8bc@aws-0-eu-north-1.pooler.supabase.com:6543/postgres';

async function runSchema() {
  console.log('========================================');
  console.log('Riksdagsgranskning - Database Setup');
  console.log('========================================\n');

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✓ Connected!\n');

    // Read SQL schema
    const sqlPath = join(process.cwd(), 'scripts', 'init-db.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    console.log(`Loaded SQL schema: ${sqlContent.length} bytes\n`);
    console.log('Executing SQL schema...\n');

    // Execute the entire SQL file
    await client.query(sqlContent);

    console.log('✓ SQL schema executed successfully!\n');

    // Verify tables
    console.log('========================================');
    console.log('Verifying Tables');
    console.log('========================================\n');

    const tablesToCheck = [
      'ledamoter',
      'voteringar',
      'motioner',
      'anforanden',
      'franvaro_analys',
      'retorik_analys',
      'motion_kvalitet'
    ];

    let tablesCreated = 0;
    for (const table of tablesToCheck) {
      try {
        const result = await client.query(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
          [table]
        );

        if (result.rows[0].count > 0) {
          const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
          console.log(`✓ Table '${table}' exists (${countResult.rows[0].count} rows)`);
          tablesCreated++;
        } else {
          console.log(`✗ Table '${table}' not found`);
        }
      } catch (err) {
        console.log(`✗ Table '${table}' error: ${err.message}`);
      }
    }

    // Verify indexes
    console.log('\n========================================');
    console.log('Verifying Indexes');
    console.log('========================================\n');

    const indexResult = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);

    console.log(`✓ Found ${indexResult.rows.length} indexes:\n`);
    indexResult.rows.forEach(row => {
      console.log(`  - ${row.indexname} on ${row.tablename}`);
    });

    console.log('\n========================================');
    console.log('Summary');
    console.log('========================================\n');
    console.log(`Tables created: ${tablesCreated}/${tablesToCheck.length}`);
    console.log(`Indexes created: ${indexResult.rows.length}`);
    console.log(`Database ready: ${tablesCreated === tablesToCheck.length ? 'YES ✓' : 'NO ✗'}\n`);

    if (tablesCreated === tablesToCheck.length) {
      console.log('========================================');
      console.log('✓ SUCCESS: Database Ready!');
      console.log('========================================\n');
      console.log('All tables and indexes created successfully.');
      console.log('Database is ready for data import.\n');
      console.log('Next steps:');
      console.log('1. Run data sync: npm run sync');
      console.log('2. Start development: npm run dev\n');
    } else {
      console.log('⚠ Some tables are missing. Please check errors above.\n');
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

runSchema();
