# Idswyft - Open Source Identity Verification Platform

A developer-friendly, production-ready identity verification platform with document OCR, face recognition, and comprehensive API integrations.

## Features

- 🆔 **Document Verification**: OCR extraction and authenticity checks for government IDs
- 👤 **Face Recognition**: Selfie matching with document photos
- 🔑 **API Key Management**: Secure developer authentication and rate limiting
- 🪝 **Webhooks**: Real-time notification system with retry logic
- 🛡️ **Privacy Compliant**: GDPR and CCPA compliance built-in
- 📊 **Admin Dashboard**: Comprehensive management and analytics
- 🧪 **Sandbox Mode**: Test environment for development
- ☁️ **Cloud Ready**: Support for Supabase, AWS, and local deployment

## Architecture

### Backend (Node.js + TypeScript)
- Express.js API server
- Supabase database with PostgreSQL
- Tesseract OCR for document processing
- Face-api.js for face recognition
- Comprehensive rate limiting and security

### Frontend (React + TypeScript)
- Vite build system
- Tailwind CSS for styling
- React Query for state management
- Admin dashboard and developer portal

## Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account (or PostgreSQL database)
- Tesseract OCR installed

### 1. Clone and Install
```bash
git clone https://github.com/your-org/idswyft.git
cd idswyft
npm run setup
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Update `.env` with your Supabase credentials:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### 3. Database Setup
```bash
npm run db:setup
```

### 4. Start Development
```bash
npm run dev
```

This starts:
- Backend API: http://localhost:3001
- Frontend: http://localhost:5173
- Admin dashboard: http://localhost:5173/admin

## API Documentation

### Authentication
Include your API key in requests:
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3001/api/verify/status/user-123
```

### Core Endpoints

#### Document Verification
```bash
POST /api/verify/document
Content-Type: multipart/form-data

{
  "user_id": "user-123",
  "document_type": "passport",
  "document": [file]
}
```

#### Selfie Upload
```bash
POST /api/verify/selfie
Content-Type: multipart/form-data

{
  "verification_id": "verification-456",
  "selfie": [file]
}
```

#### Check Status
```bash
GET /api/verify/status/:user_id
```

### Webhook Payload
```json
{
  "user_id": "user-123",
  "verification_id": "verification-456", 
  "status": "verified",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "ocr_data": {...},
    "face_match_score": 0.95
  }
}
```

## Developer Portal

1. Visit http://localhost:5173/developer
2. Register with your email
3. Get your API key
4. Set up webhooks (optional)
5. Start integrating!

## Admin Dashboard

Default credentials:
- Email: admin@idswyft.com
- Password: admin123

Access at: http://localhost:5173/admin

## Deployment

### Docker (Recommended)
```bash
docker-compose up -d
```

### Manual Deployment
1. Build the application:
```bash
npm run build
```

2. Set production environment variables
3. Deploy backend to your preferred platform
4. Deploy frontend to CDN/static hosting

### Environment Variables

#### Required
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for backend operations
- `JWT_SECRET` - Secret for admin JWT tokens
- `ENCRYPTION_KEY` - 32-character key for file encryption

#### Optional
- `PERSONA_API_KEY` - For Persona.com integration
- `ONFIDO_API_KEY` - For Onfido integration
- `WEBHOOK_RETRY_ATTEMPTS` - Number of webhook retries (default: 3)
- `RATE_LIMIT_MAX_REQUESTS_PER_USER` - Daily verification limit (default: 5)

## Security

- All uploaded files are encrypted at rest
- Rate limiting prevents abuse
- API keys use secure hashing
- GDPR compliance with data deletion
- HTTPS-only in production
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](http://localhost:5173/docs)
- 🐛 [Report Issues](https://github.com/your-org/idswyft/issues)
- 💬 [Discussions](https://github.com/your-org/idswyft/discussions)

## Roadmap

- [ ] Additional document types support
- [ ] Liveness detection for selfies  
- [ ] Multi-language OCR
- [ ] Mobile SDK (React Native)
- [ ] Additional cloud storage providers
- [ ] Enterprise SSO integration

---

Built with ❤️ for the developer community