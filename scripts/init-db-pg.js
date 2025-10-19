const { Client } = require('pg');
const { readFileSync } = require('fs');
const { join } = require('path');

// Supabase connection details
const connectionString = 'postgresql://postgres.kdwfiuzbnidukyywmflx:[YOUR-PROJECT-PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres';

// Note: We need the database password, not the service role key
// The service role key is for REST API, not for direct PostgreSQL connection
// You can find the password in Supabase Dashboard > Project Settings > Database

async function initDatabase() {
  console.log('========================================');
  console.log('Supabase Database Initialization');
  console.log('========================================\n');

  // Read SQL schema
  const sqlPath = join(process.cwd(), 'scripts', 'init-db.sql');
  const sqlContent = readFileSync(sqlPath, 'utf-8');

  console.log('SQL schema loaded, length:', sqlContent.length, 'bytes\n');

  // We need to get the database password from environment or user
  // For now, let's use the Supabase client to check tables
  const { createClient } = require('@supabase/supabase-js');

  const SUPABASE_URL = 'https://kdwfiuzbnidukyywmflx.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd2ZpdXpibmlkdWt5eXdtZmx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgyNDExMywiZXhwIjoyMDY1NDAwMTEzfQ.DyB_-8sUIZ-cWuSUjeIJzQ1J7w7Z6mNT_-FKZX5p8bc';

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

  console.log('Checking current database state...\n');
  let existingTables = 0;

  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✓ Table '${table}' exists (${count ?? 0} rows)`);
        existingTables++;
      } else {
        console.log(`✗ Table '${table}' does not exist`);
      }
    } catch (err) {
      console.log(`✗ Table '${table}' does not exist`);
    }
  }

  console.log(`\nExisting tables: ${existingTables}/${tablesToCheck.length}\n`);

  if (existingTables === tablesToCheck.length) {
    console.log('========================================');
    console.log('✓ All tables already exist!');
    console.log('✓ Database is ready for data sync!');
    console.log('========================================\n');
    return;
  }

  console.log('========================================');
  console.log('SQL Execution Required');
  console.log('========================================\n');

  console.log('To create the tables, use the Supabase Dashboard SQL Editor:\n');
  console.log('1. Open: https://supabase.com/dashboard/project/kdwfiuzbnidukyywmflx/sql/new');
  console.log('2. Copy the SQL below');
  console.log('3. Paste into the SQL Editor');
  console.log('4. Click "Run"\n');

  console.log('Alternatively, if you have the database password:');
  console.log('psql "postgresql://postgres.kdwfiuzbnidukyywmflx:[PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres" -f scripts/init-db.sql\n');

  console.log('========================================');
  console.log('SQL Schema to Execute:');
  console.log('========================================\n');
  console.log(sqlContent);
  console.log('\n========================================\n');
}

initDatabase().catch(console.error);
