#!/usr/bin/env node
/**
 * Retrieve ALL 57 submitted batches from OpenAI
 *
 * Found via database query:
 * - 7 absence_detection batches (649 members)
 * - 48 motion_quality batches (38,008 motions)
 * - 2 rhetoric_analysis batches (406 members)
 */
const https = require('https');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_SECRET = 'dev-secret-key-2025';

// All 57 submitted batches from database (2025-10-22)
const BATCHES = {
  absence_detection: [
    'batch_68f71c11541c8190a6d0607563874b9f',
    'batch_68f71d33d9c48190968cfcea34bb3862',
    'batch_68f71dbb6d588190954acd9a4a963658',
    'batch_68f71ec6709c819093e39abd5e03cfee',
    'batch_68f729abe6b08190aefde5ee4e87f3ef',
    'batch_68f731a454208190b803a5e8d302af39',
    'batch_68f75f912e5c819085646381a17d681f',
  ],
  motion_quality: [
    'batch_68f52fd931708190b0373cf50e3c39a2',
    'batch_68f536c9b7a08190bbd266fa2d35bde9',
    'batch_68f539da4f688190abd4476fbcfc59c8',
    'batch_68f53b4ca2148190aab3cc7a4891e0eb',
    'batch_68f695b5c10481908549cb9338eb6c3a',
    'batch_68f6973a07708190858e7e27eb11bd40',
    'batch_68f71bd36d5481908c653760e5fbf607',
    'batch_68f71d2e18008190979678d405c0ee6e',
    'batch_68f71db89b1c8190ac53d37731abec90',
    'batch_68f71ec2e2bc8190957b809f5e4e7239',
    'batch_68f72902bca081909e6861bfa8246c95',
    'batch_68f739fab39881909d3dccf19ee97693',
    'batch_68f76f374638819080c85a4e1be40375',
    'batch_68f7f2ce43708190b0970a629a5f4af0',
    'batch_68f7f2d04a38819097ba061e40ffe897',
    'batch_68f7f2d3edbc8190b8e8ec3d08087b68',
    'batch_68f7f2d79ac8819092088151fa43b34d',
    'batch_68f7fda62de88190a104354ce9e736a4',
    'batch_68f7fdab79a08190a717fd998c3077a9',
    'batch_68f7fdb17e38819081a62178071310bb',
    'batch_68f7fdb7e41081909d9fca98f05c88a0',
    'batch_68f7fdbd7f908190955fc12e0fe31f83',
    'batch_68f7fdc3c8348190aec3d40bccf627af',
    'batch_68f7fdc9771c81909a7ef3a8993886c1',
    'batch_68f7fdceaf88819094496b4b825c7e35',
    'batch_68f88ff19ec48190b4af6ef688717368',
    'batch_68f89014ad18819095df5d65aeaa226d',
    'batch_68f89018b5108190a9652663ccad07a7',
    'batch_68f8901c5d0081909764e1cb52b618a1',
    'batch_68f8901ff7dc8190847e0677852df995',
    'batch_68f890238f588190a99452d84d3eeeff',
    'batch_68f890296fb881909a679bcd8a2ddb2d',
    'batch_68f8902e67b48190b58f6d2301f99073',
    'batch_68f89031b280819097fdbe8606edc743',
    'batch_68f89034bd688190a1eb7517e231f097',
    'batch_68f8996d340881909de48c3158193026',
    'batch_68f899715ea481909f136d0a24fdbc7b',
    'batch_68f89975074c81908c93eee1fec4118b',
    'batch_68f89978740c819095fe4c3add0dc509',
    'batch_68f8997ceaac81908739b997a88918da',
    'batch_68f8998151c08190a3356037b123f4d9',
    'batch_68f89984bebc8190a06ed6ade3cc3e60',
    'batch_68f89987c4788190ab5aabc4f7cd48a3',
    'batch_68f8d67bee4081908d0ea1c62b432732',
    'batch_68f8d6888f908190be58aefa878f5538',
    'batch_68f8d69407c88190a7fc9d87ab83f6be',
    'batch_68f8d69f2c1c8190b99f9b78e0356f33',
    'batch_68f8d6aa5f548190befe250db8c3ec5c',
    'batch_68f8d6b7c5948190b5c02e1fd8e5a7dc',
    'batch_68f8d6c33fc88190af21f1830e121803',
  ],
  rhetoric_analysis: [
    'batch_68f75fe287ec8190ab9861fcbd66fdab',
    'batch_68f760ae40d881909c6f2150a0454322',
  ]
};

