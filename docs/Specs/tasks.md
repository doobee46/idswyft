# Identity Verification MVP - Implementation Checklist

## 1. Database Schema and Migrations
- [ ] Create tables: `users`, `verification_requests`, `documents`, `selfies`, `api_keys`, `webhooks`, `user_requests`, `developer_requests`
- [ ] Add fields for document metadata, OCR-extracted fields, verification status
- [ ] Create indexes on `user_id` and `verification_status`
- [ ] Implement triggers to auto-update verification status on OCR or face match completion
- [ ] Implement rate limiting tables and triggers
- _Requirements: 1, 2, 6, 8, 9_

## 2. Type Definitions and Models
- [ ] Define backend models/interfaces: `User`, `VerificationRequest`, `Document`, `Selfie`, `APIKey`, `Webhook`
- [ ] Include verification status types: `pending`, `verified`, `failed`, `manual_review`
- [ ] Include types for optional paid API result data
- [ ] Add sandbox simulation types
- _Requirements: 1, 2, 3, 10_

## 3. Core API Endpoints
- [ ] `POST /verify/document` - handle document upload, validation, storage, trigger OCR
- [ ] `POST /verify/selfie` - handle selfie upload, storage, trigger face recognition
- [ ] `GET /verify/status/:user_id` - return verification status and details
- [ ] `POST /developer/api_key` - create/manage API keys with authentication and rate limiting
- [ ] `POST /webhooks/register` - register developer webhook URLs
- _Requirements: 1, 2, 3, 8, 9_

## 4. OCR and Document Processing
- [ ] Integrate Tesseract OCR to extract key fields
- [ ] Implement OpenCV checks for image quality and tampering
- [ ] Flag failed documents for manual review or optional paid API
- [ ] Update verification status based on OCR and authenticity
- _Requirements: 1, 5, 6_

## 5. Face Recognition & Liveness
- [ ] Compare uploaded selfie with document photo
- [ ] Implement optional liveness check (blink/head movement)
- [ ] Update verification status based on match
- _Requirements: 1, 5_

## 6. Webhook System
- [ ] Trigger webhooks on verification status changes
- [ ] Include user_id, verification status, timestamp in payload
- [ ] Implement retry logic for failed webhooks
- _Requirements: 3_

## 7. Admin Dashboard
- [ ] Build dashboard showing users and verification requests
- [ ] Add filters and sorting by status, date, or user
- [ ] Implement manual review: approve/reject flagged verifications
- _Requirements: 4_

## 8. Sandbox Environment
- [ ] Create sandbox API keys for testing
- [ ] Simulate verification results without calling production APIs
- [ ] Allow sandbox webhook configuration
- _Requirements: 10_

## 9. Optional Paid API Integration
- [ ] Integrate Persona / Onfido sandbox for failed local checks
- [ ] Update verification results based on paid API response
- _Requirements: 5_

## 10. Security & Compliance
- [ ] Encrypt all files at rest
- [ ] Serve all endpoints over HTTPS
- [ ] Implement GDPR/CCPA compliance for data access and deletion
- _Requirements: 6, 7_

## 11. Testing & QA
- [ ] Test document upload, OCR extraction, authenticity checks, and face match
- [ ] Test API key authentication, rate limiting, and webhook delivery
- [ ] Test admin dashboard functionality
- [ ] Test sandbox environment and optional paid API fallback
- [ ] Validate compliance and encryption
- _Requirements: All_
