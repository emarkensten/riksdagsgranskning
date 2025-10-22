#!/usr/bin/env node
const https = require('https');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

// Round 3 batches (submitted 2025-10-22 14:48 CET)
const BATCHES = [
  'batch_68f8d67bee4081908d0ea1c62b432732',
  'batch_68f8d6888f908190be58aefa878f5538',
  'batch_68f8d69407c88190a7fc9d87ab83f6be',
  'batch_68f8d69f2c1c8190b99f9b78e0356f33',
  'batch_68f8d6aa5f548190befe250db8c3ec5c',
  'batch_68f8d6b7c5948190b5c02e1fd8e5a7dc',
  'batch_68f8d6c33fc88190af21f1830e121803',
];

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_SECRET = 'dev-secret-key-2025';

function checkBatch(batchId) {
  return new Promise((resolve, reject) => {
    https.request({
      hostname: 'api.openai.com',
      path: `/v1/batches/${batchId}`,
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject).end();
  });
}

function storeResults(fileId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ fileId, type: 'motion_quality' });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/analysis/store-batch-results',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_SECRET}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    }).on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🔍 Storing Round 3 Batches (7 batches, 7,000 motions)...\n');

  let completed = 0, totalStored = 0, totalSkipped = 0;

  for (let i = 0; i < BATCHES.length; i++) {
    const batchId = BATCHES[i];
    console.log(`[${i+1}/7] ${batchId.slice(-8)}...`);

    try {
      const batch = await checkBatch(batchId);
      const counts = batch.request_counts || {};

      if (batch.status === 'completed' && batch.output_file_id) {
        console.log(`  ✅ Completed: ${counts.completed}/${counts.total}`);
        console.log(`  💾 Storing...`);

        const result = await storeResults(batch.output_file_id);
        if (result.success) {
          console.log(`  ✅ Stored: ${result.stats.stored}, Skipped: ${result.stats.skipped || 0}\n`);
          totalStored += result.stats.stored;
          totalSkipped += result.stats.skipped || 0;
          completed++;
        } else {
          console.log(`  ❌ Error: ${result.error}\n`);
        }
      } else {
        console.log(`  ⏳ Status: ${batch.status}\n`);
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}\n`);
    }
  }

  console.log('='.repeat(80));
  console.log(`📊 Summary:`);
  console.log(`   ${completed}/7 batches stored`);
  console.log(`   ${totalStored} motions stored`);
  console.log(`   ${totalSkipped} duplicates skipped`);
  console.log('='.repeat(80));

  if (completed === 7) {
    console.log('\n✅ All done! Check coverage:');
    console.log('   node scripts/check_coverage.js');
    console.log('\n📊 Expected coverage: ~100% (8,671/8,706 motions)');
  }
}

main().catch(console.error);
