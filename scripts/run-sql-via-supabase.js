const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');

const SUPABASE_URL = 'https://kdwfiuzbnidukyywmflx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd2ZpdXpibmlkdWt5eXdtZmx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgyNDExMywiZXhwIjoyMDY1NDAwMTEzfQ.DyB_-8sUIZ-cWuSUjeIJzQ1J7w7Z6mNT_-FKZX5p8bc';

async function runSchema() {
  console.log('========================================');
  console.log('Riksdagsgranskning - Database Setup');
  console.log('========================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read SQL schema
  const sqlPath = join(process.cwd(), 'scripts', 'init-db.sql');
  const sqlContent = readFileSync(sqlPath, 'utf-8');

  console.log(`Loaded SQL schema: ${sqlContent.length} bytes\n`);

  // Split SQL into individual statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Total SQL statements: ${statements.length}\n`);
  console.log('========================================');
  console.log('Executing SQL Statements');
  console.log('========================================\n');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60).replace(/\n/g, ' ');

    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      // Try to execute using the PostgREST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: statement })
      });

      if (response.ok) {
        console.log(' ✓');
        successCount++;
      } else {
        const errorText = await response.text();
        console.log(` ✗ (${response.status})`);
        errors.push({ statement: preview, error: errorText });
        errorCount++;
      }
    } catch (err) {
      console.log(` ✗ (${err.message})`);
      errors.push({ statement: preview, error: err.message });
      errorCount++;
    }
  }

  console.log('\n========================================');
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
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✓ Table '${table}' exists (${count ?? 0} rows)`);
        tablesCreated++;
      } else {
        console.log(`✗ Table '${table}' not found: ${error.message}`);
      }
    } catch (err) {
      console.log(`✗ Table '${table}' error: ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================\n');
  console.log(`SQL Statements executed: ${successCount}/${statements.length}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Tables created: ${tablesCreated}/${tablesToCheck.length}`);
  console.log(`Database ready: ${tablesCreated === tablesToCheck.length ? 'YES ✓' : 'NO ✗'}\n`);

  if (errors.length > 0 && errorCount === statements.length) {
    console.log('========================================');
    console.log('MANUAL SETUP REQUIRED');
    console.log('========================================\n');
    console.log('Supabase REST API cannot execute raw SQL directly.');
    console.log('Please use one of these methods:\n');
    console.log('METHOD 1 (Recommended): Supabase Dashboard SQL Editor');
    console.log('---------------------------------------------------');
    console.log('1. Open: https://supabase.com/dashboard/project/kdwfiuzbnidukyywmflx/sql/new');
    console.log('2. Copy and paste this SQL:\n');
    console.log('---------------------------------------------------\n');
    console.log(sqlContent);
    console.log('\n---------------------------------------------------');
    console.log('3. Click "Run"\n');
    console.log('4. Run this script again to verify: node scripts/run-sql-via-supabase.js\n');
  } else if (tablesCreated === tablesToCheck.length) {
    console.log('========================================');
    console.log('✓ SUCCESS: Database Ready!');
    console.log('========================================\n');
    console.log('All 7 tables created successfully:');
    tablesToCheck.forEach((table, idx) => {
      console.log(`  ${idx + 1}. ${table}`);
    });
    console.log('\nDatabase is ready for data import.\n');
    console.log('Next steps:');
    console.log('1. Run data sync: npm run sync');
    console.log('2. Start development: npm run dev\n');
  }
}

runSchema().catch(err => {
  console.error('\n✗ Error:', err.message);
  process.exit(1);
});
