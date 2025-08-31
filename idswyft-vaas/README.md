# Idswyft VaaS (Verification as a Service)

Enterprise identity verification platform with turnkey solutions for businesses.

## 🏗️ Architecture

- **vaas-backend/** → API service (api-vaas.idswyft.app)
- **enterprise-site/** → VaaS marketing (enterprise.idswyft.app)  
- **admin-dashboard/** → Business dashboard (app.idswyft.app)
- **customer-portal/** → User verification (customer.idswyft.app)
- **shared/** → Shared utilities and types
- **deployments/** → Railway deployment configs
- **docs/** → VaaS documentation

## 🌐 Domain Structure

- `idswyft.app` → Main marketing website (existing)
- `api.idswyft.app` → Main Idswyft API (existing) 
- `enterprise.idswyft.app` → VaaS marketing & onboarding
- `app.idswyft.app` → Business admin dashboard
- `customer.idswyft.app` → End-user verification portal
- `api-vaas.idswyft.app` → VaaS backend API

## 🚀 Getting Started

Each service has its own README with specific setup instructions.

## 💰 Business Model

- **Starter**: $299/month + $2/verification (up to 500)
- **Professional**: $799/month + $1.50/verification (up to 2000)  
- **Enterprise**: $2499/month + $1/verification (unlimited)

## 🔧 Development

1. Clone and setup each service
2. Configure environment variables
3. Run services in development mode
4. Deploy to Railway for production