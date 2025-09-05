# VaaS Railway Deployment Guide

This guide covers deploying the Idswyft Verification as a Service (VaaS) platform to Railway with the proper domain configuration.

## Architecture Overview

The VaaS platform consists of four separate services:

1. **VaaS Backend API** → `api-vaas.idswyft.app` (Port 3002)
2. **Admin Dashboard** → `app.idswyft.app` (Port 3000)  
3. **Customer Portal** → `customer.idswyft.app` (Port 3003)
4. **Enterprise Site** → `enterprise.idswyft.app` (Port 3004)

## Prerequisites

- Railway account with CLI installed
- Domain configured in Railway with SSL certificates
- Supabase project for VaaS database
- Stripe account for billing (optional)
- SendGrid or SMTP credentials for emails

## Service Deployment Order

Deploy services in this specific order to ensure proper dependencies:

### 1. Deploy VaaS Backend API

```bash
cd vaas-backend
railway login
railway init
railway add
railway up
```

**Domain Configuration:**
- Set custom domain: `api-vaas.idswyft.app`
- Enable SSL certificate

**Required Environment Variables:**
```env
PORT=3002
NODE_ENV=production
VAAS_CORS_ORIGINS=https://app.idswyft.app,https://customer.idswyft.app,https://enterprise.idswyft.app
VAAS_SUPABASE_URL=https://lxexvgjgzppzeggjepzi.supabase.co
VAAS_SUPABASE_SERVICE_ROLE_KEY=your_vaas_service_role_key
VAAS_SUPABASE_ANON_KEY=your_vaas_anon_key
IDSWYFT_API_URL=https://api.idswyft.app
IDSWYFT_SERVICE_TOKEN=your_service_token_matching_main_api
VAAS_JWT_SECRET=your_jwt_secret_64_bytes
VAAS_API_KEY_SECRET=your_api_key_secret_64_bytes  
VAAS_WEBHOOK_SECRET=your_webhook_secret_32_bytes
VAAS_ENCRYPTION_KEY=your_encryption_key_32_bytes
VAAS_SESSION_SECRET=your_session_secret_32_bytes
VAAS_SUPER_ADMIN_EMAILS=admin@idswyft.app
```

### 2. Deploy Admin Dashboard

```bash
cd ../vaas-admin
railway init
railway add  
railway up
```

**Domain Configuration:**
- Set custom domain: `app.idswyft.app`
- Enable SSL certificate

**Required Environment Variables:**
```env
VITE_API_URL=https://api-vaas.idswyft.app
VITE_API_TIMEOUT=30000
VITE_NODE_ENV=production
VITE_MOCK_AUTH_ENABLED=false
```

### 3. Deploy Customer Portal

```bash
cd ../customer-portal
railway init
railway add
railway up
```

**Domain Configuration:**
- Set custom domain: `customer.idswyft.app`  
- Enable SSL certificate

**Required Environment Variables:**
```env
VITE_API_URL=https://api-vaas.idswyft.app
VITE_NODE_ENV=production
```

### 4. Deploy Enterprise Site

```bash
cd ../enterprise-site
railway init
railway add
railway up
```

**Domain Configuration:**
- Set custom domain: `enterprise.idswyft.app`
- Enable SSL certificate

**Required Environment Variables:**
```env
NODE_ENV=production
```

## Database Setup

### Supabase Configuration

1. Create a new Supabase project for VaaS
2. Run the database migrations from `vaas-backend/src/database/schema.sql`
3. Set up Row Level Security (RLS) policies
4. Create service role and anon keys
5. Update environment variables

### Database Schema

The VaaS backend uses a separate Supabase project with the following key tables:
- `organizations` - Multi-tenant organization data
- `admins` - Organization admin users with JWT authentication
- `verifications` - Verification requests managed through main Idswyft API
- `webhooks` - Webhook configuration and delivery logs
- `api_keys` - Organization API keys
- `secrets` - Encrypted secret management for admin panel

Note: Actual verification data is stored in the main Idswyft API database, with VaaS acting as an orchestration layer.

## Post-Deployment Configuration

### 1. DNS Configuration

Ensure these DNS records point to Railway:
```
api-vaas.idswyft.app → Railway VaaS backend service
app.idswyft.app → Railway admin dashboard  
customer.idswyft.app → Railway customer portal
enterprise.idswyft.app → Railway enterprise site
```

### 2. SSL Certificates

Railway automatically provisions SSL certificates for custom domains. Verify HTTPS is working for all four domains.

### 3. CORS Verification

