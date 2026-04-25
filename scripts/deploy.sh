#!/bin/bash
# ============================================
# VeganGlow — Deploy all services
# Usage: npm run deploy
# ============================================

set -e

echo "🚀 Deploying VeganGlow..."

# Deploy frontend to Vercel (from monorepo root)
echo ""
echo "📦 Deploying frontend to Vercel..."
vercel --prod

# Deploy Edge Functions
echo ""
echo "⚡ Deploying Edge Functions..."
supabase functions deploy checkout --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy send-email --project-ref "$SUPABASE_PROJECT_REF"

echo ""
echo "✅ All services deployed successfully!"
