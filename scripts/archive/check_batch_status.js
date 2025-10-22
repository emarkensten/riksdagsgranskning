#!/usr/bin/env node

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BATCH_IDS = [
  'batch_68f76f374638819080c85a4e1be40375',
  'batch_68f760ae40d881909c6f2150a0454322',
  'batch_68f75fe287ec8190ab9861fcbd66fdab',
  'batch_68f75f912e5c819085646381a17d681f',
  'batch_68f739fab39881909d3dccf19ee97693',
  'batch_68f731a454208190b803a5e8d302af39',
  'batch_68f729abe6b08190aefde5ee4e87f3ef',
  'batch_68f72902bca081909e6861bfa8246c95',
  'batch_68f71ec6709c819093e39abd5e03cfee',
  'batch_68f71ec2e2bc8190957b809f5e4e7239',
  'batch_68f71dbb6d588190954acd9a4a963658',
  'batch_68f71db89b1c8190ac53d37731abec90',
  'batch_68f71d33d9c48190968cfcea34bb3862',
  'batch_68f71d2e18008190979678d405c0ee6e',
  'batch_68f71c11541c8190a6d0607563874b9f',
  'batch_68f71bd36d5481908c653760e5fbf607',
  'batch_68f6973a07708190858e7e27eb11bd40',
  'batch_68f695b5c10481908549cb9338eb6c3a',
  'batch_68f53b4ca2148190aab3cc7a4891e0eb',
  'batch_68f539da4f688190abd4476fbcfc59c8',
  'batch_68f536c9b7a08190bbd266fa2d35bde9',
  'batch_68f535d8ec4c8190ba4016d86ead8668',
  'batch_68f52fd931708190b0373cf50e3c39a2'
];

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function checkBatchStatuses() {
  console.log('🔍 Checking OpenAI Batch API Status...\n');

  const statuses = {};
  let completed = 0;
  let inProgress = 0;
  let failed = 0;

  for (const batchId of BATCH_IDS) {
    try {
      const result = await makeRequest(`/v1/batches/${batchId}`);

      if (result.error) {
        console.log(`❌ ${batchId}`);
        console.log(`   Error: ${result.error.message}`);
        continue;
      }

      const status = result.status;
      statuses[status] = (statuses[status] || 0) + 1;

      const statusEmoji = {
        'completed': '✅',
        'in_progress': '⏳',
        'failed': '❌',
        'expired': '⚠️'
      }[status] || '❓';

      console.log(`${statusEmoji} ${batchId}`);
      console.log(`   Status: ${status}`);
      console.log(`   Created: ${result.created_at}`);
      console.log(`   Request counts: input=${result.request_counts.total}, completed=${result.request_counts.completed}, failed=${result.request_counts.failed}`);

      if (status === 'completed' && result.output_file_id) {
        console.log(`   📄 Output File ID: ${result.output_file_id}`);
      }
      console.log();

      if (status === 'completed') completed++;
      else if (status === 'in_progress') inProgress++;
      else if (status === 'failed') failed++;

    } catch (error) {
      console.log(`❌ Error checking ${batchId}: ${error.message}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Completed: ${completed}`);
  console.log(`   ⏳ In Progress: ${inProgress}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${BATCH_IDS.length}`);
}

checkBatchStatuses().catch(console.error);
