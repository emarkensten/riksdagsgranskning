#!/usr/bin/env node
const https = require('https');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const BATCHES = [
  'batch_68f89014ad18819095df5d65aeaa226d',
  'batch_68f89018b5108190a9652663ccad07a7',
  'batch_68f8901c5d0081909764e1cb52b618a1',
  'batch_68f8901ff7dc8190847e0677852df995',
  'batch_68f890238f588190a99452d84d3eeeff',
  'batch_68f890296fb881909a679bcd8a2ddb2d',
  'batch_68f8902e67b48190b58f6d2301f99073',
  'batch_68f89031b280819097fdbe8606edc743',
  'batch_68f89034bd688190a1eb7517e231f097',
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
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🔍 Checking 9 batches...\n');

  let completed = 0, pending = 0, totalStored = 0;

  for (let i = 0; i < BATCHES.length; i++) {
    const batchId = BATCHES[i];
    console.log(`[${i+1}/9] ${batchId.slice(0,20)}...`);

    try {
      const batch = await checkBatch(batchId);
      const counts = batch.request_counts || {};

      if (batch.status === 'completed' && batch.output_file_id) {
        console.log(`  ✅ Completed: ${counts.completed}/${counts.total}`);
        console.log(`  💾 Storing...`);

        const result = await storeResults(batch.output_file_id);
        if (result.success) {
          console.log(`  ✅ Stored: ${result.stats.stored}\n`);
          totalStored += result.stats.stored;
          completed++;
        } else {
          console.log(`  ❌ Error storing\n`);
        }
      } else {
        console.log(`  ⏳ Status: ${batch.status}\n`);
        pending++;
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}\n`);
    }
  }

  console.log('================================================================================');
  console.log(`📊 Summary: ${completed} completed, ${pending} pending, ${totalStored} motions stored`);
  console.log('================================================================================\n');
}

main();
