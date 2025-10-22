#!/usr/bin/env node
/**
 * Complete batch analysis pipeline
 *
 * This script handles the entire flow:
 * 1. Check what needs analysis
 * 2. Submit batch jobs to OpenAI
 * 3. Poll for completion
 * 4. Store results in database
 *
 * Usage:
 *   node scripts/batch_pipeline.js motion_quality
 *   node scripts/batch_pipeline.js motion_quality --limit=100
 *   node scripts/batch_pipeline.js motion_quality --store-only --batch-id=batch_xxx
 *   node scripts/batch_pipeline.js motion_quality --auto  (for scheduled jobs)
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
const STATE_FILE = path.join(__dirname, '.batch_pipeline_state.json');

// Parse arguments
const args = process.argv.slice(2);
const analysisType = args[0] || 'motion_quality';
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');
const storeOnly = args.includes('--store-only');
const batchId = args.find(a => a.startsWith('--batch-id='))?.split('=')[1];
const autoMode = args.includes('--auto');
const pollInterval = parseInt(args.find(a => a.startsWith('--poll='))?.split('=')[1] || '1800'); // 30 min default

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not load state file:', e.message);
  }
  return {};
}

function httpRequest(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(reqOptions, (res) => {
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

function openaiRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'api.openai.com',
      path: path,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse OpenAI response'));
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function checkBatchStatus(batchId) {
  return await openaiRequest(`/v1/batches/${batchId}`);
}

async function submitBatch(type, limit) {
  console.log(`\n📤 Submitting batch job...`);
  console.log(`   Type: ${type}`);
  console.log(`   Limit: ${limit || 'all'}`);

  const url = `${API_BASE}/api/admin/analysis/submit-batch?type=${type}${limit ? `&limit=${limit}` : ''}&confirm=yes`;

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

async function storeBatchResults(fileId, type) {
  console.log(`\n💾 Storing batch results...`);

  const response = await httpRequest(`${API_BASE}/api/admin/analysis/store-batch-results`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_SECRET}`,
      'Content-Type': 'application/json'
    }
  }, { fileId, type });

  if (response.status !== 200) {
    throw new Error(`Failed to store results: ${JSON.stringify(response.data)}`);
  }

  return response.data;
}

async function waitForBatchCompletion(batchId, pollIntervalSeconds = 1800) {
  console.log(`\n⏳ Waiting for batch completion...`);
  console.log(`   Batch ID: ${batchId}`);
  console.log(`   Poll interval: ${pollIntervalSeconds}s`);

  let attempts = 0;
  const maxAttempts = 100; // Max ~2 days if polling every 30min

  while (attempts < maxAttempts) {
    attempts++;

    const status = await checkBatchStatus(batchId);

    console.log(`\n[${new Date().toISOString()}] Check #${attempts}`);
    console.log(`   Status: ${status.status}`);

    if (status.request_counts) {
      const { total, completed, failed } = status.request_counts;
      console.log(`   Progress: ${completed}/${total} (${failed} failed)`);
    }

    if (status.status === 'completed') {
      console.log(`\n✅ Batch completed!`);
      return status;
    }

    if (status.status === 'failed' || status.status === 'expired' || status.status === 'cancelled') {
      throw new Error(`Batch job ${status.status}`);
    }

    console.log(`   Waiting ${pollIntervalSeconds}s before next check...`);
    await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000));
  }

  throw new Error('Max polling attempts reached');
}

async function main() {
  console.log('🤖 Batch Analysis Pipeline');
  console.log('='.repeat(80));
  console.log(`Analysis type: ${analysisType}`);
  console.log(`Mode: ${storeOnly ? 'Store only' : autoMode ? 'Auto' : 'Manual'}`);
  console.log('='.repeat(80));

  const state = loadState();

  try {
    // Mode 1: Store only (user provides batch ID)
    if (storeOnly) {
      if (!batchId) {
        console.error('❌ Error: --batch-id required when using --store-only');
        process.exit(1);
      }

      console.log(`\n📥 Fetching batch status...`);
      const batch = await checkBatchStatus(batchId);

      if (batch.status !== 'completed') {
        console.error(`❌ Batch not completed yet (status: ${batch.status})`);
        process.exit(1);
      }

      if (!batch.output_file_id) {
        console.error(`❌ No output file available`);
        process.exit(1);
      }

      const result = await storeBatchResults(batch.output_file_id, analysisType);
      console.log(`\n✅ Results stored successfully!`);
      console.log(`   Stored: ${result.stats.stored}`);
      console.log(`   Failed: ${result.stats.failed}`);

      return;
    }

    // Mode 2: Full pipeline
    console.log(`\n📊 Step 1: Checking what needs analysis...`);

    // Submit batch
    const submitResult = await submitBatch(analysisType, limit);

    if (!submitResult.success) {
      console.error(`❌ Failed to submit batch:`, submitResult);
      process.exit(1);
    }

    console.log(`\n✅ Batch submitted!`);
    console.log(`   Batch ID: ${submitResult.batch_id}`);
    console.log(`   Items: ${submitResult.motions_count || submitResult.members_count}`);
    console.log(`   Cost: $${submitResult.estimated_cost_usd}`);

    // Save state
    saveState({
      batch_id: submitResult.batch_id,
      type: analysisType,
      submitted_at: new Date().toISOString(),
      items_count: submitResult.motions_count || submitResult.members_count
    });

    if (!autoMode) {
      console.log(`\n📝 Batch job created. To store results when ready:`);
      console.log(`   node scripts/batch_pipeline.js ${analysisType} --store-only --batch-id=${submitResult.batch_id}`);
      console.log(`\n💡 Or run in auto mode to wait and store automatically:`);
      console.log(`   node scripts/batch_pipeline.js ${analysisType} --auto`);
      return;
    }

    // Auto mode: wait for completion
    const completedBatch = await waitForBatchCompletion(submitResult.batch_id, pollInterval);

    // Store results
    const storeResult = await storeBatchResults(completedBatch.output_file_id, analysisType);

    console.log(`\n✅ Pipeline completed successfully!`);
    console.log(`   Batch ID: ${submitResult.batch_id}`);
    console.log(`   Stored: ${storeResult.stats.stored}`);
    console.log(`   Failed: ${storeResult.stats.failed}`);

    // Clear state
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
    }

  } catch (error) {
    console.error(`\n❌ Pipeline failed:`, error.message);
    console.error(error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
