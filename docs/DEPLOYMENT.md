# Production Deployment Guide

This guide provides step-by-step instructions for deploying the Idswyft identity verification platform to production using Vercel (frontend), Railway (backend), and Supabase (database).

## Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed locally
- Git repository access
- Accounts created for:
  - [Vercel](https://vercel.com) (frontend hosting)
  - [Railway](https://railway.app) (backend hosting)
  - [Supabase](https://supabase.com) (database hosting)

## Architecture Overview

```
Frontend (Vercel) → Backend (Railway) → Database (Supabase)
```

## Step 1: Database Setup (Supabase)

1. **Create Project**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Choose organization, enter project name: `idswyft-production`
   - Select region closest to your users
   - Generate strong database password
   - Click "Create new project"

2. **Configure Database**
   - Wait for project initialization (2-3 minutes)
   - Go to Settings → Database
   - Copy connection string: `postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres`
   - Go to Settings → API
   - Copy `Project URL` and `anon public` key

3. **Run Database Migrations**
   ```bash
   # From project root
   cd backend
   npm install
   
   # Set DATABASE_URL temporarily
   export DATABASE_URL="your_supabase_connection_string"
   
   # Run migrations (if you have them)
   npm run migrate
   ```

## Step 2: Backend Deployment (Railway)

1. **Create Railway Project**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account
   - Select your Idswyft repository
   - Choose the `main` branch

2. **Configure Environment Variables**
   - In Railway dashboard, go to your project
   - Click "Variables" tab
   - Add the following environment variables:
   ```
   DATABASE_URL=your_supabase_connection_string
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   NODE_ENV=production
   PORT=3001
   ```

3. **Configure Build Settings**
   - Railway should auto-detect Node.js
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Root directory: `backend`

4. **Deploy**
   - Railway will automatically build and deploy
   - Wait for deployment to complete
   - Copy the generated Railway URL (e.g., `https://your-app-name.railway.app`)

## Step 3: Frontend Deployment (Vercel)

1. **Prepare Environment Configuration**
   - Update `frontend/.env.production`:
   ```
   VITE_API_URL=https://api.idswyft.app
   ```

2. **Create Vercel Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure project settings:
     - Framework Preset: `Vite`
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Output Directory: `dist`

3. **Configure Environment Variables**
   - In Vercel project settings → Environment Variables
   - Add:
   ```
   VITE_API_URL = https://api.idswyft.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Your frontend will be available at `https://your-project.vercel.app`

## Step 4: Backend CORS Configuration

1. **Update CORS Settings**
   - In your backend code, update CORS configuration to allow your Vercel domain:
   ```javascript
   app.use(cors({
     origin: [
       'http://localhost:3000',
       'https://idswyft.app',
       'https://www.idswyft.app'
     ],
     credentials: true
   }));
   ```

2. **Redeploy Backend**
   - Push changes to main branch
   - Railway will automatically redeploy

## Step 5: Custom Domain Setup

1. **Configure Custom Domains**
   
   **Frontend Domain (idswyft.app):**
   - In Vercel project settings → Domains
   - Add domains: `idswyft.app` and `www.idswyft.app`
   - Update DNS records:
     ```
     Type: A, Name: @, Value: 76.76.19.19
     Type: CNAME, Name: www, Value: cname.vercel-dns.com
     ```
   
   **Backend Domain (api.idswyft.app):**
   - In Railway project settings → Domains
   - Add custom domain: `api.idswyft.app`
   - Add DNS record:
     ```
     Type: CNAME, Name: api, Value: your-app.up.railway.app
     ```
   
   - SSL certificates will be automatically provisioned

## Step 6: Environment-Specific Configuration

### Production Checklist

- [ ] Database connection string configured
- [ ] Supabase API keys configured
- [ ] CORS origins updated for production domain
- [ ] Environment variables set correctly
- [ ] SSL certificates active
- [ ] API rate limiting configured
- [ ] Error monitoring enabled

### Security Considerations

1. **Database Security**
   - Enable Row Level Security (RLS) in Supabase
   - Configure proper authentication policies
   - Regularly rotate database passwords

2. **API Security**
   - Implement proper API key validation
   - Enable rate limiting
   - Use HTTPS everywhere
   - Validate all input data

3. **File Storage**
   - Configure secure file upload limits
   - Implement virus scanning for uploads
   - Use signed URLs for file access

## Step 7: Monitoring & Maintenance

1. **Set Up Monitoring**
   - Enable Vercel Analytics
   - Configure Railway metrics
   - Set up Supabase monitoring

2. **Regular Maintenance**
   - Monitor application logs
   - Update dependencies regularly
   - Backup database regularly
   - Monitor SSL certificate expiration

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify frontend domain is in backend CORS configuration
   - Check environment variables are set correctly

2. **Database Connection Errors**
   - Verify DATABASE_URL format
   - Check Supabase project is active
   - Confirm network connectivity

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are listed in package.json
   - Review build logs for specific errors

### Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Supabase Documentation](https://supabase.com/docs)

## Cost Estimates

| Service | Free Tier | Paid Plans Start At |
|---------|-----------|-------------------|
| Vercel | 100GB bandwidth, 1000 builds/month | $20/month |
| Railway | 500 hours/month, 1GB RAM | $5/month |
| Supabase | 500MB database, 2GB bandwidth | $25/month |

## Deployment Commands Summary

```bash
# 1. Deploy backend to Railway (automatic via GitHub)
git push origin main

# 2. Deploy frontend to Vercel (automatic via GitHub)
git push origin main

# 3. Manual deployment (if needed)
cd frontend && npm run build
cd backend && npm run build && npm start
```

---

**Note**: This deployment uses a serverless/managed approach for minimal maintenance. For high-volume production use, consider dedicated servers or container orchestration platforms.