Test that the admin dashboard and customer portal can successfully communicate with the API by checking browser developer tools for CORS errors.

### 4. Health Checks

Verify all health check endpoints are responding:
- Backend: `https://api-vaas.idswyft.app/health`
- Admin: `https://app.idswyft.app/` (should load React app)
- Portal: `https://customer.idswyft.app/` (should load React app)
- Enterprise: `https://enterprise.idswyft.app/` (should load React app)

### 5. Create Super Admin

Use the API directly or database console to create the first super admin:

```sql
INSERT INTO admins (id, email, role, organization_id, created_at, updated_at) 
VALUES (gen_random_uuid(), 'admin@idswyft.app', 'super_admin', null, now(), now());
```

### 6. Integration Testing

1. Log into admin dashboard at `https://app.idswyft.app`
2. Create a test organization
3. Generate API keys  
4. Test verification flow through customer portal
5. Verify service-to-service integration with main Idswyft API
6. Test secret management tools in admin panel
7. Check enterprise site loads correctly for marketing

## Monitoring & Maintenance

### Health Monitoring

Each service includes health check endpoints:
- Backend: Checks database connectivity and API status
- Frontend services: Basic HTTP response checks

### Logging

- Backend: Structured logging with configurable levels
- Frontend: Client-side error reporting via Sentry (optional)
- Railway: Built-in logging and metrics

### Scaling

Railway automatically handles scaling based on traffic. For high-volume deployments:
- Enable autoscaling on Railway
- Consider upgrading Supabase plan
- Monitor database connection limits
- Set up database read replicas if needed

## Security Considerations

### Production Checklist

- [ ] All JWT secrets are randomly generated and secure
- [ ] API keys are encrypted in database
- [ ] CORS origins are properly configured
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced for all domains
- [ ] Database has proper RLS policies
- [ ] File uploads are validated and scanned
- [ ] Webhook signatures are verified
- [ ] Admin accounts use strong passwords
- [ ] Sentry/monitoring is configured for error tracking

### Regular Maintenance

- Update dependencies regularly
- Monitor for security vulnerabilities  
- Backup database regularly
- Review audit logs periodically
- Monitor API rate limits and usage
- Check webhook delivery success rates

## Troubleshooting

### Common Issues

**CORS Errors:**
- Verify `VAAS_CORS_ORIGINS` includes all frontend domains
- Check that domains are using HTTPS in production

**Database Connection Issues:**
- Verify Supabase credentials and URL
- Check connection pool limits
- Ensure database is accessible from Railway

**Authentication Issues:**
- Verify JWT secrets match across services
- Check admin user exists in database
- Confirm API keys are properly generated

**File Upload Issues:**
- Check file size limits
- Verify allowed file types
- Ensure proper file validation

### Support

For deployment issues:
1. Check Railway logs for each service
2. Verify environment variables are set correctly
3. Test database connectivity
4. Check domain DNS resolution
5. Verify SSL certificates are valid

## Cost Optimization

### Railway Resources

- Start with basic plans and scale up based on usage
- Monitor resource usage through Railway dashboard
- Use hibernation for development environments

### Database Optimization

- Set up proper database indexes
- Implement data retention policies
- Archive old verification records
- Monitor query performance

### Storage Optimization

- Implement file cleanup policies
- Compress uploaded documents
- Use CDN for static assets if needed
- Set up automated backups with retention limits

## Critical Service Integration

### Service Token Authentication

The VaaS platform requires service-to-service authentication between the VaaS backend and the main Idswyft API:

**Main Idswyft API Configuration:**
- Must have matching `SERVICE_TOKEN` environment variable
- Service token must be the same as `IDSWYFT_SERVICE_TOKEN` in VaaS backend
- Service token should be generated using the secret management tools

**Verified Integration Endpoints:**
- `POST /api/vaas/users` - User creation via VaaS
- `POST /api/vaas/verify` - Verification request creation  
- `GET /api/vaas/health` - Health check endpoint
- `GET /api/vaas/verify/:id/status` - Verification status lookup

**Testing Service Integration:**
```bash
# Test user creation
curl -X POST https://api.idswyft.app/api/vaas/users \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: your_service_token" \
  -d '{"email":"test@example.com","first_name":"Test","last_name":"User"}'

# Test verification creation
curl -X POST https://api.idswyft.app/api/vaas/verify \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: your_service_token" \
  -d '{"user_id":"user_uuid","organization_id":"org_id"}'
```

This integration is essential for the VaaS platform to function as a multi-tenant verification orchestrator.