#!/bin/bash
# Generate Supabase TypeScript types from remote schema
# Usage: npm run db:types (from monorepo root)

set -e

echo "🔄 Generating Supabase TypeScript types..."

npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_REF" \
  --schema public \
  > ../../packages/database/src/database.ts

echo "✅ Types generated at packages/database/src/database.ts"
