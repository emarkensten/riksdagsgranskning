#!/usr/bin/env node
/**
 * Retrieve specific batch results quickly
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const openaiKey = process.env.OPENAI_API_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BATCH_IDS = [
  'batch_68fa7c2c1274819082e4f4e3568c6423',
  'batch_68fa7c339a1c81908c889baa9dd767fb',
  'batch_68fa7c3a69fc81908a1203801f5c8b0c',
  'batch_68fa7c3ffad881909bc14e1d46058fbf'
];

async function getBatchInfo(batchId) {
  return new Promise((resolve, reject) => {
    https.get(`https://api.openai.com/v1/batches/${batchId}`, {
      headers: { 'Authorization': `Bearer ${openaiKey}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function downloadFile(fileId) {
  return new Promise((resolve, reject) => {
    https.get(`https://api.openai.com/v1/files/${fileId}/content`, {
      headers: { 'Authorization': `Bearer ${openaiKey}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function storeResults(results, batchId) {
  const lines = results.trim().split('\n');
  let stored = 0;
  let skipped = 0;
  let failed = 0;

  for (const line of lines) {
    try {
      const item = JSON.parse(line);
      const customId = item.custom_id;
      const motionId = customId.split('_')[2];

      if (!item.response || !item.response.body || !item.response.body.choices || !item.response.body.choices[0]) {
        failed++;
        continue;
      }

      const responseContent = item.response.body.choices[0].message.content;
      if (!responseContent) {
        failed++;
        continue;
      }

      const analysis = JSON.parse(responseContent);

      const { data: existing, error: checkError } = await supabase
        .from('motion_kvalitet')
        .select('motion_id')
        .eq('motion_id', motionId)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabase
        .from('motion_kvalitet')
        .insert({
          motion_id: motionId,
          overall_substantiality_score: analysis.overall_substantiality_score,
          category: analysis.category,
          assessment: analysis.assessment,
          scores: analysis.scores,
          main_strengths: analysis.main_strengths,
          main_weaknesses: analysis.main_weaknesses,
          analyzed_at: new Date().toISOString()
        });

      if (insertError) {
        console.warn(`  ⚠️  Failed to store ${motionId}: ${insertError.message}`);
        failed++;
      } else {
        stored++;
      }
    } catch (e) {
      console.warn(`  ⚠️  Parse error: ${e.message}`);
      failed++;
    }
  }

  return { stored, skipped, failed };
}

async function main() {
  console.log('🔍 Retrieving 4 new batches...\n');

  let totalStored = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (let i = 0; i < BATCH_IDS.length; i++) {
    const batchId = BATCH_IDS[i];
    console.log(`[${i + 1}/4] ${batchId.substring(0, 20)}...`);

    try {
      const batchInfo = await getBatchInfo(batchId);
      console.log(`   Status: ${batchInfo.status}`);
      console.log(`   Completed: ${batchInfo.request_counts?.completed || 0}/${batchInfo.request_counts?.total || 0}`);

      if (batchInfo.status !== 'completed') {
        console.log(`   ⏸️  Skipping (not completed)\n`);
        continue;
      }

      if (!batchInfo.output_file_id) {
        console.log(`   ⚠️  No output file\n`);
        continue;
      }

      console.log(`   📥 Downloading results...`);
      const results = await downloadFile(batchInfo.output_file_id);
      const lineCount = results.trim().split('\n').length;
      console.log(`   📊 Downloaded ${lineCount} results`);

      console.log(`   💾 Storing...`);
      const { stored, skipped, failed } = await storeResults(results, batchId);
      console.log(`   ✅ Stored: ${stored}, Skipped: ${skipped}, Failed: ${failed}\n`);

      totalStored += stored;
      totalSkipped += skipped;
      totalFailed += failed;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      totalFailed += 1000;
    }
  }

  console.log('================================================================================');
  console.log('📊 Summary:');
  console.log(`   ✨ NEW analyses stored: ${totalStored}`);
  console.log(`   🔄 Duplicates skipped: ${totalSkipped}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log('================================================================================\n');
}

main().catch(console.error);
