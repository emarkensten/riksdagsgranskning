#!/usr/bin/env node
/**
 * Check status of all batch jobs from CURRENT_BATCH_STATUS.md
 */

const https = require('https');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const STATUS_FILE = path.join(__dirname, '../CURRENT_BATCH_STATUS.md');

// Extract batch IDs from status file
function getBatchIdsFromFile() {
  if (!fs.existsSync(STATUS_FILE)) {
    console.error('❌ CURRENT_BATCH_STATUS.md not found');
    return [];
  }

  const content = fs.readFileSync(STATUS_FILE, 'utf8');
  const batchIds = [];
  const regex = /batch_[a-f0-9]+/g;
  const matches = content.match(regex);

  if (matches) {
    // Remove duplicates
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

async function main() {
  console.log('🔍 Checking All Batch Status');
  console.log('='.repeat(80));

  const batchIds = getBatchIdsFromFile();

  if (batchIds.length === 0) {
    console.log('❌ No batch IDs found in CURRENT_BATCH_STATUS.md');
    process.exit(1);
  }

  console.log(`Found ${batchIds.length} batches to check\n`);

  let completed = 0;
  let inProgress = 0;
  let validating = 0;
  let failed = 0;
  let totalProcessed = 0;
  let totalItems = 0;

  for (let i = 0; i < batchIds.length; i++) {
    const batchId = batchIds[i];
    console.log(`[${i + 1}/${batchIds.length}] ${batchId}`);

    try {
      const status = await checkBatchStatus(batchId);

      const counts = status.request_counts || {};
      const total = counts.total || 0;
      const done = counts.completed || 0;
      const failedCount = counts.failed || 0;

      totalItems += total;
      totalProcessed += done;

      let icon = '❓';
      if (status.status === 'completed') {
        icon = '✅';
        completed++;
      } else if (status.status === 'in_progress') {
        icon = '⏳';
        inProgress++;
      } else if (status.status === 'validating') {
        icon = '🔄';
        validating++;
      } else if (status.status === 'failed') {
        icon = '❌';
        failed++;
      }

      console.log(`  ${icon} Status: ${status.status}`);
      console.log(`  📊 Progress: ${done}/${total} (${failedCount} failed)`);

      if (status.output_file_id) {
        console.log(`  📄 File ID: ${status.output_file_id}`);
      }

      console.log('');

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
      failed++;
    }
  }

  console.log('='.repeat(80));
  console.log('📊 Summary:');
  console.log(`  ✅ Completed: ${completed}`);
  console.log(`  ⏳ In Progress: ${inProgress}`);
  console.log(`  🔄 Validating: ${validating}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Total Progress: ${totalProcessed}/${totalItems} (${totalItems > 0 ? (totalProcessed/totalItems*100).toFixed(1) : 0}%)`);
  console.log('='.repeat(80));

  if (completed === batchIds.length) {
    console.log('\n🎉 All batches completed! Ready to store results.');
    console.log('\n💾 Run:');
    console.log('   node scripts/store_all_completed_batches.js');
  } else if (completed > 0) {
    console.log(`\n✅ ${completed} batches ready to store.`);
    console.log('\n💾 Run:');
    console.log('   node scripts/store_all_completed_batches.js');
  } else {
    console.log('\n⏳ No batches completed yet. Check again later.');
  }

  console.log('');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
