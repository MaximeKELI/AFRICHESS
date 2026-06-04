#!/usr/bin/env bash
# Fix Docker root-owned .next folders blocking local npm run dev
set -e
cd "$(dirname "$0")/.."
echo "Fixing permissions on frontend build caches..."
sudo chown -R "$(id -u):$(id -g)" frontend/.next frontend/.next-dev 2>/dev/null || true
rm -rf frontend/.next frontend/.next-dev
echo "Done. Run: cd frontend && npm run dev"
