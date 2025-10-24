#!/usr/bin/env node
const https = require('https');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

// Round 2 batches (submitted 2025-10-22)
const BATCHES = [
  'batch_68f8996d340881909de48c3158193026',
  'batch_68f899715ea481909f136d0a24fdbc7b',
  'batch_68f89975074c81908c93eee1fec4118b',
  'batch_68f89978740c819095fe4c3add0dc509',
  'batch_68f8997ceaac81908739b997a88918da',
  'batch_68f8998151c08190a3356037b123f4d9',
  'batch_68f89984bebc8190a06ed6ade3cc3e60',
  'batch_68f89987c4788190ab5aabc4f7cd48a3',
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
      port: 3001,
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
  console.log('🔍 Storing Round 2 Batches (8 batches, 7,035 motions)...\n');

  let completed = 0, totalStored = 0, totalSkipped = 0;

  for (let i = 0; i < BATCHES.length; i++) {
    const batchId = BATCHES[i];
    console.log(`[${i+1}/8] ${batchId.slice(-8)}...`);

    try {
      const batch = await checkBatch(batchId);
      const counts = batch.request_counts || {};

      if (batch.status === 'completed' && batch.output_file_id) {
        console.log(`  ✅ Completed: ${counts.completed}/${counts.total}`);
        console.log(`  💾 Storing...`);

        const result = await storeResults(batch.output_file_id);
        if (result.success) {
          console.log(`  ✅ Stored: ${result.stats.stored}, Skipped: ${result.stats.skipped}\n`);
          totalStored += result.stats.stored;
          totalSkipped += result.stats.skipped;
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
  console.log(`   ${completed}/8 batches stored`);
  console.log(`   ${totalStored} motions stored`);
  console.log(`   ${totalSkipped} duplicates skipped`);
  console.log('='.repeat(80));

  if (completed === 8) {
    console.log('\n✅ All done! Check coverage:');
    console.log('   node scripts/check_coverage.js');
  }
}

main().catch(console.error);
