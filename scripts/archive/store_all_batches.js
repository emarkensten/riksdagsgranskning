#!/usr/bin/env node
const https = require('https');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const BATCHES = [
  { id: 'batch_68f7fda62de88190a104354ce9e736a4', num: 1 },
  { id: 'batch_68f7fdab79a08190a717fd998c3077a9', num: 2 },
  { id: 'batch_68f7fdb17e38819081a62178071310bb', num: 3 },
  { id: 'batch_68f7fdb7e41081909d9fca98f05c88a0', num: 4 },
  { id: 'batch_68f7fdbd7f908190955fc12e0fe31f83', num: 5 },
  { id: 'batch_68f7fdc3c8348190aec3d40bccf627af', num: 6 },
  { id: 'batch_68f7fdc9771c81909a7ef3a8993886c1', num: 7 },
  { id: 'batch_68f7fdceaf88819094496b4b825c7e35', num: 8 },
];

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_SECRET = 'dev-secret-key-2025';

function getBatchStatus(batchId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      path: `/v1/batches/${batchId}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
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
    req.end();
  });
}

function storeBatchResults(fileId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      fileId: fileId,
      type: 'motion_quality'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/analysis/store-batch-results',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_SECRET}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = http.request(options, (res) => {
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

async function main() {
  console.log('🔍 Checking and storing all motion quality batches...\n');

  let totalStored = 0;
  let totalFailed = 0;

  for (const batch of BATCHES) {
    try {
      console.log(`Batch ${batch.num}/8: ${batch.id}`);

      const status = await getBatchStatus(batch.id);

      if (status.status !== 'completed') {
        console.log(`  ⏳ Status: ${status.status} - skipping\n`);
        continue;
      }

      const completed = status.request_counts?.completed || 0;
      const total = status.request_counts?.total || 0;
      const fileId = status.output_file_id;

      console.log(`  ✅ Completed: ${completed}/${total}`);

      if (!fileId) {
        console.log(`  ⚠️  No output file - skipping\n`);
        continue;
      }

      console.log(`  💾 Storing results...`);
      const result = await storeBatchResults(fileId);

      if (result.success) {
        const stored = result.stats?.stored || 0;
        const failed = result.stats?.failed || 0;
        console.log(`  ✅ Stored: ${stored}, Failed: ${failed}\n`);
        totalStored += stored;
        totalFailed += failed;
      } else {
        console.log(`  ❌ Error: ${result.error}\n`);
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (e) {
      console.log(`  ❌ Error: ${e.message}\n`);
    }
  }

  console.log('========================================');
  console.log(`📊 Summary:`);
  console.log(`   Total stored: ${totalStored}`);
  console.log(`   Total failed: ${totalFailed}`);
  console.log('========================================');
}

main().catch(console.error);
