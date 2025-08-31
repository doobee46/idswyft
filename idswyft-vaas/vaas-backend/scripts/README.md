# VaaS Secret Management Tools

This directory contains secure tools for generating and rotating VaaS production secrets.

## 🔐 Available Tools

### 1. Web-Based Admin Interface
**Access**: `/api/admin/secrets/generate` (requires admin authentication)

- **Beautiful web interface** for generating secrets
- **Real-time generation** with secure display
- **Copy individual secrets** or all at once
- **Download as .env file**
- **Secure in-browser management**

**Usage:**
1. Log into VaaS admin dashboard
2. Navigate to `/api/admin/secrets/generate`
3. Click "Generate New Secrets"
4. Copy secrets to Railway environment variables
5. Clear the page when done

### 2. Command Line Generator
**File**: `generate-secrets.js`

```bash
# Generate and display secrets
node scripts/generate-secrets.js

# Generate as JSON format
node scripts/generate-secrets.js --format json

# Save to file
node scripts/generate-secrets.js --save

# Quiet mode (for scripting)
node scripts/generate-secrets.js --quiet > .env.production
```

### 3. Complete Rotation Script
**File**: `rotate-secrets.sh` (Linux/Mac)

```bash
# Generate secrets and show Railway commands
./scripts/rotate-secrets.sh

# Auto-deploy to Railway (interactive)
./scripts/rotate-secrets.sh --deploy
```

## 🔑 Generated Secrets

| Secret | Length | Critical | Purpose |
|--------|--------|----------|---------|
| `VAAS_JWT_SECRET` | 64 bytes | ✅ | JWT token signing |
| `VAAS_API_KEY_SECRET` | 64 bytes | ✅ | API key encryption |
| `IDSWYFT_SERVICE_TOKEN` | 64 bytes | ✅ | Service-to-service auth |
| `VAAS_WEBHOOK_SECRET` | 32 bytes | ⚠️ | Webhook signatures |
| `VAAS_ENCRYPTION_KEY` | 32 bytes | ✅ | Data encryption (AES-256) |
| `VAAS_SESSION_SECRET` | 32 bytes | ⚠️ | Session encryption |

## 🚨 Security Best Practices

### When to Rotate Secrets
- **Immediately** if secrets are exposed in logs/code
- **Regularly** (every 90 days recommended)
- **Before production deployment**
- **After security incidents**
- **When team members leave**

### Rotation Process
1. **Generate new secrets** using any tool above
2. **Update Railway environment variables** for all services
3. **Update local .env files** for development
4. **Restart all services** to load new secrets
5. **Test the system** to ensure everything works
6. **Update external integrations** using the service token

### Security Checklist
- [ ] Never commit secrets to version control
- [ ] Use secure channels to share secrets
- [ ] Clear terminal history after generating
- [ ] Store backup secrets in secure password manager
- [ ] Monitor logs for authentication failures
- [ ] Set up alerts for unusual access patterns

## 🚂 Railway Deployment Commands

After generating new secrets, update Railway:

```bash
# VaaS Backend
cd idswyft-vaas/vaas-backend
railway variables set VAAS_JWT_SECRET="your_new_jwt_secret"
railway variables set VAAS_API_KEY_SECRET="your_new_api_key_secret"
railway variables set IDSWYFT_SERVICE_TOKEN="your_new_service_token"
railway variables set VAAS_WEBHOOK_SECRET="your_new_webhook_secret"
railway variables set VAAS_ENCRYPTION_KEY="your_new_encryption_key"
railway variables set VAAS_SESSION_SECRET="your_new_session_secret"
railway redeploy

# Main Idswyft API (update service token)
cd ../../backend
railway variables set SERVICE_TOKEN="your_new_service_token"
railway redeploy

# Admin Dashboard (usually no secrets needed)
cd ../idswyft-vaas/vaas-admin
railway redeploy

# Customer Portal (usually no secrets needed)
cd ../customer-portal
railway redeploy
```

## 📁 File Structure

```
scripts/
├── generate-secrets.js     # Core secret generator
├── rotate-secrets.sh       # Complete rotation script
├── README.md              # This documentation
└── secrets/               # Generated secret files (gitignored)
    ├── vaas-secrets-YYYY-MM-DD-HHMMSS.env
    └── vaas-secrets-YYYY-MM-DD-HHMMSS.json
```

## 🛠️ Development Usage

```bash
# Quick secret generation for development
node scripts/generate-secrets.js --quiet | grep -E "^[A-Z_]+=" > .env.local

# Generate specific length secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test secret generation
npm test scripts/generate-secrets.js
```

## ⚠️ Troubleshooting

### Common Issues

**Error: "Missing authentication"**
- Ensure you're logged into VaaS admin panel
- Check admin role permissions

**Error: "Railway CLI not found"**
- Install Railway CLI: `npm install -g @railway/cli`
- Login to Railway: `railway login`

**Error: "Permission denied"**
- Make script executable: `chmod +x scripts/rotate-secrets.sh`
- Check file permissions on secrets directory

### Support

For security-related issues:
- Check VaaS admin logs
- Verify environment variables in Railway
- Test authentication endpoints
- Contact security team if secrets are compromised

## 📊 Monitoring

After rotating secrets, monitor:
- **Authentication success/failure rates**
- **Service-to-service communication**
- **Webhook delivery status**
- **API response times**
- **Error logs for authentication issues**

## 🔄 Automated Rotation (Future)

Consider implementing:
- **Scheduled secret rotation** (cron jobs)
- **Integration with HashiCorp Vault**
- **AWS Secrets Manager integration**
- **Automated testing after rotation**
- **Slack notifications for rotation events**