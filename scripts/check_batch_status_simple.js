require('dotenv').config({ path: '.env.local' });

// Round 3 batches (submitted 2025-10-22 14:48 CET)
const batchIds = [
  'batch_68f8d67bee4081908d0ea1c62b432732',
  'batch_68f8d6888f908190be58aefa878f5538',
  'batch_68f8d69407c88190a7fc9d87ab83f6be',
  'batch_68f8d69f2c1c8190b99f9b78e0356f33',
  'batch_68f8d6aa5f548190befe250db8c3ec5c',
  'batch_68f8d6b7c5948190b5c02e1fd8e5a7dc',
  'batch_68f8d6c33fc88190af21f1830e121803',
];

async function checkBatch(batchId) {
  const response = await fetch(`https://api.openai.com/v1/batches/${batchId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    }
  });

  const data = await response.json();
  return {
    id: batchId.slice(-8),
    status: data.status,
    completed: data.request_counts?.completed || 0,
    total: data.request_counts?.total || 0,
    failed: data.request_counts?.failed || 0
  };
}

async function main() {
  console.log('🔍 Checking Batch Status (Round 3)');
  console.log('='.repeat(80));

  const results = await Promise.all(batchIds.map(id => checkBatch(id)));

  let totalCompleted = 0;
  let totalTotal = 0;
  let allCompleted = true;

  results.forEach(r => {
    const statusEmoji = r.status === 'completed' ? '✅' :
                       r.status === 'in_progress' ? '⏳' :
                       r.status === 'failed' ? '❌' : '⏸️';
    console.log(`${statusEmoji} ${r.id}: ${r.status.padEnd(12)} ${r.completed}/${r.total} ${r.failed > 0 ? `(${r.failed} failed)` : ''}`);

    totalCompleted += r.completed;
    totalTotal += r.total;
    if (r.status !== 'completed') allCompleted = false;
  });

  console.log('='.repeat(80));
  console.log(`📊 TOTAL: ${totalCompleted}/${totalTotal} (${((totalCompleted/totalTotal)*100).toFixed(1)}%)`);

  if (allCompleted) {
    console.log('\n✅ All batches completed! Run this to store results:');
    console.log('   node scripts/store_round3_batches.js');
  } else {
    console.log('\n⏳ Batches still processing...');
  }
}

main().catch(console.error);
