const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');

const SUPABASE_URL = 'https://kdwfiuzbnidukyywmflx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd2ZpdXpibmlkdWt5eXdtZmx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgyNDExMywiZXhwIjoyMDY1NDAwMTEzfQ.DyB_-8sUIZ-cWuSUjeIJzQ1J7w7Z6mNT_-FKZX5p8bc';

async function executeSQL(sql) {
  // Use fetch to call Supabase REST API with raw SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error };
  }

  const data = await response.json();
  return { success: true, data };
}

async function initDatabase() {
  console.log('========================================');
  console.log('Supabase Database Initialization');
  console.log('========================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  });

  // Read SQL schema
  const sqlPath = join(process.cwd(), 'scripts', 'init-db.sql');
  const sqlContent = readFileSync(sqlPath, 'utf-8');

  console.log(`SQL schema loaded: ${sqlContent.length} bytes\n`);

  const tablesToCheck = [
    'ledamoter',
    'voteringar',
    'motioner',
    'anforanden',
    'franvaro_analys',
    'retorik_analys',
    'motion_kvalitet'
  ];

  console.log('Step 1: Checking current database state...\n');
  let existingTables = [];

  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`  ✓ Table '${table}' exists (${count ?? 0} rows)`);
        existingTables.push(table);
      } else {
        console.log(`  - Table '${table}' does not exist`);
      }
    } catch (err) {
      console.log(`  - Table '${table}' does not exist`);
    }
  }

  console.log(`\n  Result: ${existingTables.length}/${tablesToCheck.length} tables exist\n`);

  if (existingTables.length === tablesToCheck.length) {
    console.log('========================================');
    console.log('✓ All tables already exist!');
    console.log('========================================\n');

    console.log('Summary:');
    console.log(`- Tables created: ${tablesToCheck.length}/${tablesToCheck.length}`);
    console.log('- Errors: 0');
    console.log('- Database ready: YES\n');
    return;
  }

  console.log('\n========================================');
  console.log('Step 2: Creating Missing Tables');
  console.log('========================================\n');

  console.log('MANUAL SETUP REQUIRED:\n');
  console.log('Supabase does not allow direct SQL execution via the REST API.');
  console.log('Please execute the SQL schema using one of these methods:\n');

  console.log('METHOD 1 (Recommended): Supabase Dashboard SQL Editor');
  console.log('-----------------------------------------------');
  console.log('1. Open: https://supabase.com/dashboard/project/kdwfiuzbnidukyywmflx/sql/new');
  console.log('2. Copy the SQL from: scripts/init-db.sql');
  console.log('3. Paste into the SQL Editor');
  console.log('4. Click "Run"\n');

  console.log('METHOD 2: Using psql (if installed)');
  console.log('-----------------------------------------------');
  console.log('First, get your database password from:');
  console.log('https://supabase.com/dashboard/project/kdwfiuzbnidukyywmflx/settings/database\n');
  console.log('Then run:');
  console.log('psql "postgresql://postgres.kdwfiuzbnidukyywmflx:[PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres" -f scripts/init-db.sql\n');

  console.log('METHOD 3: Copy & Paste SQL');
  console.log('-----------------------------------------------');
  console.log('Copy the SQL below and paste it into the Supabase SQL Editor:\n');
  console.log('========================================\n');
  console.log(sqlContent);
  console.log('\n========================================\n');

  console.log('After executing the SQL, run this script again to verify.\n');
}

initDatabase().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
