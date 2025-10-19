import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

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

  // Split SQL into individual statements (simple split by semicolon)
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ statement: string; error: string }> = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments
    if (statement.trim().startsWith('--')) {
      continue;
    }

    console.log(`[${i + 1}/${statements.length}] Executing statement...`);
    console.log(statement.substring(0, 80) + '...\n');

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.error('Error:', error.message);
        errors.push({ statement: statement.substring(0, 100), error: error.message });
        errorCount++;
      } else {
        console.log('Success!\n');
        successCount++;
      }
    } catch (err: any) {
      // Try direct query if RPC fails
      try {
        const { error } = await supabase.from('_sql').insert({ query: statement });
        if (error) throw error;
        successCount++;
      } catch (directErr: any) {
        console.error('Error:', directErr.message);
        errors.push({ statement: statement.substring(0, 100), error: directErr.message });
        errorCount++;
      }
    }
  }

  console.log('\n========================================');
  console.log('Database Initialization Complete');
  console.log('========================================');
  console.log(`Total statements: ${statements.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\nErrors encountered:');
    errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. ${err.statement}...`);
      console.log(`   Error: ${err.error}`);
    });
  }

  // Verify tables
  console.log('\n========================================');
  console.log('Verifying Tables');
  console.log('========================================');

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
    } catch (err: any) {
      console.log(`✗ Table '${table}' error: ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`Tables created: ${tablesCreated}/${tablesToCheck.length}`);
  console.log(`Database ready: ${tablesCreated === tablesToCheck.length ? 'YES' : 'NO'}`);

  if (tablesCreated === tablesToCheck.length && errorCount === 0) {
    console.log('\n✓ All tables created successfully!');
    console.log('✓ Database is ready for data sync!');
  } else {
    console.log('\n⚠ Some issues occurred. Please review errors above.');
  }
}

initDatabase().catch(console.error);
