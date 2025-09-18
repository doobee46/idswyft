# VaaS Platform Integration Test Checklist

## Overview
This checklist ensures all VaaS (Verification as a Service) components are properly integrated and functioning together. Test all items systematically to verify end-to-end functionality.

## Service Architecture
- **Main Frontend**: https://idswyft.app (Main site + navigation)
- **VaaS Backend**: API server (Port 3002) - Railway deployed
- **VaaS Admin**: Admin dashboard - Railway deployed  
- **Enterprise Site**: https://enterprise.idswyft.app - Railway deployed
- **Customer Portal**: Client-facing verification portal - Railway deployed
- **Core Backend**: Original backend (Port 3001) - Local development
- **JavaScript SDK**: Developer integration library

---

## 🌐 **1. Service Connectivity Tests**

### 1.1 Basic Service Health
- [x] **Main Frontend** (https://idswyft.app) loads successfully
- [x] **Enterprise Site** (https://enterprise.idswyft.app) loads successfully  
- [x] **VaaS Backend** health endpoint responds (Railway deployment)
- [x] **VaaS Admin** dashboard loads (Railway deployment)
- [x] **Customer Portal** loads (Railway deployment)
- [x] All Railway services show "Healthy" status

### 1.2 Cross-Service Authentication
- [x] VaaS Admin authenticates with VaaS Backend
- [x] Enterprise Site can communicate with VaaS Backend
- [x] Customer Portal authenticates with VaaS Backend
- [x] Service-to-service tokens (X-Service-Token headers) working
- [x] API keys validate correctly between services

### 1.3 Database Connectivity  
- [x] VaaS Backend connects to Supabase database
- [x] Database migrations applied successfully
- [x] All required tables exist with proper schemas
- [x] Database triggers and functions working

---

## 🔗 **2. Navigation & Linking Tests**

### 2.1 Main Frontend Navigation
- [ ] Home page loads with VaaS branding
- [ ] Developer section accessible
- [ ] Demo functionality works
- [ ] Documentation links work
- [ ] **Enterprise link** correctly points to https://enterprise.idswyft.app (not localhost:3015)

### 2.2 Enterprise Site Navigation
- [ ] Landing page displays correctly
- [ ] Contact forms submit successfully
- [ ] Pricing information displays
- [ ] CTA buttons link to customer portal
- [ ] Footer links work properly

### 2.3 Admin Dashboard Navigation
- [ ] Login page loads and accepts credentials
- [ ] Dashboard main page displays metrics
- [ ] Organization management accessible
- [ ] Verification monitoring works
- [ ] Settings panels load correctly

---

## 🔐 **3. Authentication Flow Tests**

### 3.1 Admin Authentication
- [ ] Admin login with valid credentials
- [ ] Invalid credentials rejected properly
- [ ] Session persistence works
- [ ] Logout functionality works
- [ ] Password reset flow (if implemented)

### 3.2 Organization Authentication
- [ ] Organization API key generation
- [ ] API key validation in VaaS Backend  
- [ ] Multi-organization isolation
- [ ] Permission-based access control
- [ ] Token expiration handling

### 3.3 Customer Authentication
- [ ] Customer portal authentication
- [ ] Session management across verification flow
- [ ] Privacy controls working
- [ ] GDPR compliance features active

---

## 📊 **4. VaaS Core Functionality Tests**

### 4.1 Verification Session Management
- [ ] **Create verification session** via API
  ```bash
  POST /api/v1/verification/sessions
  Authorization: Bearer <org_api_key>
  ```
- [ ] **Retrieve session status** via API
  ```bash
  GET /api/v1/verification/sessions/{session_id}
  ```
- [ ] **Session state transitions**: pending → in_progress → completed
- [ ] **Session expiration** handling (if applicable)

### 4.2 Document Processing Pipeline
- [ ] **Document upload** accepts JPEG, PNG, PDF
- [ ] **OCR processing** extracts text from documents
- [ ] **Image quality validation** detects blur/tampering
- [ ] **Document type detection** (passport, driver's license, ID)
- [ ] **Data extraction** accuracy for key fields

### 4.3 Selfie & Face Recognition
- [ ] **Selfie upload** accepts image formats
- [ ] **Face detection** works on uploaded selfies
- [ ] **Liveness detection** (if implemented)
- [ ] **Face matching** against document photo
- [ ] **Match confidence scoring** within acceptable thresholds

### 4.4 Verification Results
- [ ] **Verification status updates** (verified/failed/manual_review)
- [ ] **Results data structure** matches API specification
- [ ] **Confidence scores** calculated correctly
- [ ] **Failure reasons** provided when verification fails
- [ ] **Manual review** flagging for edge cases

---

## 🔄 **5. Webhook System Tests**

### 5.1 Webhook Configuration
- [ ] **Webhook endpoints** configurable in admin dashboard
- [ ] **Authentication headers** supported (if implemented)
- [ ] **Event types** selectable (verification.completed, etc.)
- [ ] **Webhook testing** functionality in admin

### 5.2 Webhook Delivery
- [ ] **Webhook fires** when verification completes
- [ ] **Payload structure** matches documentation
- [ ] **Retry logic** works for failed deliveries (up to 3 times)
- [ ] **Delivery status** tracked in admin dashboard
- [ ] **Webhook signatures** validate correctly (if implemented)

---

## 💻 **6. Developer Integration Tests**

### 6.1 JavaScript SDK
- [ ] **SDK installation** works (`npm install idswyft-js`)
- [ ] **SDK initialization** with API key
- [ ] **Session creation** through SDK
- [ ] **Status polling** functionality
- [ ] **Event callbacks** trigger correctly
- [ ] **Error handling** for network/API failures

### 6.2 API Documentation
- [ ] **API docs** accessible and up-to-date
- [ ] **Code examples** work as documented
- [ ] **Response schemas** match actual API responses
- [ ] **Authentication examples** accurate
- [ ] **Rate limiting** documentation correct

### 6.3 Sandbox Environment
- [ ] **Test API keys** work in sandbox mode
- [ ] **Mock verification results** returned
- [ ] **No actual processing** in sandbox mode
- [ ] **Webhook testing** available in sandbox
- [ ] **Easy transition** to production keys

---

## 🏢 **7. Multi-Tenant Organization Tests**

### 7.1 Organization Isolation
- [ ] **Data isolation** between organizations
- [ ] **API key scoping** to specific organization
- [ ] **Verification sessions** only accessible to owning org
- [ ] **Admin users** can only access their organization
- [ ] **Billing isolation** (if implemented)

### 7.2 Organization Management
- [ ] **Create new organization** through admin
- [ ] **Update organization settings** (branding, webhooks)
- [ ] **Generate/revoke API keys** for organization  
- [ ] **View organization analytics** and metrics
- [ ] **Export organization data** (GDPR compliance)

---

## 📈 **8. Analytics & Monitoring Tests**

### 8.1 Usage Metrics
- [ ] **Verification volume** tracked correctly
- [ ] **Success/failure rates** calculated accurately
- [ ] **Processing times** measured and displayed
- [ ] **API usage** metrics per organization
- [ ] **Cost tracking** (if billing implemented)

### 8.2 Dashboard Metrics
- [ ] **Real-time counters** update correctly
- [ ] **Historical charts** display accurate data
- [ ] **Filter controls** work (date range, organization)
- [ ] **Export functionality** for reports
- [ ] **Performance metrics** displayed

---

## 🛡️ **9. Security & Compliance Tests**

### 9.1 Data Protection
- [ ] **File encryption** at rest for uploaded documents
- [ ] **HTTPS enforcement** across all services
- [ ] **API key security** (no keys in client-side code)
- [ ] **Session security** (secure cookies, CSRF protection)
- [ ] **File access controls** (authenticated access only)

### 9.2 GDPR/CCPA Compliance
- [ ] **Data retention policies** enforced
- [ ] **Data deletion** functionality available
- [ ] **User consent** tracking (if required)
- [ ] **Data export** functionality for users
- [ ] **Privacy controls** in customer portal

### 9.3 Rate Limiting & Abuse Protection  
- [ ] **API rate limiting** per organization/IP
- [ ] **File upload size limits** enforced
- [ ] **Malicious file detection** (if implemented)
- [ ] **DDoS protection** at service level
- [ ] **Abuse reporting** mechanisms

---

## 🚀 **10. Performance & Scale Tests**

### 10.1 Load Testing
- [ ] **Concurrent verification sessions** (test with 10+ simultaneous)
- [ ] **File upload performance** with large documents (>5MB)
- [ ] **API response times** under normal load (<2 seconds)
- [ ] **Database query performance** optimized
- [ ] **Memory usage** stable under load

### 10.2 Error Handling
- [ ] **Network failures** handled gracefully
- [ ] **Database connection errors** logged and recovered
- [ ] **File processing errors** reported clearly  
- [ ] **Third-party API failures** handled (if using external services)
- [ ] **User-friendly error messages** displayed

---

## 🎯 **11. End-to-End User Journey Tests**

### 11.1 Developer Onboarding
1. [ ] Developer visits main site
2. [ ] Navigates to Enterprise site
3. [ ] Signs up for account
4. [ ] Receives API key
5. [ ] Integrates using SDK
6. [ ] Tests in sandbox mode
7. [ ] Goes live with production key

### 11.2 End User Verification
1. [ ] Customer clicks verification link
2. [ ] Lands on Customer Portal
3. [ ] Uploads identity document
4. [ ] Takes selfie photo
5. [ ] Receives verification result
6. [ ] Verification status updates in admin
7. [ ] Webhook fires to developer's system

### 11.3 Admin Monitoring  
1. [ ] Admin logs into dashboard
2. [ ] Views real-time verification metrics
3. [ ] Monitors individual verification session
4. [ ] Reviews failed verifications
5. [ ] Configures webhook endpoints
6. [ ] Exports compliance reports

---

## ✅ **12. Environment-Specific Tests**

### 12.1 Production Environment
- [ ] **Railway deployments** all healthy and accessible
- [ ] **Domain configuration** correct (idswyft.app, enterprise.idswyft.app)
- [ ] **SSL certificates** valid and up-to-date
- [ ] **Environment variables** properly configured
- [ ] **Database connections** to production Supabase

### 12.2 Development Environment
- [ ] **Local services** start successfully
- [ ] **Hot reloading** works for development
- [ ] **Development databases** accessible
- [ ] **Test data** available for development
- [ ] **Environment switching** works correctly

---

## 🔧 **Testing Commands**

### Start Local Services for Testing
```bash
# VaaS Backend
cd idswyft-vaas/vaas-backend && npm run dev

# VaaS Admin  
cd idswyft-vaas/vaas-admin && npm run dev

# Customer Portal
cd idswyft-vaas/customer-portal && npm run dev

# Enterprise Site
cd idswyft-vaas/enterprise-site && npm run dev

# Main Frontend
cd frontend && npm run dev

# Core Backend
cd backend && npm start
```

### API Testing Examples
```bash
# Health Check
curl https://vaas-backend-url/health

# Create Verification Session
curl -X POST https://vaas-backend-url/api/v1/verification/sessions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user-123"}'

# Check Session Status  
curl -X GET https://vaas-backend-url/api/v1/verification/sessions/SESSION_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 📋 **Test Completion Tracking**

**Date Tested:** ___________  
**Tester:** ___________  
**Environment:** [ ] Development [ ] Staging [ ] Production

**Overall Status:**
- [ ] All Critical Tests Passed
- [ ] Minor Issues Documented Below  
- [ ] Major Issues Require Resolution

**Notes & Issues:**
```
[Document any issues found during testing]
```

**Sign-off:** ___________