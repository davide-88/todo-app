#!/usr/bin/env bash
set -euo pipefail

# Bundle size threshold in bytes (150KB = 153600 bytes)
THRESHOLD=153600
DIST_DIR="packages/frontend/dist/assets"

echo "Building frontend..."
pnpm --filter @todo-app/frontend build

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: Build output not found at $DIST_DIR"
  exit 1
fi

total=0
echo ""
echo "Gzipped file sizes:"
echo "-------------------"

for file in "$DIST_DIR"/*.js "$DIST_DIR"/*.css; do
  [ -f "$file" ] || continue
  size=$(gzip -c "$file" | wc -c)
  total=$((total + size))
  printf "  %-50s %'d bytes\n" "$(basename "$file")" "$size"
done

echo "-------------------"
printf "  %-50s %'d bytes\n" "TOTAL" "$total"
printf "  %-50s %'d bytes\n" "THRESHOLD" "$THRESHOLD"
echo ""

if [ "$total" -gt "$THRESHOLD" ]; then
  echo "FAIL: Bundle size ($total bytes) exceeds threshold ($THRESHOLD bytes)"
  exit 1
else
  echo "PASS: Bundle size ($total bytes) is within threshold ($THRESHOLD bytes)"
fi
