#!/usr/bin/env node
/**
 * Submit large batch jobs by splitting into chunks
 *
 * Usage:
 *   node scripts/submit_large_batch.js motion_quality 8035
 */

const http = require('http');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-secret-key-2025';
const API_BASE = 'http://localhost:3000';
const CHUNK_SIZE = 1000; // Max motions per batch

const args = process.argv.slice(2);
const analysisType = args[0] || 'motion_quality';
const totalLimit = parseInt(args[1] || '8035');

function httpRequest(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }

    req.end();
  });
}

async function submitBatch(type, limit) {
  const url = `${API_BASE}/api/admin/analysis/submit-batch?type=${type}&limit=${limit}&confirm=yes`;

  const response = await httpRequest(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_SECRET}`,
      'Content-Type': 'application/json'
    }
  });

  if (response.status !== 200) {
    throw new Error(`Failed to submit batch: ${JSON.stringify(response.data)}`);
  }

  return response.data;
}

async function main() {
  console.log('🚀 Large Batch Submission');
  console.log('='.repeat(80));
  console.log(`Analysis type: ${analysisType}`);
  console.log(`Total to analyze: ${totalLimit}`);
  console.log(`Chunk size: ${CHUNK_SIZE}`);
  console.log('='.repeat(80));

  const numChunks = Math.ceil(totalLimit / CHUNK_SIZE);
  console.log(`\nWill submit ${numChunks} batch jobs\n`);

  const batchIds = [];
  let totalCost = 0;
  let totalMotions = 0;

  for (let i = 0; i < numChunks; i++) {
    const chunkNum = i + 1;
    const chunkSize = Math.min(CHUNK_SIZE, totalLimit - (i * CHUNK_SIZE));

    console.log(`\n📤 Submitting batch ${chunkNum}/${numChunks} (${chunkSize} motions)...`);

    try {
      const result = await submitBatch(analysisType, chunkSize);

      if (result.success) {
        console.log(`   ✅ Batch ID: ${result.batch_id}`);
        console.log(`   Motions: ${result.motions_count || result.members_count}`);
        console.log(`   Cost: $${result.estimated_cost_usd}`);

        batchIds.push(result.batch_id);
        totalCost += parseFloat(result.estimated_cost_usd);
        totalMotions += parseInt(result.motions_count || result.members_count || 0);
      } else {
        console.error(`   ❌ Failed:`, result);
      }

      // Small delay to avoid overwhelming the server
      if (i < numChunks - 1) {
        console.log(`   ⏳ Waiting 2s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      break;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary:');
  console.log(`   Batches submitted: ${batchIds.length}/${numChunks}`);
  console.log(`   Total motions: ${totalMotions}`);
  console.log(`   Total cost: $${totalCost.toFixed(2)}`);
  console.log('='.repeat(80));

  if (batchIds.length > 0) {
    console.log('\n📋 Batch IDs (save these):');
    batchIds.forEach((id, i) => {
      console.log(`   ${i + 1}. ${id}`);
    });

    console.log('\n🔍 Check status:');
    console.log(`   node scripts/check_all_batch_status.js`);

    console.log('\n💾 Store results when ready (15-24h):');
    console.log(`   node scripts/store_all_completed_batches.js`);
  }

  console.log('');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
