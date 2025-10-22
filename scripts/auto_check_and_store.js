#!/usr/bin/env node
/**
 * Auto-check batch status every 10 minutes and store when ready
 */
const https = require('https');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

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
const CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes

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

async function checkAllBatches() {
  console.log(`\n[${new Date().toISOString()}] 🔍 Checking batch status...`);

  const results = await Promise.all(BATCHES.map(id => checkBatch(id)));

  let totalCompleted = 0;
  let totalTotal = 0;
  let allCompleted = true;

  results.forEach((batch, i) => {
    const counts = batch.request_counts || {};
    const status = batch.status;
    const completed = counts.completed || 0;
    const total = counts.total || 0;

    const statusEmoji = status === 'completed' ? '✅' :
                       status === 'in_progress' ? '⏳' : '❌';

    console.log(`${statusEmoji} Batch ${i+1}/7: ${completed}/${total} (${status})`);

    totalCompleted += completed;
    totalTotal += total;
    if (status !== 'completed') allCompleted = false;
  });

  console.log(`📊 TOTAL: ${totalCompleted}/${totalTotal} (${((totalCompleted/totalTotal)*100).toFixed(1)}%)`);

  return allCompleted;
}

async function storeAllResults() {
  console.log('\n✅ All batches completed! Storing results...\n');

  let totalStored = 0;
  let totalSkipped = 0;

  for (let i = 0; i < BATCHES.length; i++) {
    const batchId = BATCHES[i];
    console.log(`[${i+1}/7] Storing ${batchId.slice(-8)}...`);

    try {
      const batch = await checkBatch(batchId);

      if (batch.status === 'completed' && batch.output_file_id) {
        const result = await storeResults(batch.output_file_id);
        if (result.success) {
          console.log(`  ✅ Stored: ${result.stats.stored}, Skipped: ${result.stats.skipped || 0}`);
          totalStored += result.stats.stored;
          totalSkipped += result.stats.skipped || 0;
        } else {
          console.log(`  ❌ Error: ${result.error}`);
        }
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`📊 Storage Summary:`);
  console.log(`   ${totalStored} motions stored`);
  console.log(`   ${totalSkipped} duplicates skipped`);
  console.log('='.repeat(80));

  return totalStored;
}

async function main() {
  console.log('🤖 Auto-check and store started');
  console.log(`⏰ Will check every 10 minutes until all batches complete`);
  console.log(`🛑 Press Ctrl+C to stop\n`);

  let checkCount = 0;

  const interval = setInterval(async () => {
    checkCount++;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Check #${checkCount}`);
    console.log('='.repeat(80));

    try {
      const allCompleted = await checkAllBatches();

      if (allCompleted) {
        clearInterval(interval);

        const stored = await storeAllResults();

        console.log('\n✅ ALL DONE! Running validation...\n');

        // Run coverage check
        const { spawn } = require('child_process');
        const coverage = spawn('node', ['scripts/check_coverage.js'], {
          cwd: process.cwd(),
          stdio: 'inherit'
        });

        coverage.on('close', (code) => {
          console.log('\n🎉 Round 3 complete! Check PROJECT_STATE.md for summary.');
          process.exit(0);
        });
      } else {
        console.log(`⏰ Next check in 10 minutes...\n`);
      }
    } catch (e) {
      console.error('❌ Error during check:', e.message);
      console.log('⏰ Will retry in 10 minutes...\n');
    }
  }, CHECK_INTERVAL);

  // Initial check immediately
  console.log('Running initial check...\n');
  try {
    const allCompleted = await checkAllBatches();

    if (allCompleted) {
      clearInterval(interval);
      const stored = await storeAllResults();

      console.log('\n✅ ALL DONE! Running validation...\n');

      const { spawn } = require('child_process');
      const coverage = spawn('node', ['scripts/check_coverage.js'], {
        cwd: process.cwd(),
        stdio: 'inherit'
      });

      coverage.on('close', (code) => {
        console.log('\n🎉 Round 3 complete!');
        process.exit(0);
      });
    } else {
      console.log(`⏰ Not ready yet. Next check in 10 minutes...\n`);
    }
  } catch (e) {
    console.error('❌ Error during initial check:', e.message);
    console.log('⏰ Will retry in 10 minutes...\n');
  }
}

main().catch(console.error);
