# VaaS Railway Deployment Guide

This guide covers deploying the Idswyft Verification as a Service (VaaS) platform to Railway with the proper domain configuration.

## Architecture Overview

The VaaS platform consists of three separate services:

1. **VaaS Backend API** → `api-vaas.idswyft.app` (Port 3002)
2. **Admin Dashboard** → `app.idswyft.app` (Port 3000)  
3. **Customer Portal** → `customer.idswyft.app` (Port 3000)

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
VAAS_PORT=3002
NODE_ENV=production
VAAS_CORS_ORIGINS=https://app.idswyft.app,https://customer.idswyft.app,https://enterprise.idswyft.app
VAAS_SUPABASE_URL=your_supabase_project_url
VAAS_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VAAS_SUPABASE_ANON_KEY=your_anon_key
IDSWYFT_API_URL=https://api.idswyft.app
IDSWYFT_SERVICE_TOKEN=your_service_token
VAAS_JWT_SECRET=your_super_secret_jwt_key_here
VAAS_API_KEY_SECRET=your_api_key_encryption_secret
VAAS_SUPER_ADMIN_EMAILS=admin@idswyft.app
VAAS_FRONTEND_URL=https://app.idswyft.app
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
EMAIL_FROM=noreply@idswyft.app
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SENTRY_DSN=your_sentry_dsn
VAAS_WEBHOOK_BASE_URL=https://api-vaas.idswyft.app
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
VITE_API_TIMEOUT=30000
VITE_NODE_ENV=production
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/jpg,image/png,application/pdf
VITE_ENABLE_LIVENESS_DETECTION=true
VITE_BRAND_NAME=Idswyft Verification
VITE_SUPPORT_EMAIL=support@idswyft.app
```

## Database Setup

### Supabase Configuration

1. Create a new Supabase project for VaaS
2. Run the database migrations from `vaas-backend/src/database/schema.sql`
3. Set up Row Level Security (RLS) policies
4. Create service role and anon keys
5. Update environment variables

### Database Schema

The backend will automatically create tables on first startup. Key tables:
- `organizations` - Multi-tenant organization data
- `admins` - Organization admin users  
- `verifications` - Verification requests and results
- `webhooks` - Webhook configuration and delivery logs
- `api_keys` - Organization API keys
- `billing` - Usage and billing information

## Post-Deployment Configuration

### 1. DNS Configuration

Ensure these DNS records point to Railway:
```
api-vaas.idswyft.app → Railway backend service
app.idswyft.app → Railway admin dashboard  
customer.idswyft.app → Railway customer portal
```

### 2. SSL Certificates

Railway automatically provisions SSL certificates for custom domains. Verify HTTPS is working for all three domains.

### 3. CORS Verification

Test that the admin dashboard and customer portal can successfully communicate with the API by checking browser developer tools for CORS errors.

### 4. Health Checks

Verify all health check endpoints are responding:
- Backend: `https://api-vaas.idswyft.app/api/health`
- Admin: `https://app.idswyft.app/` (should load React app)
- Portal: `https://customer.idswyft.app/` (should load React app)

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
5. Verify webhooks are being delivered
6. Check billing/usage tracking

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