function checkBatch(batchId) {
  return new Promise((resolve, reject) => {
    https.request({
      hostname: 'api.openai.com',
      path: `/v1/batches/${batchId}`,
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${data.slice(0, 100)}`));
        }
      });
    }).on('error', reject).end();
  });
}

function storeResults(fileId, type) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ fileId, type });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/analysis/store-batch-results',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_SECRET}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      },
      timeout: 300000 // 5 minute timeout
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${data.slice(0, 100)}`));
        }
      });
    }).on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🔍 Retrieving ALL 57 submitted batches from OpenAI...\n');
  console.log('Breakdown:');
  console.log(`  - ${BATCHES.absence_detection.length} absence_detection batches`);
  console.log(`  - ${BATCHES.motion_quality.length} motion_quality batches`);
  console.log(`  - ${BATCHES.rhetoric_analysis.length} rhetoric_analysis batches`);
  console.log('\n' + '='.repeat(80) + '\n');

  let stats = {
    completed: 0,
    in_progress: 0,
    failed: 0,
    stored: 0,
    skipped: 0,
    errors: 0
  };

  let count = 0;
  const total = BATCHES.absence_detection.length + BATCHES.motion_quality.length + BATCHES.rhetoric_analysis.length;

  // Process each type
  for (const [type, batchIds] of Object.entries(BATCHES)) {
    console.log(`\n📊 Processing ${type} (${batchIds.length} batches)...\n`);

    for (let i = 0; i < batchIds.length; i++) {
      count++;
      const batchId = batchIds[i];

      console.log(`[${count}/${total}] ${batchId.slice(-12)}...`);

      try {
        const batch = await checkBatch(batchId);
        const status = batch.status;
        const counts = batch.request_counts || {};

        console.log(`   Status: ${status} (${counts.completed || 0}/${counts.total || 0})`);

        if (status === 'completed' && batch.output_file_id) {
          stats.completed++;
          console.log(`   💾 Storing...`);

          const result = await storeResults(batch.output_file_id, type);

          if (result.success) {
            const stored = result.stats.stored || 0;
            const skipped = result.stats.skipped || 0;
            const failed = result.stats.failed || 0;

            console.log(`   ✅ Stored: ${stored}, Skipped: ${skipped}, Failed: ${failed}`);
            stats.stored += stored;
            stats.skipped += skipped;
          } else {
            console.log(`   ❌ Error: ${result.error}`);
            stats.errors++;
          }
        } else if (status === 'in_progress') {
          stats.in_progress++;
          console.log(`   ⏳ Still processing...`);
        } else if (status === 'failed') {
          stats.failed++;
          console.log(`   ❌ Failed at OpenAI`);
        } else {
          console.log(`   ❓ Unknown: ${status}`);
        }

        console.log();

        // Rate limit: 1 second between requests
        if (count < total) {
          await new Promise(r => setTimeout(r, 1000));
        }

      } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        stats.errors++;
        console.log();
      }
    }
  }

  console.log('='.repeat(80));
  console.log('📊 FINAL SUMMARY\n');
  console.log(`Total batches checked: ${total}`);
  console.log(`  ✅ Completed: ${stats.completed}`);
  console.log(`  ⏳ In progress: ${stats.in_progress}`);
  console.log(`  ❌ Failed: ${stats.failed}`);
  console.log(`  ❗ Errors: ${stats.errors}`);
  console.log();
  console.log(`✨ NEW analyses stored: ${stats.stored}`);
  console.log(`🔄 Duplicates skipped: ${stats.skipped}`);
  console.log('='.repeat(80));

  if (stats.completed > 0) {
    console.log('\n✅ Running coverage check...\n');

    const { spawn } = require('child_process');
    const coverage = spawn('node', ['scripts/check_coverage.js'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });

    coverage.on('close', () => {
      console.log('\n🎉 Batch retrieval complete!');
      process.exit(0);
    });
  } else {
    console.log('\n⏳ No completed batches found. All still processing.');
    process.exit(0);
  }
}

if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY environment variable!');
  process.exit(1);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
