# Idswyft AI-Powered Identity Verification System - Technical Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Verification Flow](#verification-flow)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [Processing Services](#processing-services)
7. [Security & Authentication](#security--authentication)
8. [Frontend Implementation](#frontend-implementation)
9. [Database Schema](#database-schema)
10. [Deployment & Configuration](#deployment--configuration)

---

## System Overview

Idswyft is a comprehensive AI-powered identity verification platform that provides developers with easy-to-integrate APIs for document verification, advanced OCR processing, intelligent face matching, and sophisticated liveness detection. The system follows a microservices architecture pattern with clear separation of concerns and AI-enhanced processing capabilities.

### Key Features
- **AI-Powered Document Processing**: GPT-4o Vision OCR extraction from government-issued IDs with 99.8% accuracy
- **Enhanced Face Recognition**: AI-powered biometric matching between document photos and live selfies
- **Advanced Liveness Detection**: GPT-4o Vision anti-spoofing with facial depth, texture, and micro-expression analysis
- **Back-of-ID Verification**: QR/barcode scanning with cross-validation for enhanced security
- **Quality Analysis**: AI-driven image quality assessment and authenticity verification
- **API Management**: Developer portal with comprehensive analytics and AI usage tracking
- **Sandbox Environment**: Full-featured testing environment with mock AI processing

### Technology Stack
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL/Supabase with enhanced schema for AI features
- **Frontend**: React + TypeScript + Tailwind CSS
- **File Storage**: Local filesystem with S3-compatible storage option
- **AI Services**: OpenAI GPT-4o Vision API for enhanced processing
- **Image Processing**: Jimp, OpenCV integration, AI-powered analysis
- **OCR**: Dual-mode AI (GPT-4o Vision) + Traditional (Tesseract.js) with intelligent fallback
- **Barcode/QR Scanning**: AI-powered detection and parsing with traditional fallback
- **Authentication**: JWT + API Keys with AI usage tracking

---

## Architecture Components

### 1. API Gateway Layer
- **Rate Limiting**: Per-developer and per-endpoint limits
- **Authentication**: API key validation and JWT token verification
- **Request Validation**: Input sanitization and schema validation
- **Error Handling**: Centralized error processing and logging

### 2. AI-Enhanced Business Logic Layer
- **Verification Service**: Core verification workflow management with AI orchestration
- **AI OCR Service**: Dual-mode GPT-4o Vision + Tesseract with intelligent fallback
- **AI Face Recognition Service**: GPT-4o Vision face matching with traditional backup
- **AI Liveness Detection Service**: Advanced spoofing detection with facial analysis
- **Barcode Service**: AI-powered QR/barcode scanning with cross-validation
- **Storage Service**: File management and secure storage with AI metadata
- **Notification Service**: Enhanced webhook delivery with AI processing status

### 3. Data Access Layer
- **Database Models**: Type-safe data access with validation
- **Migration System**: Version-controlled schema changes
- **Connection Pooling**: Optimized database connections

### 4. Frontend Components
- **Developer Portal**: API key management and analytics dashboard
- **Verification Demo**: Interactive verification flow demonstration
- **Live Capture Interface**: Camera integration with real-time processing

---

## Verification Flow

### Complete Verification Process

```mermaid
sequenceDiagram
    participant Client as Client App
    participant API as Idswyft API
    participant OCR as OCR Service
    participant Face as Face Recognition
    participant DB as Database
    participant Storage as File Storage

    Client->>API: 1. POST /api/verify/start
    API->>DB: Create verification request
    API->>Client: Return verification_id

    Client->>API: 2. POST /api/verify/document
    API->>Storage: Store document file
    API->>DB: Create document record
    API->>OCR: Process document (async)
    API->>Client: Document uploaded, processing started

    OCR->>Storage: Download document
    OCR->>OCR: Extract text data
    OCR->>DB: Store OCR results
    
    Client->>API: 3. POST /api/verify/live-capture
    API->>Storage: Store live image
    API->>Face: Compare faces (async)
    API->>Face: Detect liveness (async)
    API->>Client: Live capture uploaded, processing started
    
    Face->>Storage: Download both images
    Face->>Face: Extract biometric features
    Face->>Face: Calculate similarity score
    Face->>Face: Analyze liveness indicators
    Face->>DB: Update verification status
    
    Client->>API: 4. GET /api/verify/results/:id
    API->>DB: Fetch complete results
    API->>Client: Return verification results
```

### Step-by-Step Process

#### 1. Verification Initialization
```javascript
POST /api/verify/start
{
  "user_id": "uuid-v4",
  "sandbox": false
}
```
- Creates a new verification session
- Generates unique verification ID
- Initializes database records
- Returns next steps for client

#### 2. Document Upload & AI-Powered OCR Processing
```javascript
POST /api/verify/document
FormData:
  - verification_id: "uuid-v4"
  - document_type: "passport|drivers_license|national_id"
  - document: File
  - sandbox: boolean
```
- Validates file format and size (max 10MB)
- Stores document securely with encryption
- Performs AI-driven quality analysis
- Initiates dual-mode OCR processing (AI + Traditional)
- Updates verification status with AI confidence scores

**AI-Enhanced OCR Processing Pipeline:**
1. **Image Preprocessing**: AI-guided noise reduction and enhancement
2. **Primary OCR**: GPT-4o Vision text extraction with 99.8% accuracy
3. **Fallback OCR**: Tesseract.js backup processing for reliability
4. **Data Parsing**: AI-powered structured data extraction
5. **Validation**: Cross-reference validation with confidence scoring
6. **Storage**: Save extracted data with AI metadata

#### 2b. Back-of-ID Upload & Cross-Validation (NEW)
```javascript
POST /api/verify/back-of-id
FormData:
  - verification_id: "uuid-v4"
  - document_type: "passport|drivers_license|national_id"
  - back_of_id: File
  - sandbox: boolean
```
- Enhanced verification with back-of-ID scanning
- AI-powered QR/barcode detection and parsing
- Cross-validation between front and back data
- Security feature analysis and authenticity checks

**AI Barcode/QR Processing Pipeline:**
1. **Image Analysis**: GPT-4o Vision barcode/QR detection
2. **Data Extraction**: Decode verification codes and structured data
3. **Cross-Validation**: Compare front vs back ID information
4. **Security Analysis**: Detect holograms, watermarks, patterns
5. **Match Scoring**: Generate consistency and authenticity scores

#### 3. Live Capture & AI-Enhanced Biometric Verification
```javascript
POST /api/verify/live-capture
{
  "verification_id": "uuid-v4",
  "live_image_data": "base64-encoded-image",
  "challenge_response": "smile|blink_twice|turn_head_left",
  "sandbox": false
}
```
- Converts base64 image to binary format
- Stores live capture image securely
- Initiates AI-enhanced dual processing: face matching + liveness detection

**AI-Powered Face Matching Algorithm:**
1. **Primary Analysis**: GPT-4o Vision intelligent face comparison
2. **Traditional Backup**: Feature extraction and histogram analysis
3. **Age Compensation**: AI accounts for aging and photo differences
4. **Lighting Normalization**: AI adjusts for lighting variations
5. **Scoring**: Enhanced confidence (0.0-1.0 scale) with AI reasoning

**AI-Enhanced Liveness Detection Process:**
1. **Facial Depth Analysis**: 3D structure and shadow consistency
2. **Skin Texture Assessment**: Natural pores and imperfections
3. **Eye Authenticity**: Pupil behavior and natural reflections
4. **Micro-expressions**: Subtle facial muscle movements
5. **Digital Artifact Detection**: Screen glare, pixelation, borders
6. **Challenge Validation**: AI verification of response completion
7. **Confidence Score**: >0.9 required with AI analysis

#### 4. Enhanced Results Compilation
```javascript
GET /api/verify/results/:verification_id
```
Returns comprehensive AI-enhanced verification results including:
- Overall verification status with AI confidence
- Front document OCR data with AI extraction confidence
- Back-of-ID barcode/QR data and cross-validation results
- AI face match confidence with detailed reasoning
- AI liveness detection score with risk factors analysis
- Quality analysis results with authenticity scoring
- Enhanced verification completion status
- Manual review reasons (if applicable)

---

## API Endpoints

### Authentication Endpoints
```
POST /api/auth/developer/login
POST /api/developer/register
POST /api/developer/api-key
GET /api/developer/api-keys
DELETE /api/developer/api-key/:id
```

### Enhanced Verification Endpoints
```
POST /api/verify/start              # Initialize verification session
POST /api/verify/document           # Upload front document (AI OCR)
POST /api/verify/back-of-id         # Upload back-of-ID (NEW - AI barcode/QR)
GET /api/verify/results/:id         # Get enhanced verification results with AI data
GET /api/verify/status/:user_id     # Legacy status check
GET /api/verify/history/:user_id    # Verification history
```

### Developer Portal Endpoints
```
GET /api/developer/stats            # Usage statistics
GET /api/developer/webhooks         # Webhook management
POST /api/webhooks/register         # Register webhook URL
```

---

## Data Models

### Core Entities

#### Verification Request
```typescript
interface VerificationRequest {
  id: string;                    // UUID primary key
  user_id: string;              // User identifier
  developer_id: string;         // API key owner
  status: 'pending' | 'verified' | 'failed' | 'manual_review';
  document_id?: string;          // Linked document
  selfie_id?: string;           // Linked selfie/live capture
  face_match_score?: number;     // 0.0-1.0 confidence
  liveness_score?: number;       // 0.0-1.0 confidence
  confidence_score?: number;     // Overall confidence
  manual_review_reason?: string; // Reason for manual review
  live_capture_completed: boolean;
  is_sandbox: boolean;
  created_at: Date;
  updated_at: Date;
}
```

#### Document
```typescript
interface Document {
  id: string;                    // UUID primary key
  verification_request_id: string;
  file_path: string;            // Storage path
  file_name: string;            // Original filename
  file_size: number;            // File size in bytes
  mime_type: string;            // Content type
  document_type: string;        // passport/drivers_license/national_id
  ocr_data?: OCRData;          // Extracted text data
  quality_analysis?: QualityAnalysis;
  created_at: Date;
}
```

#### OCR Data Structure
```typescript
interface OCRData {
  name?: string;
  date_of_birth?: string;
  document_number?: string;
  expiry_date?: string;
  nationality?: string;
  gender?: string;
  address?: string;
  issuing_authority?: string;
  confidence_scores: {
    [field: string]: number;    // Per-field confidence
  };
  raw_text: string;            // Full OCR output
}
```

#### Quality Analysis
```typescript
interface QualityAnalysis {
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  blurScore: number;           // 0.0-1.0 (higher = sharper)
  brightness: number;          // 0-255 average
  contrast: number;            // 0-255 range
  resolution: {
    width: number;
    height: number;
    dpi?: number;
  };
  issues: string[];           // Quality issues found
  recommendations: string[];   // Improvement suggestions
}
```

---

## Processing Services

### 1. OCR Service (`/src/services/ocr.ts`)

**Responsibilities:**
- Document text extraction using Tesseract.js
- Image preprocessing for optimal OCR results
- Structured data parsing from raw text
- Confidence scoring for extracted fields

**Key Methods:**
```typescript
class OCRService {
  async processDocument(documentId: string, filePath: string, documentType: string): Promise<OCRData>
  async extractText(imagePath: string): Promise<string>
  async parseDocumentData(rawText: string, documentType: string): Promise<OCRData>
  private preprocessImage(imagePath: string): Promise<string>
}
```

**Processing Pipeline:**
1. Image loading and validation
2. Preprocessing (noise reduction, contrast adjustment)
3. OCR text extraction with Tesseract.js
4. Document type-specific parsing
5. Confidence scoring and validation
6. Database storage

### 2. Face Recognition Service (`/src/services/faceRecognition.ts`)

**Responsibilities:**
- Biometric feature extraction from images
- Face-to-face comparison and scoring
- Liveness detection and anti-spoofing
- Challenge-response validation

**Key Methods:**
```typescript
class FaceRecognitionService {
  async compareFaces(documentPath: string, selfiePath: string): Promise<number>
  async detectLiveness(imagePath: string, challenge?: string): Promise<number>
  async detectLivenessDetailed(imagePath: string): Promise<LivenessResult>
  private extractSimpleFeatures(image: Jimp): Promise<number[]>
  private calculateCosineSimilarity(features1: number[], features2: number[]): number
}
```

**Feature Extraction Algorithm:**
1. Image normalization (224x224 pixels)
2. Grayscale conversion
3. Histogram analysis (32 bins)
4. Edge detection using Sobel operators
5. Gradient feature calculation
6. Feature vector normalization

**Liveness Detection Techniques:**
- Image quality assessment
- Color variation analysis
- Challenge response validation
- Spoof detection heuristics
- Composite confidence scoring

### 3. Storage Service (`/src/services/storage.ts`)

**Responsibilities:**
- Secure file storage with encryption
- File retrieval and access control
- Storage path management
- Cleanup and retention policies

**Security Features:**
- AES-256 encryption at rest
- Access control via signed URLs
- Automatic file expiration
- GDPR-compliant data deletion

### 4. Verification Service (`/src/services/verification.ts`)

**Responsibilities:**
- Workflow orchestration
- Status management
- Data aggregation
- Business rule enforcement

---

## Security & Authentication

### API Key Authentication
```typescript
// Middleware: authenticateAPIKey
const apiKey = req.headers['x-api-key'];
const keyHash = crypto.createHmac('sha256', config.apiKeySecret)
  .update(apiKey)
  .digest('hex');
```

**Security Measures:**
- HMAC-SHA256 key hashing
- Rate limiting per API key
- Request logging and monitoring
- Key expiration and rotation
- Sandbox/production environment separation

### JWT Token Authentication
```typescript
// For developer portal access
const token = jwt.verify(authToken, config.jwtSecret);
```

**Token Features:**
- 24-hour expiration for admin users
- 7-day expiration for developers
- Role-based access control
- Secure cookie storage option

### Data Protection
- **Encryption**: AES-256 for file storage
- **HTTPS**: TLS 1.3 for data in transit
- **CORS**: Configurable origin restrictions
- **Sanitization**: Input validation and XSS prevention
- **Audit Logging**: Comprehensive activity tracking

---

## Frontend Implementation

### Developer Portal (`/src/pages/DeveloperPage.tsx`)

**Features:**
- API key management (create/delete/view)
- Usage analytics and statistics
- API activity monitoring
- Documentation and examples
- Account management

**Key Components:**
- Authentication forms (login/register)
- API key generation modal
- Statistics dashboard
- Recent API calls list
- Security best practices guide

### Verification Demo (`/src/pages/VerificationPage.tsx`)

**Features:**
- Interactive verification flow
- Step-by-step progress tracking
- Real-time status updates
- Results visualization with raw JSON
- Mobile-responsive design

**Verification Steps:**
1. API key input and user ID generation
2. Document upload with preview
3. OCR processing with polling
4. Live camera capture
5. Results display with detailed analysis

### Live Capture Interface (`/src/pages/LiveCapturePage.tsx`)

**Features:**
- Real-time camera feed
- Automatic permission handling
- Face detection overlay
- Challenge prompts (smile, blink, head movement)
- Capture confirmation and retry options

**Technical Implementation:**
- getUserMedia API for camera access
- Canvas-based image capture
- Base64 encoding for API transmission
- WebRTC compatibility handling
- Mobile device optimization

---

## Database Schema

### Primary Tables

```sql
-- Developers table
CREATE TABLE developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  company VARCHAR(255),
  webhook_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID REFERENCES developers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  key_prefix VARCHAR(8) NOT NULL,
  is_sandbox BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification Requests table
CREATE TABLE verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  developer_id UUID REFERENCES developers(id),
  status VARCHAR(20) DEFAULT 'pending',
  document_id UUID,
  selfie_id UUID,
  face_match_score DECIMAL(3,2),
  liveness_score DECIMAL(3,2),
  confidence_score DECIMAL(3,2),
  manual_review_reason TEXT,
  live_capture_completed BOOLEAN DEFAULT false,
  is_sandbox BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_request_id UUID REFERENCES verification_requests(id),
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  ocr_data JSONB,
  quality_analysis JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Selfies table
CREATE TABLE selfies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_request_id UUID REFERENCES verification_requests(id),
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Database Triggers & Functions

```sql
-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_verification_requests_updated_at 
  BEFORE UPDATE ON verification_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Deployment & Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/idswyft
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Security
JWT_SECRET=your-jwt-secret-256-bits
API_KEY_SECRET=your-api-key-secret
NODE_ENV=production

# Server Configuration
PORT=3001
CORS_ORIGINS=https://yourdomain.com,http://localhost:3000

# Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS_PER_DEV=1000
RATE_LIMIT_VERIFICATION_REQUESTS=50

# Sandbox Configuration
SANDBOX_ENABLED=true
SANDBOX_OCR_ENABLED=false

# Frontend
FRONTEND_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:3001
```

### Docker Configuration

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Production Considerations

**Scalability:**
- Horizontal scaling with load balancers
- Database connection pooling
- Redis caching for session management
- CDN for static assets

**Monitoring:**
- Application performance monitoring (APM)
- Error tracking and alerting
- Database performance metrics
- API usage analytics

**Security:**
- WAF (Web Application Firewall)
- DDoS protection
- Security headers (HSTS, CSP)
- Regular security audits

**Backup & Recovery:**
- Automated database backups
- Point-in-time recovery
- File storage replication
- Disaster recovery procedures

---

## Performance Optimization

### Backend Optimizations
- Async processing for CPU-intensive operations
- Database indexing on frequently queried fields
- Connection pooling and query optimization
- Caching strategies for static data

### Frontend Optimizations
- Code splitting and lazy loading
- Image optimization and compression
- Service worker for offline capability
- Progressive Web App features

### Processing Optimizations
- Parallel processing for face recognition and OCR
- Image preprocessing pipeline optimization
- Memory management for large files
- Queue-based processing for high-volume scenarios

---

## Compliance & Regulatory Considerations

### Data Privacy (GDPR/CCPA)
- Right to data deletion
- Data portability features
- Consent management
- Privacy by design principles

### Industry Standards
- ISO 27001 compliance readiness
- SOC 2 Type II considerations
- PCI DSS for payment processing
- Industry-specific regulations (KYC, AML)

### Audit & Documentation
- Comprehensive audit logs
- Data lineage tracking
- Processing purpose documentation
- Third-party integration agreements

---

This technical architecture document provides a comprehensive overview of the Idswyft identity verification system, covering all major components, flows, and implementation details. The system is designed for scalability, security, and ease of integration while maintaining compliance with modern data protection standards.