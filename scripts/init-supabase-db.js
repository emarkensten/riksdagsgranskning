const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');

const SUPABASE_URL = 'https://kdwfiuzbnidukyywmflx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd2ZpdXpibmlkdWt5eXdtZmx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgyNDExMywiZXhwIjoyMDY1NDAwMTEzfQ.DyB_-8sUIZ-cWuSUjeIJzQ1J7w7Z6mNT_-FKZX5p8bc';

async function initDatabase() {
  console.log('Connecting to Supabase...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read SQL schema
  const sqlPath = join(process.cwd(), 'scripts', 'init-db.sql');
  const sqlContent = readFileSync(sqlPath, 'utf-8');

  console.log('SQL schema loaded, length:', sqlContent.length);
  console.log('\nExecuting SQL schema...\n');

  // Since Supabase doesn't support direct SQL execution via REST API easily,
  // let's execute each statement individually through the postgres REST endpoint

  // First, let's try to verify connection and list existing tables
  console.log('Verifying connection...\n');

  const tablesToCheck = [
    'ledamoter',
    'voteringar',
    'motioner',
    'anforanden',
    'franvaro_analys',
    'retorik_analys',
    'motion_kvalitet'
  ];

  console.log('Checking existing tables...\n');
  let existingTables = 0;

  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✓ Table '${table}' already exists (${count ?? 0} rows)`);
        existingTables++;
      } else {
        console.log(`- Table '${table}' does not exist yet`);
      }
    } catch (err) {
      console.log(`- Table '${table}' does not exist yet`);
    }
  }

  if (existingTables === tablesToCheck.length) {
    console.log('\n✓ All tables already exist!');
    console.log('✓ Database is ready for data sync!');
    return;
  }

  console.log('\n========================================');
  console.log('Need to create tables using SQL execution');
  console.log('========================================\n');

  console.log('Unfortunately, Supabase JS client does not support direct SQL execution.');
  console.log('You need to use one of these methods:\n');
  console.log('1. Supabase Dashboard SQL Editor:');
  console.log('   - Go to: https://kdwfiuzbnidukyywmflx.supabase.co/project/kdwfiuzbnidukyywmflx/sql');
  console.log('   - Copy and paste the SQL from: scripts/init-db.sql');
  console.log('   - Click "Run"\n');
  console.log('2. PostgreSQL CLI (psql):');
  console.log('   Install psql and run:');
  console.log('   psql "postgresql://postgres:[PASSWORD]@db.kdwfiuzbnidukyywmflx.supabase.co:5432/postgres" -f scripts/init-db.sql\n');
  console.log('3. Supabase CLI:');
  console.log('   supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.kdwfiuzbnidukyywmflx.supabase.co:5432/postgres"\n');

  console.log('SQL content to execute:\n');
  console.log('========================================');
  console.log(sqlContent);
  console.log('========================================\n');
}

initDatabase().catch(console.error);
