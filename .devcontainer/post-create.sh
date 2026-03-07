#!/usr/bin/env bash
set -euo pipefail

# Point pnpm store into the workspace so it persists on the host across rebuilds
pnpm config set store-dir /workspace/.pnpm-store

# Install all workspace dependencies
pnpm install

# Create .env for editor tooling (with correct db hostname for container)
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i 's|localhost:5432|postgres:5432|g' .env
fi

echo "Dev container ready."
