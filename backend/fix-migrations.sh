#!/bin/bash

echo "🔧 Fixing Migration Timestamps"
echo "=============================="
echo ""

# Backup existing migrations
echo "📦 Creating backup..."
mkdir -p migrations_backup
cp migrations/*.sql migrations_backup/ 2>/dev/null

# The issue: migrations with old timestamps that come before already-run migrations
# Solution: Rename them with newer timestamps

# New timestamp (current time + offset to ensure order)
BASE_TS=1775900000000

echo "🔄 Renaming migration files..."

# Rename findings table migration
if [ -f "migrations/1775812827009_add-findings-table.sql" ]; then
    mv migrations/1775812827009_add-findings-table.sql migrations/${BASE_TS}_add-findings-table.sql
    echo "✅ Renamed add-findings-table.sql"
fi

# Rename user roles migration
if [ -f "migrations/1775812905856_add-user-roles.sql" ]; then
    NEW_TS=$((BASE_TS + 1000))
    mv migrations/1775812905856_add-user-roles.sql migrations/${NEW_TS}_add-user-roles.sql
    echo "✅ Renamed add-user-roles.sql"
fi

# Rename evidence/versions/logs migration
if [ -f "migrations/1775813000000_add-evidence-versions-logs.sql" ]; then
    NEW_TS=$((BASE_TS + 2000))
    mv migrations/1775813000000_add-evidence-versions-logs.sql migrations/${NEW_TS}_add-evidence-versions-logs.sql
    echo "✅ Renamed add-evidence-versions-logs.sql"
fi

echo ""
echo "✅ Migration files renamed successfully!"
echo ""
echo "📋 Current migration files:"
ls -1 migrations/*.sql | sort
echo ""
echo "🚀 Now you can run: npm run migrate:up"
