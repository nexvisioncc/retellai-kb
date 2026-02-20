#!/bin/bash
# Local sync script for Retell AI Knowledge Base

echo "🔄 Syncing Knowledge Base to Retell AI..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install axios js-yaml
fi

# Set environment variables
export RETELL_API_KEY="${RETELL_API_KEY:-key_0815cc9796db897ff644bb6710a0}"
export AGENT_ID="${AGENT_ID:-agent_8d781886289fdc010ed868a33c}"

# Run sync
node scripts/sync-kb.js
