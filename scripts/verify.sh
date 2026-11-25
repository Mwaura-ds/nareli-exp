#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Supply required non-secret build vars in the calling environment/CI.

pnpm run typecheck
pnpm run lint
echo "no test configured — skipped"
pnpm run build
