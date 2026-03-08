#!/usr/bin/env bash
set -euo pipefail

# Point pnpm store into the workspace so it persists on the host across rebuilds
pnpm config set store-dir /workspace/.pnpm-store

# Install all workspace dependencies
pnpm install


echo "Dev container ready."
