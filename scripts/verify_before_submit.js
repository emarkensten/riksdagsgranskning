#!/usr/bin/env node
/**
 * Verify exactly how many motions need analysis BEFORE submitting batch
 * This prevents wasted money on duplicate analyses
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔍 Verifying Motion Analysis Coverage\n');
  console.log('='.repeat(80));

  // Check total motions
  const { count: totalCount } = await supabase
    .from('motioner')
    .select('*', { count: 'exact', head: true })
    .in('riksmote', ['2022/23', '2023/24', '2024/25'])
    .not('titel', 'is', null)
    .neq('titel', '');

  // Check analyzed motions
  const { count: analyzedCount } = await supabase
    .from('motion_kvalitet')
    .select('*', { count: 'exact', head: true });

  // Get motions WITHOUT analysis using direct SQL query
  // (RPC function has issues with large limits in Supabase JS client)
  const { data: needingAnalysis, error } = await supabase
    .from('motioner')
    .select('id, ledamot_id, titel, riksmote, datum')
    .in('riksmote', ['2022/23', '2023/24', '2024/25'])
    .not('titel', 'is', null)
    .neq('titel', '')
    .limit(10000);

  if (error) {
    console.error('❌ Error fetching motions:', error);
    return;
  }

  // Filter out those that already have analysis
  const { data: analyzed } = await supabase
    .from('motion_kvalitet')
    .select('motion_id');

  const analyzedIds = new Set(analyzed.map(a => a.motion_id));
  const actuallyNeeding = needingAnalysis.filter(m => !analyzedIds.has(m.id));

  console.log('📊 Database State:');
  console.log(`   Total motions (2022-2025): ${totalCount}`);
  console.log(`   Already analyzed: ${analyzedCount}`);
  console.log(`   Needing analysis: ${actuallyNeeding.length}`);
  console.log('='.repeat(80));

  // Breakdown by riksmöte
  const breakdown = {};
  actuallyNeeding.forEach(m => {
    breakdown[m.riksmote] = (breakdown[m.riksmote] || 0) + 1;
  });

  console.log('\n📈 Breakdown by Riksmöte:');
  Object.entries(breakdown).sort().forEach(([rm, count]) => {
    console.log(`   ${rm}: ${count} motions`);
  });

  // Sample first 5
  console.log('\n📝 Sample motions needing analysis:');
  actuallyNeeding.slice(0, 5).forEach(m => {
    console.log(`   ${m.id} - ${m.titel?.substring(0, 60)}...`);
  });

  // Cost estimate
  const estimatedCost = (actuallyNeeding.length * 0.0001).toFixed(4);
  console.log('\n💰 Estimated Cost:');
  console.log(`   ${actuallyNeeding.length} motions × $0.0001 ≈ $${estimatedCost} USD`);

  console.log('\n✅ Verification complete!');
  console.log('\n⚠️  IMPORTANT: Submit in batches of 1000 max (OpenAI limit)');
  console.log('\nTo submit first batch:');
  console.log(`   curl -X POST 'http://localhost:3001/api/admin/analysis/submit-batch?type=motion_quality&limit=1000&confirm=yes' \\`);
  console.log(`     -H "Authorization: Bearer dev-secret-key-2025"`);
}

main().catch(console.error);
