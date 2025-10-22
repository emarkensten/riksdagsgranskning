#!/usr/bin/env node
/**
 * Check analysis coverage for all analysis types
 *
 * Usage:
 *   node scripts/check_coverage.js
 *   node scripts/check_coverage.js --type=motion_quality
 *   node scripts/check_coverage.js --riksmote=2024/25
 */

const https = require('https');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const type = args.find(a => a.startsWith('--type='))?.split('=')[1];
const riksmote = args.find(a => a.startsWith('--riksmote='))?.split('=')[1];

async function querySupabase(query) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/get_analysis_coverage`);

    const postData = JSON.stringify({
      analysis_type: type || null,
      riksmote_filter: riksmote || null
    });

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getMotionQualityCoverage() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/get_motion_quality_coverage`);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write('{}');
    req.end();
  });
}

async function main() {
  console.log('📊 Analysis Coverage Report');
  console.log('=' .repeat(80));

  try {
    const coverage = await getMotionQualityCoverage();

    console.log('\n🎯 Motion Quality Analysis');
    console.log('-'.repeat(80));

    let totalMotions = 0;
    let totalAnalyzed = 0;
    let totalMissing = 0;

    if (Array.isArray(coverage)) {
      coverage.forEach(row => {
        const pct = row.coverage_percent || 0;
        const bar = '█'.repeat(Math.floor(pct / 2)) + '░'.repeat(50 - Math.floor(pct / 2));

        console.log(`${row.riksmote}  ${bar} ${pct.toFixed(1)}%`);
        console.log(`  Total: ${row.total_motions} | Analyzed: ${row.with_analysis} | Missing: ${row.without_analysis}`);
        console.log('');

        totalMotions += row.total_motions;
        totalAnalyzed += row.with_analysis;
        totalMissing += row.without_analysis;
      });

      const totalPct = totalMotions > 0 ? (totalAnalyzed / totalMotions * 100) : 0;

      console.log('-'.repeat(80));
      console.log(`TOTAL   | ${totalMotions} motions | ${totalAnalyzed} analyzed (${totalPct.toFixed(1)}%) | ${totalMissing} missing`);

      // Cost estimate
      const estimatedCost = totalMissing * 0.0001;
      console.log('');
      console.log(`💰 Cost estimate for remaining: $${estimatedCost.toFixed(2)} USD`);
      console.log(`⏱️  Estimated time: 15-24 hours`);

      // Next steps
      if (totalMissing > 0) {
        console.log('');
        console.log('🚀 Next steps:');
        console.log('');
        console.log('1. Submit batch job:');
        console.log(`   curl -X POST 'http://localhost:3000/api/admin/analysis/submit-batch?type=motion_quality&limit=${totalMissing}&confirm=yes' \\`);
        console.log(`     -H "Authorization: Bearer dev-secret-key-2025"`);
        console.log('');
        console.log('2. Use batch pipeline (recommended):');
        console.log(`   node scripts/batch_pipeline.js motion_quality`);
      } else {
        console.log('');
        console.log('✅ 100% coverage achieved!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Make sure:');
    console.error('- Supabase environment variables are set in .env.local');
    console.error('- Database function get_motion_quality_coverage exists');
    process.exit(1);
  }

  console.log('');
  console.log('=' .repeat(80));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
