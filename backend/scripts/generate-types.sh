#!/bin/bash
# Generate Supabase TypeScript types from remote schema
# Usage: npm run db:generate-types

set -e

echo "🔄 Generating Supabase TypeScript types..."

npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_REF" \
  --schema public \
  > ../frontend/src/types/database.ts

echo "✅ Types generated at frontend/src/types/database.ts"
