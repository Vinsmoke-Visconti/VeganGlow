#!/bin/bash
# ============================================
# VeganGlow — One-command setup script
# Usage: npm run setup
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

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Copy environment file
if [ ! -f .env.local ]; then
  echo ""
  echo "📋 Creating .env.local from template..."
  cp .env.example .env.local
  echo "⚠️  Please edit .env.local with your Supabase credentials"
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
echo "  1. Edit .env.local with your Supabase credentials"
echo "  2. Run 'npm run dev' to start the frontend"
echo "  3. Run backend/schema.sql in Supabase SQL Editor"
echo "  4. Run backend/seed.sql for sample data"
echo "============================================"
