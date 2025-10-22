#!/usr/bin/env node
/**
 * Store results from all completed batches
 */

const https = require('https');
const http = require('http');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-secret-key-2025';
const API_BASE = 'http://localhost:3000';
const STATUS_FILE = path.join(__dirname, '../CURRENT_BATCH_STATUS.md');

function getBatchIdsFromFile() {
  if (!fs.existsSync(STATUS_FILE)) {
    return [];
  }

  const content = fs.readFileSync(STATUS_FILE, 'utf8');
  const batchIds = [];
  const regex = /batch_[a-f0-9]+/g;
  const matches = content.match(regex);

  if (matches) {
    return [...new Set(matches)];
  }

  return [];
}

function checkBatchStatus(batchId) {
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
  console.log('💾 Store All Completed Batches');
  console.log('='.repeat(80));

  const batchIds = getBatchIdsFromFile();

  if (batchIds.length === 0) {
    console.log('❌ No batch IDs found in CURRENT_BATCH_STATUS.md');
    process.exit(1);
  }

  console.log(`Found ${batchIds.length} batches\n`);

  let totalStored = 0;
  let totalFailed = 0;
  let skipped = 0;

  for (let i = 0; i < batchIds.length; i++) {
    const batchId = batchIds[i];
    console.log(`[${i + 1}/${batchIds.length}] ${batchId}`);

    try {
      // Check status
      const status = await checkBatchStatus(batchId);

      if (status.status !== 'completed') {
        console.log(`  ⏭️  Status: ${status.status} - skipping\n`);
        skipped++;
        continue;
      }

      if (!status.output_file_id) {
        console.log(`  ⚠️  No output file - skipping\n`);
        skipped++;
        continue;
      }

      const counts = status.request_counts || {};
      console.log(`  ✅ Completed: ${counts.completed}/${counts.total}`);
      console.log(`  💾 Storing results...`);

      // Store results
      const result = await storeBatchResults(status.output_file_id);

      if (result.success) {
        const stored = result.stats?.stored || 0;
        const failed = result.stats?.failed || 0;
        console.log(`  ✅ Stored: ${stored}, Failed: ${failed}\n`);
        totalStored += stored;
        totalFailed += failed;
      } else {
        console.log(`  ❌ Error: ${result.error}\n`);
        totalFailed++;
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
      totalFailed++;
    }
  }

  console.log('='.repeat(80));
  console.log('📊 Summary:');
  console.log(`  ✅ Total stored: ${totalStored}`);
  console.log(`  ❌ Total failed: ${totalFailed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log('='.repeat(80));

  if (totalStored > 0) {
    console.log('\n✅ Results stored! Verify coverage:');
    console.log('   node scripts/check_coverage.js');
  }

  console.log('');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
