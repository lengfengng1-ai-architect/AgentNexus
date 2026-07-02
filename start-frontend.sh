#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/frontend"
npm install --no-audit --no-fund && npm run dev
