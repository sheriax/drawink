#!/bin/bash
# Verify monorepo structure is complete

set -e

echo "🔍 Verifying monorepo structure..."

# Required directories
REQUIRED_DIRS=(
  "apps/web/src"
  "apps/api/src/routers"
  "apps/api/src/services"
  "apps/api/src/middleware"
  "apps/ws/src"
  "apps/landing/src"
  "apps/docs/docs"
  "packages/common/src"
  "packages/math/src"
  "packages/element/src"
  "packages/drawink"
  "packages/types/src"
  "packages/utils/src"
  "packages/ui/src/components"
  "packages/ui/src/styles"
  "packages/config/typescript"
  "packages/config/tailwind"
  "packages/trpc/src"
  "tooling/scripts"
)

MISSING=0

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "❌ Missing: $dir"
    MISSING=$((MISSING + 1))
  else
    echo "✅ Found: $dir"
  fi
done

if [ $MISSING -eq 0 ]; then
  echo "✅ All required directories exist!"
  exit 0
else
  echo "❌ $MISSING directories missing"
  exit 1
fi
