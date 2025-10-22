#!/bin/bash

BATCHES=(
  "batch_68f7fda62de88190a104354ce9e736a4"
  "batch_68f7fdab79a08190a717fd998c3077a9"
  "batch_68f7fdb17e38819081a62178071310bb"
  "batch_68f7fdb7e41081909d9fca98f05c88a0"
  "batch_68f7fdbd7f908190955fc12e0fe31f83"
  "batch_68f7fdc3c8348190aec3d40bccf627af"
  "batch_68f7fdc9771c81909a7ef3a8993886c1"
  "batch_68f7fdceaf88819094496b4b825c7e35"
)

echo "Checking all 8 motion quality batches..."
echo "========================================"

for i in "${!BATCHES[@]}"; do
  batch_id="${BATCHES[$i]}"
  batch_num=$((i + 1))
  echo ""
  echo "Batch $batch_num/8: $batch_id"
  node get_batch_file_id.js "$batch_id" 2>/dev/null | jq -r '"  Status: \(.status) | Completed: \(.request_counts.completed)/\(.request_counts.total) | File: \(.output_file_id // "none")"'
done

echo ""
echo "========================================"
