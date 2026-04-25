#!/bin/bash
# ============================================
# VeganGlow — One-command setup script
# Usage: bash scripts/setup.sh
# ============================================

set -e

echo "🌿 Setting up VeganGlow development environment..."
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ required. Current: $(node -v)"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Install all workspace dependencies from root
echo ""
echo "📦 Installing monorepo dependencies..."
npm install

# Copy environment file for web app
if [ ! -f apps/web/.env.local ]; then
  echo ""
  echo "📋 Creating apps/web/.env.local from template..."
  cp .env.example apps/web/.env.local
  echo "⚠️  Please edit apps/web/.env.local with your Supabase credentials"
fi

# Check Supabase CLI
if command -v supabase &> /dev/null; then
  echo "✅ Supabase CLI $(supabase --version)"
else
  echo "⚠️  Supabase CLI not found. Install: npm install -g supabase"
fi

echo ""
echo "============================================"
echo "🌿 VeganGlow setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit apps/web/.env.local with your Supabase credentials"
echo "  2. Run 'npm run dev' to start the web app"
echo "  3. Push schema: npm run db:push"
echo "  4. Or run apps/backend/schema.sql in Supabase SQL Editor"
echo "============================================"
