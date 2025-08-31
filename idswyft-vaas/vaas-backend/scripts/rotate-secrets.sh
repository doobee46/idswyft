#!/bin/bash

# VaaS Secret Rotation Script
# Generates new secrets and provides Railway deployment commands
# 
# Usage: ./scripts/rotate-secrets.sh [--deploy]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAAS_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔐 VaaS Secret Rotation Utility"
echo "=============================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Generate new secrets
echo "🎲 Generating new cryptographic secrets..."
cd "$VAAS_DIR"
NEW_SECRETS=$(node scripts/generate-secrets.js --format env --quiet)

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate secrets"
    exit 1
fi

# Save secrets to temp file
TEMP_FILE=$(mktemp)
echo "$NEW_SECRETS" > "$TEMP_FILE"

echo "✅ New secrets generated successfully!"
echo ""

# Display secrets
echo "📋 New Environment Variables:"
echo "==============================="
cat "$TEMP_FILE"
echo ""

# Extract individual secrets for Railway commands
VAAS_JWT_SECRET=$(grep "VAAS_JWT_SECRET=" "$TEMP_FILE" | cut -d'=' -f2)
VAAS_API_KEY_SECRET=$(grep "VAAS_API_KEY_SECRET=" "$TEMP_FILE" | cut -d'=' -f2)
IDSWYFT_SERVICE_TOKEN=$(grep "IDSWYFT_SERVICE_TOKEN=" "$TEMP_FILE" | cut -d'=' -f2)
VAAS_WEBHOOK_SECRET=$(grep "VAAS_WEBHOOK_SECRET=" "$TEMP_FILE" | cut -d'=' -f2)
VAAS_ENCRYPTION_KEY=$(grep "VAAS_ENCRYPTION_KEY=" "$TEMP_FILE" | cut -d'=' -f2)
VAAS_SESSION_SECRET=$(grep "VAAS_SESSION_SECRET=" "$TEMP_FILE" | cut -d'=' -f2)

# Generate Railway deployment commands
echo "🚂 Railway Deployment Commands:"
echo "================================"
echo "# Navigate to each service directory and run:"
echo ""

echo "# 1. VaaS Backend API"
echo "cd idswyft-vaas/vaas-backend"
echo "railway variables set VAAS_JWT_SECRET=\"$VAAS_JWT_SECRET\""
echo "railway variables set VAAS_API_KEY_SECRET=\"$VAAS_API_KEY_SECRET\""
echo "railway variables set IDSWYFT_SERVICE_TOKEN=\"$IDSWYFT_SERVICE_TOKEN\""
echo "railway variables set VAAS_WEBHOOK_SECRET=\"$VAAS_WEBHOOK_SECRET\""
echo "railway variables set VAAS_ENCRYPTION_KEY=\"$VAAS_ENCRYPTION_KEY\""
echo "railway variables set VAAS_SESSION_SECRET=\"$VAAS_SESSION_SECRET\""
echo "railway redeploy"
echo ""

echo "# 2. Main Idswyft API (update service token)"
echo "cd ../../backend"
echo "railway variables set SERVICE_TOKEN=\"$IDSWYFT_SERVICE_TOKEN\""
echo "railway redeploy"
echo ""

# Check if deploy flag is provided
if [ "$1" == "--deploy" ]; then
    echo "🚀 Auto-deployment mode enabled"
    echo ""
    
    read -p "⚠️  This will update production secrets. Continue? (y/N): " confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
        echo "❌ Deployment cancelled"
        rm -f "$TEMP_FILE"
        exit 1
    fi
    
    echo "📤 Deploying to Railway..."
    
    # Deploy VaaS Backend
    if [ -d "$VAAS_DIR" ]; then
        echo "Updating VaaS Backend secrets..."
        cd "$VAAS_DIR"
        
        if command -v railway &> /dev/null; then
            railway variables set VAAS_JWT_SECRET="$VAAS_JWT_SECRET" || echo "⚠️ Failed to set VAAS_JWT_SECRET"
            railway variables set VAAS_API_KEY_SECRET="$VAAS_API_KEY_SECRET" || echo "⚠️ Failed to set VAAS_API_KEY_SECRET"
            railway variables set IDSWYFT_SERVICE_TOKEN="$IDSWYFT_SERVICE_TOKEN" || echo "⚠️ Failed to set IDSWYFT_SERVICE_TOKEN"
            railway variables set VAAS_WEBHOOK_SECRET="$VAAS_WEBHOOK_SECRET" || echo "⚠️ Failed to set VAAS_WEBHOOK_SECRET"
            railway variables set VAAS_ENCRYPTION_KEY="$VAAS_ENCRYPTION_KEY" || echo "⚠️ Failed to set VAAS_ENCRYPTION_KEY"
            railway variables set VAAS_SESSION_SECRET="$VAAS_SESSION_SECRET" || echo "⚠️ Failed to set VAAS_SESSION_SECRET"
            
            echo "Redeploying VaaS Backend..."
            railway redeploy || echo "⚠️ Failed to redeploy VaaS Backend"
        else
            echo "⚠️ Railway CLI not found, skipping auto-deployment"
        fi
    fi
    
    echo "✅ Deployment complete!"
fi

# Security reminder
echo ""
echo "🔒 Security Reminders:"
echo "====================="
echo "1. Update your local .env files with these new secrets"
echo "2. Clear your terminal history: history -c"
echo "3. Restart all VaaS services after deployment"
echo "4. Test the system to ensure everything works"
echo "5. Update any external integrations using the old service token"

# Save to secure file
SECURE_FILE="$VAAS_DIR/secrets/vaas-secrets-$(date +%Y%m%d-%H%M%S).env"
mkdir -p "$(dirname "$SECURE_FILE")"
echo "$NEW_SECRETS" > "$SECURE_FILE"
chmod 600 "$SECURE_FILE"

echo ""
echo "💾 Secrets saved to: $SECURE_FILE"
echo "⚠️  Keep this file secure and delete when no longer needed!"

# Cleanup
rm -f "$TEMP_FILE"

echo ""
echo "🎉 Secret rotation complete!"