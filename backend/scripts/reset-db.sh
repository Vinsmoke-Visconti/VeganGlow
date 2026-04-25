#!/bin/bash
# Reset local database and re-apply migrations + seed
# Usage: npm run db:reset

set -e

echo "⚠️  Resetting database..."
supabase db reset --linked

echo "✅ Database reset complete"
