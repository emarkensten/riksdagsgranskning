#!/usr/bin/env python3
"""
Automatic Batch Monitor & Storage Script
Checks OpenAI batch status and automatically stores results when ready.

Usage:
  python3 monitor_and_store_batches.py
"""

import json
import urllib.request
import time
from datetime import datetime

# Configuration
import os
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ADMIN_SECRET = os.getenv('ADMIN_SECRET', 'dev-secret-key-2025')
API_BASE = "http://localhost:3000"
CHECK_INTERVAL_MINUTES = 30

# Batch jobs to monitor (add new batches here)
BATCHES_TO_MONITOR = [
    {
        'batch_id': 'batch_68f7fda62de88190a104354ce9e736a4',
        'type': 'motion_quality',
        'description': '1,000 motions batch 1/8',
        'stored': False
    },
    {
        'batch_id': 'batch_68f7fdab79a08190a717fd998c3077a9',
        'type': 'motion_quality',
        'description': '1,000 motions batch 2/8',
        'stored': False
    },
    {
        'batch_id': 'batch_68f7fdb17e38819081a62178071310bb',
        'type': 'motion_quality',
        'description': '1,000 motions batch 3/8',
        'stored': False
    },
    {
        'batch_id': 'batch_68f7fdb7e41081909d9fca98f05c88a0',
        'type': 'motion_quality',
        'description': '1,000 motions batch 4/8',
        'stored': False
    },
    {
        'batch_id': 'batch_68f7fdbd7f908190955fc12e0fe31f83',
        'type': 'motion_quality',
        'description': '1,000 motions batch 5/8',
        'stored': False
    },
    {
        'batch_id': 'batch_68f7fdc3c8348190aec3d40bccf627af',
        'type': 'motion_quality',
        'description': '1,000 motions batch 6/8',
        'stored': False
    },
    {
        'batch_id': 'batch_68f7fdc9771c81909a7ef3a8993886c1',
        'type': 'motion_quality',
        'description': '1,000 motions batch 7/8',
        'stored': False
    },
    {
        'batch_id': 'batch_68f7fdceaf88819094496b4b825c7e35',
        'type': 'motion_quality',
        'description': '1,000 motions batch 8/8',
        'stored': False
    },
]


def check_batch_status(batch_id):
    """Check batch status from OpenAI API"""
    try:
        req = urllib.request.Request(
            f'https://api.openai.com/v1/batches/{batch_id}',
            headers={'Authorization': f'Bearer {OPENAI_API_KEY}'}
        )
        response = urllib.request.urlopen(req, timeout=10)
        data = json.loads(response.read().decode())
        return data
    except Exception as e:
        print(f"❌ Error checking batch {batch_id[:30]}...: {e}")
        return None


def store_batch_results(batch_id, file_id, batch_type):
    """Store batch results to database"""
    try:
        data = json.dumps({
            'fileId': file_id,
            'batchId': batch_id,
            'type': batch_type
        }).encode('utf-8')

        req = urllib.request.Request(
            f'{API_BASE}/api/admin/analysis/store-batch-results',
            data=data,
            headers={
                'Authorization': f'Bearer {ADMIN_SECRET}',
                'Content-Type': 'application/json'
            },
            method='POST'
        )

        response = urllib.request.urlopen(req, timeout=120)
        result = json.loads(response.read().decode())
        return result
    except Exception as e:
        print(f"❌ Error storing results: {e}")
        return None


def main():
    print("🤖 Batch Monitor Started")
    print("=" * 70)
    print(f"Monitoring {len(BATCHES_TO_MONITOR)} batches")
    print(f"Check interval: {CHECK_INTERVAL_MINUTES} minutes")
    print("=" * 70)
    print()

    iteration = 0

    while True:
        iteration += 1
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n🔍 Check #{iteration} at {timestamp}")
        print("-" * 70)

        all_stored = True
        completed_count = 0
        pending_count = 0

        for batch in BATCHES_TO_MONITOR:
            if batch['stored']:
                continue

            batch_id = batch['batch_id']
            batch_type = batch['type']
            description = batch['description']

            # Check status
            status_data = check_batch_status(batch_id)

            if not status_data:
                all_stored = False
                pending_count += 1
                continue

            status = status_data.get('status')
            request_counts = status_data.get('request_counts', {})
            total = request_counts.get('total', 0)
            completed = request_counts.get('completed', 0)
            failed = request_counts.get('failed', 0)

            if status == 'completed':
                output_file_id = status_data.get('output_file_id')

                if output_file_id:
                    print(f"✅ {description}")
                    print(f"   Status: completed ({completed}/{total} succeeded)")
                    print(f"   Storing results...")

                    # Store results
                    result = store_batch_results(batch_id, output_file_id, batch_type)

                    if result:
                        stats = result.get('stats', {})
                        stored = stats.get('stored', 0)
                        failed_store = stats.get('failed', 0)
                        print(f"   ✅ Stored: {stored}, Failed: {failed_store}")
                        batch['stored'] = True
                        completed_count += 1
                    else:
                        print(f"   ❌ Failed to store results")
                        all_stored = False
                else:
                    print(f"⚠️ {description}")
                    print(f"   Status: completed but no output file")
                    batch['stored'] = True

            elif status == 'in_progress':
                print(f"⏳ {description}")
                print(f"   Status: in_progress ({completed}/{total} completed)")
                all_stored = False
                pending_count += 1

            elif status == 'failed':
                print(f"❌ {description}")
                print(f"   Status: FAILED")
                batch['stored'] = True  # Mark as done (failed)

            else:
                print(f"❓ {description}")
                print(f"   Status: {status}")
                all_stored = False
                pending_count += 1

        print("-" * 70)
        print(f"📊 Summary: {completed_count} completed this round, {pending_count} still pending")

        if all_stored:
            print("\n🎉 ALL BATCHES COMPLETED AND STORED!")
            print("=" * 70)
            break

        # Wait before next check
        print(f"\n💤 Waiting {CHECK_INTERVAL_MINUTES} minutes until next check...")
        time.sleep(CHECK_INTERVAL_MINUTES * 60)

    print("\n✅ Monitoring complete. Exiting.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Monitoring stopped by user (Ctrl+C)")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
