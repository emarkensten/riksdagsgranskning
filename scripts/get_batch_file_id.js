#!/usr/bin/env node
const https = require('https');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const batchId = process.argv[2];
if (!batchId) {
  console.error('Usage: node get_batch_file_id.js <batch_id>');
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Missing OPENAI_API_KEY in .env.local');
  process.exit(1);
}

const options = {
  hostname: 'api.openai.com',
  path: `/v1/batches/${batchId}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const batch = JSON.parse(data);
      console.log(JSON.stringify({
        batch_id: batch.id,
        status: batch.status,
        output_file_id: batch.output_file_id,
        request_counts: batch.request_counts
      }, null, 2));
    } catch (e) {
      console.error('Error parsing response:', e);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
  process.exit(1);
});

req.end();
