const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kdwfiuzbnidukyywmflx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd2ZpdXpibmlkdWt5eXdtZmx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgyNDExMywiZXhwIjoyMDY1NDAwMTEzfQ.DyB_-8sUIZ-cWuSUjeIJzQ1J7w7Z6mNT_-FKZX5p8bc';

async function checkTables() {
  console.log('========================================');
  console.log('Checking Supabase Database Tables');
  console.log('========================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const tablesToCheck = [
    'ledamoter',
    'voteringar',
    'motioner',
    'anforanden',
    'franvaro_analys',
    'retorik_analys',
    'motion_kvalitet'
  ];

  let tablesExist = 0;
  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✓ Table '${table}' exists (${count ?? 0} rows)`);
        tablesExist++;
      } else {
        console.log(`✗ Table '${table}' does not exist`);
        console.log(`  Error: ${error.message}`);
      }
    } catch (err) {
      console.log(`✗ Table '${table}' check failed: ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`Tables found: ${tablesExist}/${tablesToCheck.length}`);
  console.log(`Database ready: ${tablesExist === tablesToCheck.length ? 'YES ✓' : 'NO ✗'}\n`);

  if (tablesExist === 0) {
    console.log('========================================');
    console.log('ACTION REQUIRED: Create Tables Manually');
    console.log('========================================\n');
    console.log('No tables found. Please create them using Supabase Dashboard:\n');
    console.log('1. Open: https://supabase.com/dashboard/project/kdwfiuzbnidukyywmflx/editor');
    console.log('2. Click SQL Editor');
    console.log('3. Create new query');
    console.log('4. Copy SQL from: scripts/init-db.sql');
    console.log('5. Click "Run"\n');
  } else if (tablesExist < tablesToCheck.length) {
    console.log('⚠ Some tables are missing. Please create remaining tables.\n');
  } else {
    console.log('✓ All tables exist! Database is ready.\n');
  }
}

checkTables().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
