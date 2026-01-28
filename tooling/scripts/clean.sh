#!/bin/bash
# Clean all build artifacts and node_modules

set -e

echo "🧹 Cleaning build artifacts..."

# Remove build outputs
find . -name "dist" -type d -prune -exec rm -rf '{}' +
find . -name "build" -type d -prune -exec rm -rf '{}' +
find . -name ".next" -type d -prune -exec rm -rf '{}' +
find . -name ".astro" -type d -prune -exec rm -rf '{}' +
find . -name ".turbo" -type d -prune -exec rm -rf '{}' +

# Remove node_modules if --all flag is passed
if [ "$1" = "--all" ]; then
  echo "🗑️  Removing node_modules..."
  find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
  rm -rf node_modules
fi

echo "✅ Clean complete!"
