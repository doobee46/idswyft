import { 
  DocumentCheckIcon, 
  CameraIcon,
  CodeBracketIcon,
  BoltIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  SparklesIcon,
  AcademicCapIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { getDocumentationApiUrl } from '../config/api';

export const DocsPage: React.FC = () => {
  const apiUrl = getDocumentationApiUrl();
  
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            <SparklesIcon className="inline h-8 w-8 text-purple-600 mr-2" />
            AI-Powered API Documentation
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600">
            Complete guide to the Idswyft Identity Verification API with GPT-4o Vision, AI liveness detection, and enhanced verification features
          </p>
        </div>
        
        {/* Quick Start */}
        <section className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-4 sm:mb-6 flex items-center">
            <BoltIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 mr-2" />
            Quick Start
          </h2>
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
              <h3 className="font-semibold text-base sm:text-lg mb-3">JavaScript/TypeScript v2.0.0</h3>
              <pre className="text-xs sm:text-sm bg-gray-900 text-green-400 p-3 sm:p-4 rounded overflow-x-auto">
{`npm install idswyft-sdk

import { IdswyftSDK } from 'idswyft-sdk';

const client = new IdswyftSDK({
  apiKey: 'your-api-key',
  sandbox: true // Set to false for production
});

// Enhanced Verification Flow (NEW in v2.0.0)
const session = await client.startVerification({
  user_id: 'user-123'
});

// Step 1: Upload front document
const document = await client.verifyDocument({
  verification_id: session.verification_id,
  document_type: 'drivers_license',
  document_file: frontFile
});

// Step 2: Upload back of ID (barcode scanning)
const backId = await client.verifyBackOfId({
  verification_id: session.verification_id,
  document_type: 'drivers_license', 
  back_of_id_file: backFile
});

// Step 3: Live capture with AI liveness detection
const liveResult = await client.liveCapture({
  verification_id: session.verification_id,
  live_image_data: 'data:image/jpeg;base64,...'
});

// Get comprehensive results
const results = await client.getVerificationResults(
  session.verification_id
);

console.log(results.ocr_data); // GPT-4o Vision OCR
console.log(results.cross_validation_results);
console.log(results.liveness_score);`}
              </pre>
            </div>
            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
              <h3 className="font-semibold text-base sm:text-lg mb-3">Python v2.0.0</h3>
              <pre className="text-xs sm:text-sm bg-gray-900 text-green-400 p-3 sm:p-4 rounded overflow-x-auto">
{`pip install idswyft

import idswyft

client = idswyft.IdswyftClient(
    api_key='your-api-key',
    sandbox=True
)

# Enhanced Verification Flow (NEW in v2.0.0)
session = client.start_verification(user_id='user-123')

# Step 1: Upload front document  
document = client.verify_document(
    verification_id=session['verification_id'],
    document_type='drivers_license',
    document_file='front.jpg'
)

# Step 2: Upload back of ID (barcode scanning)
back_id = client.verify_back_of_id(
    verification_id=session['verification_id'],
    document_type='drivers_license',
    back_of_id_file='back.jpg'
)

# Step 3: Live capture with AI liveness detection
live_result = client.live_capture(
    verification_id=session['verification_id'],
    live_image_data='data:image/jpeg;base64,...'
)

# Get comprehensive results
results = client.get_verification_results(
    session['verification_id']
)

print(results['ocr_data'])  # GPT-4o Vision OCR
print(results['cross_validation_results'])
print(results['liveness_score'])`}
              </pre>
            </div>
          </div>
        </section>

        {/* What's New in v2.0.0 */}
        <section className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-4 sm:mb-6 flex items-center">
            <SparklesIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mr-2" />
            🆕 What's New in SDK v2.0.0
          </h2>
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 sm:p-6 rounded-lg mb-6">
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center mb-3">
                  <EyeIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-sm sm:text-base">Enhanced Verification Flow</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Session-based verification with back-of-ID scanning, barcode validation, and cross-validation</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">startVerification()</code>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center mb-3">
                  <CameraIcon className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-sm sm:text-base">AI Liveness Detection</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Real-time liveness detection with challenge-response and facial recognition</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">liveCapture()</code>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center mb-3">
                  <CodeBracketIcon className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="font-semibold text-sm sm:text-base">Developer Management</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Complete API key lifecycle, activity monitoring, and webhook management</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">createApiKey()</code>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center mb-3">
                  <DocumentCheckIcon className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="font-semibold text-sm sm:text-base">Barcode Scanning</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">PDF417 barcode parsing for driver's licenses with security feature validation</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">verifyBackOfId()</code>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center mb-3">
                  <ChartBarIcon className="h-5 w-5 text-yellow-600 mr-2" />
                  <h3 className="font-semibold text-sm sm:text-base">Analytics & Monitoring</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Comprehensive verification history, usage analytics, and activity tracking</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">getVerificationHistory()</code>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center mb-3">
                  <ShieldCheckIcon className="h-5 w-5 text-indigo-600 mr-2" />
                  <h3 className="font-semibold text-sm sm:text-base">Webhook System</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Full webhook CRUD, delivery testing, retry logic, and signature verification</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">registerWebhook()</code>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 p-4 bg-white rounded-lg border-l-4 border-purple-500">
              <h4 className="font-semibold text-sm sm:text-base mb-2 flex items-center">
                <AcademicCapIcon className="h-4 w-4 text-purple-600 mr-2" />
                Migration from v1.x to v2.0.0
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 mb-2">
                The new enhanced verification flow is backward compatible. Existing v1.x code continues to work, but we recommend migrating to the session-based approach for enhanced features.
              </p>
              <div className="text-xs text-purple-700 font-medium">
                Breaking Changes: None • New Features: 15+ • Enhanced Security: ✓
              </div>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-4 sm:mb-6 flex items-center">
            <ShieldCheckIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mr-2" />
            Authentication
          </h2>
          <div className="bg-blue-50 p-4 sm:p-6 rounded-lg mb-4">
            <p className="text-blue-800 mb-3 text-sm sm:text-base">
              <strong>Base URL:</strong> <code className="bg-blue-100 px-2 py-1 rounded text-xs sm:text-sm break-all">{apiUrl}</code>
            </p>
            <p className="text-blue-800 text-sm sm:text-base">
              <strong>Authentication:</strong> Include <code className="bg-blue-100 px-2 py-1 rounded text-xs sm:text-sm">X-API-Key</code> header with your API key
            </p>
          </div>
          <div className="bg-gray-50 p-3 sm:p-4 rounded-md">
            <pre className="text-xs sm:text-sm overflow-x-auto">
{`Headers:
X-API-Key: your-api-key-here
Content-Type: multipart/form-data (for file uploads)
Content-Type: application/json (for other requests)`}
            </pre>
          </div>
        </section>

        {/* Core Endpoints */}
        <section className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-4 sm:mb-6 flex items-center">
            <DocumentCheckIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mr-2" />
            Complete Verification Flow
          </h2>
          
          <div className="mb-4 sm:mb-6 bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">🔄 New Cohesive API Flow</h4>
            <p className="text-blue-800 text-xs sm:text-sm">
              Our verification API now follows a session-based approach where you start a verification, 
              upload documents, perform live capture, and get unified results.
            </p>
          </div>

          {/* Start Verification */}
          <div className="mb-6 sm:mb-8 border border-gray-200 rounded-lg">
            <div className="bg-blue-50 p-3 sm:p-4 border-b">
              <h3 className="font-semibold text-base sm:text-lg">1. Start Verification Session</h3>
              <code className="text-xs sm:text-sm text-blue-700 break-all">POST /api/verify/start</code>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
                Initialize a new verification session for a user. This creates a unique verification ID 
                that will be used for all subsequent operations.
              </p>
              
              <h4 className="font-medium mb-2 text-sm sm:text-base">Request Parameters:</h4>
              <div className="bg-gray-50 p-3 sm:p-4 rounded text-xs sm:text-sm mb-3 sm:mb-4">
                <pre className="overflow-x-auto">
{`user_id: string (UUID - unique identifier for the user)
sandbox: boolean (optional - defaults to false)`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm sm:text-base">Example Request:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm mb-3 sm:mb-4">
                <pre className="overflow-x-auto">
{`curl -X POST ${apiUrl}/api/verify/start \\
  -H "X-API-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user_123"
  }'`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm sm:text-base">Response:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm">
                <pre className="overflow-x-auto">
{`{
  "verification_id": "verif_abc123",
  "status": "started",
  "user_id": "user_123",
  "next_steps": [
    "Upload document with POST /api/verify/document",
    "Complete live capture with POST /api/verify/live-capture",
    "Check results with GET /api/verify/results/:verification_id"
  ],
  "created_at": "2024-01-01T12:00:00Z"
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="mb-6 sm:mb-8 border border-gray-200 rounded-lg">
            <div className="bg-green-50 p-3 sm:p-4 border-b">
              <h3 className="font-semibold text-base sm:text-lg">2. Upload Document to Verification</h3>
              <code className="text-xs sm:text-sm text-green-700 break-all">POST /api/verify/document</code>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
                Upload an identity document to an existing verification session. This performs OCR extraction, 
                quality assessment, and authenticity checks.
              </p>
              
              <h4 className="font-medium mb-2 text-sm sm:text-base">Request Parameters:</h4>
              <div className="bg-gray-50 p-3 sm:p-4 rounded text-xs sm:text-sm mb-3 sm:mb-4">
                <pre className="overflow-x-auto">
{`verification_id: string (UUID from step 1)
document_type: 'passport' | 'drivers_license' | 'national_id' | 'other'
document: File (image/jpeg, image/png, image/webp, application/pdf)
metadata: object (optional)`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm sm:text-base">Example Request:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm mb-3 sm:mb-4">
                <pre className="overflow-x-auto">
{`curl -X POST ${apiUrl}/api/verify/document \\
  -H "X-API-Key: your-api-key" \\
  -F "verification_id=verif_abc123" \\
  -F "document_type=passport" \\
  -F "document=@passport.jpg"`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm sm:text-base">Response with AI Analysis:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm">
                <pre className="overflow-x-auto">
{`{
  "id": "verif_abc123",
  "status": "verified",
  "type": "document",
  "confidence_score": 0.95,
  "user_id": "user-123",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:15Z",
  
  // OCR Analysis with Confidence Scores
  "ocr_data": {
    "name": "John Doe",
    "date_of_birth": "1990-01-01",
    "document_number": "P123456789",
    "expiration_date": "2030-01-01",
    "nationality": "US",
    "issuing_authority": "US Passport Agency",
    "confidence_scores": {
      "name": 0.98,
      "date_of_birth": 0.95,
      "document_number": 0.92
    }
  },
  
  // Quality Analysis
  "quality_analysis": {
    "overallQuality": "excellent",
    "isBlurry": false,
    "blurScore": 342.5,
    "brightness": 128,
    "contrast": 45,
    "resolution": {
      "width": 1920,
      "height": 1080,
      "isHighRes": true
    },
    "fileSize": {
      "bytes": 2457600,
      "isReasonableSize": true
    },
    "issues": [],
    "recommendations": ["Consider better lighting"]
  }
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Back-of-ID Upload */}
          <div className="mb-6 sm:mb-8 border border-gray-200 rounded-lg">
            <div className="bg-cyan-50 p-3 sm:p-4 border-b">
              <h3 className="font-semibold text-base sm:text-lg flex items-center">
                <AcademicCapIcon className="h-5 w-5 text-cyan-600 mr-2" />
                2b. Upload Back-of-ID (Enhanced Verification)
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">NEW</span>
              </h3>
              <code className="text-xs sm:text-sm text-cyan-700 break-all">POST /api/verify/back-of-id</code>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
                Upload the back of an ID document for enhanced verification with QR/barcode scanning and cross-validation 
                against front-of-ID data. This optional step significantly increases verification accuracy.
              </p>
              
              <div className="bg-purple-50 border border-purple-200 p-3 mb-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  AI-Powered Features
                </h4>
                <ul className="text-purple-800 text-sm space-y-1">
                  <li>• GPT-4o Vision barcode and QR code scanning</li>
                  <li>• Cross-validation between front and back data</li>
                  <li>• Security feature detection and analysis</li>
                  <li>• Verification code extraction and matching</li>
                </ul>
              </div>
              
              <h4 className="font-medium mb-2 text-sm sm:text-base">Request Parameters:</h4>
              <div className="bg-gray-50 p-3 sm:p-4 rounded text-xs sm:text-sm mb-3 sm:mb-4">
                <pre className="overflow-x-auto">
{`verification_id: string (UUID from step 1)
document_type: 'passport' | 'drivers_license' | 'national_id' | 'other'
back_of_id: File (image/jpeg, image/png, image/webp)
metadata: object (optional)`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm sm:text-base">Example Request:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm mb-3 sm:mb-4">
                <pre className="overflow-x-auto">
{`curl -X POST ${apiUrl}/api/verify/back-of-id \\
  -H "X-API-Key: your-api-key" \\
  -F "verification_id=verif_abc123" \\
  -F "document_type=drivers_license" \\
  -F "back_of_id=@drivers_license_back.jpg"`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm sm:text-base">Response with Cross-Validation:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm">
                <pre className="overflow-x-auto">
{`{
  "verification_id": "verif_abc123",
  "back_of_id_document_id": "doc_back456",
  "status": "processing",
  "message": "Back-of-ID uploaded successfully. Enhanced verification processing started.",
  
  "enhanced_verification": {
    "barcode_scanning_enabled": true,
    "cross_validation_enabled": true,
    "ai_powered": true
  },
  
  "next_steps": [
    "Processing barcode/QR code scanning",
    "Cross-validating with front-of-ID data",
    "Check results with GET /api/verify/results/verif_abc123"
  ]
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Selfie Verification */}
          <div className="mb-6 sm:mb-8 border border-gray-200 rounded-lg">
            <div className="bg-purple-50 p-3 sm:p-4 border-b">
              <h3 className="font-semibold text-base sm:text-lg">Selfie Verification with Face Matching</h3>
              <code className="text-xs sm:text-sm text-purple-700 break-all">POST /api/verify/selfie</code>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
                Upload a selfie for face matching against document photos and liveness detection.
              </p>
              
              <h4 className="font-medium mb-2 text-sm sm:text-base">Request Parameters:</h4>
              <div className="bg-gray-50 p-3 sm:p-4 rounded text-xs sm:text-sm mb-3 sm:mb-4">
                <pre className="overflow-x-auto">
{`selfie: File (image/jpeg, image/png, image/webp)
reference_document_id: string (optional - document to match against)
user_id: string (optional)
webhook_url: string (optional)
metadata: object (optional)`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm sm:text-base">Response with Face Matching:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm">
                <pre className="overflow-x-auto">
{`{
  "id": "verif_selfie123",
  "status": "verified",
  "type": "selfie",
  "user_id": "user-123",
  
  // Face Matching Results
  "face_match_score": 0.91,        // 0-1 similarity score
  "liveness_score": 0.87,          // 0-1 live person confidence
  "manual_review_reason": null     // Why manual review needed (if any)
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Live Camera Capture */}
          <div className="mb-6 sm:mb-8 border border-gray-200 rounded-lg">
            <div className="bg-orange-50 p-3 sm:p-4 border-b">
              <h3 className="font-semibold text-base sm:text-lg flex items-center">
                <EyeIcon className="h-5 w-5 text-orange-600 mr-2" />
                3. Live Camera Capture with AI Liveness Detection
                <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">AI-Enhanced</span>
              </h3>
              <code className="text-xs sm:text-sm text-orange-700 break-all">POST /api/verify/live-capture</code>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
                Perform real-time camera capture with advanced AI-powered liveness detection using GPT-4o Vision. 
                Detects spoofing attempts, analyzes facial depth, skin texture, and micro-expressions for bulletproof security.
              </p>
              
              <div className="bg-purple-50 border border-purple-200 p-3 mb-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  AI Liveness Detection Features
                </h4>
                <ul className="text-purple-800 text-sm space-y-1">
                  <li>• Facial depth and 3D structure analysis</li>
                  <li>• Natural skin texture and lighting detection</li>
                  <li>• Digital artifact and screen glare identification</li>
                  <li>• Micro-expression and eye authenticity verification</li>
                  <li>• Challenge response validation (blink, smile, head movement)</li>
                </ul>
              </div>
              
              <h4 className="font-medium mb-2 text-sm sm:text-base">Request Parameters:</h4>
              <div className="bg-gray-50 p-3 sm:p-4 rounded text-xs sm:text-sm mb-3 sm:mb-4">
                <pre className="overflow-x-auto">
{`verification_id: string (existing verification with document)
live_image_data: string (base64 encoded image)
challenge_response: string (optional - for challenge-based liveness)
metadata: object (optional)`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm sm:text-base">Example Request:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm mb-3 sm:mb-4">
                <pre className="overflow-x-auto">
{`curl -X POST ${apiUrl}/api/verify/live-capture \\
  -H "X-API-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "verification_id": "verif_abc123",
    "live_image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
    "challenge_response": "smile",
    "metadata": {"source": "web_app"}
  }'`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm sm:text-base">Response with Liveness Analysis:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm">
                <pre className="overflow-x-auto">
{`{
  "id": "verif_live123",
  "status": "verified",
  "type": "live_capture",
  "user_id": "user-123",
  "verification_id": "verif_abc123",
  
  // Liveness Detection Results
  "liveness_score": 0.94,           // 0-1 confidence this is a live person
  "liveness_details": {
    "blink_detection": 0.89,
    "head_movement": 0.91,
    "texture_analysis": 0.96,
    "challenge_passed": true
  },
  
  // Face Matching Results
  "face_match_score": 0.92,         // Similarity to document photo
  "face_detected": true,
  "multiple_faces": false,
  
  // Overall Assessment
  "confidence_score": 0.93,
  "manual_review_reason": null,
  "created_at": "2024-01-01T12:00:30Z"
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Live Token Generation */}
          <div className="mb-8 border border-gray-200 rounded-lg">
            <div className="bg-cyan-50 p-4 border-b">
              <h3 className="font-semibold text-lg">Generate Live Capture Token</h3>
              <code className="text-sm text-cyan-700">POST /api/verify/generate-live-token</code>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Generate a secure token and challenge for live capture verification session.
              </p>
              
              <h4 className="font-medium mb-2">Request Parameters:</h4>
              <div className="bg-gray-50 p-4 rounded text-sm mb-4">
                <pre className="overflow-x-auto">
{`verification_id: string (existing verification with document)
challenge_type: 'blink' | 'smile' | 'turn_head' | 'random' (optional)`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm sm:text-base">Response:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm">
                <pre className="overflow-x-auto">
{`{
  "token": "live_token_xyz789",
  "challenge": "smile",
  "expires_at": "2024-01-01T12:05:00Z",
  "instructions": "Please smile naturally for the camera"
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Complete Results */}
          <div className="mb-6 sm:mb-8 border border-gray-200 rounded-lg">
            <div className="bg-purple-50 p-3 sm:p-4 border-b">
              <h3 className="font-semibold text-base sm:text-lg">4. Get Complete Verification Results</h3>
              <code className="text-xs sm:text-sm text-purple-700 break-all">GET /api/verify/results/:verification_id</code>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
                Get comprehensive verification results including document analysis, live capture results, 
                and overall verification status. This is your one-stop endpoint for all verification data.
              </p>
              
              <h4 className="font-medium mb-2 text-sm sm:text-base">Example Request:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm mb-3 sm:mb-4">
                <pre className="overflow-x-auto">
{`curl -X GET ${apiUrl}/api/verify/results/verif_abc123 \\
  -H "X-API-Key: your-api-key"`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm sm:text-base">Enhanced Response with AI Features:</h4>
              <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded text-xs sm:text-sm">
                <pre className="overflow-x-auto">
{`{
  "verification_id": "verif_abc123",
  "user_id": "user_123",
  "status": "verified",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:05:30Z",
  
  // Front Document Results (AI-Powered OCR)
  "document_uploaded": true,
  "document_type": "drivers_license",
  "ocr_data": {
    "name": "John Doe",
    "date_of_birth": "1990-01-01",
    "document_number": "DL123456789",
    "expiration_date": "2030-01-01",
    "address": "123 Main St, Anytown, US",
    "ai_extraction_confidence": 0.96
  },
  "quality_analysis": {
    "overallQuality": "excellent",
    "isBlurry": false,
    "ai_authenticity_score": 0.94
  },
  
  // Back-of-ID Results (NEW - Enhanced Verification)
  "back_of_id_uploaded": true,
  "barcode_data": {
    "qr_code": "DL|123456789|DOE,JOHN|1990-01-01|...",
    "parsed_data": {
      "id_number": "DL123456789",
      "expiry_date": "2030-01-01",
      "issuing_authority": "Department of Motor Vehicles"
    },
    "verification_codes": ["VER123", "CHK456"],
    "security_features": ["Hologram detected", "UV pattern verified"]
  },
  "cross_validation_results": {
    "match_score": 0.98,
    "validation_results": {
      "id_number_match": true,
      "expiry_date_match": true,
      "overall_consistency": true
    },
    "discrepancies": []
  },
  "cross_validation_score": 0.98,
  "enhanced_verification_completed": true,
  
  // AI Live Capture Results  
  "live_capture_completed": true,
  "liveness_score": 0.96,
  "face_match_score": 0.94,
  
  // Overall Assessment
  "confidence_score": 0.93,
  "manual_review_reason": null,
  "next_steps": ["Verification complete"]
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Integration Options */}
        <section className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-4 sm:mb-6 flex items-center">
            <BoltIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 mr-2" />
            Integration Options
          </h2>
          
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-6 sm:mb-8">
            {/* Ready-Made Solution */}
            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4 sm:p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="text-2xl">🚀</div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-blue-900 mb-2">Ready-Made Verification Page</h3>
                  <p className="text-blue-800 text-sm mb-3">
                    <strong>Fastest Integration:</strong> Complete verification flow ready in minutes. 
                    Just provide your API key and user ID - we handle everything else.
                  </p>
                  <div className="space-y-2 text-xs text-blue-700 mb-4">
                    <div>✅ Complete UI with progress tracking</div>
                    <div>✅ Document upload & OCR processing</div>
                    <div>✅ Live camera capture with liveness detection</div>
                    <div>✅ Results display & custom redirects</div>
                    <div>✅ Light/dark theme support</div>
                    <div>✅ Mobile responsive design</div>
                  </div>
                  <div className="bg-blue-100 p-3 rounded mb-3">
                    <h4 className="font-semibold text-blue-900 mb-1">URL Integration:</h4>
                    <code className="text-xs text-blue-800 break-all">
                      /user-verification?api_key=your-key&user_id=user-123&redirect_url=https://yourapp.com/success
                    </code>
                  </div>
                  <a 
                    href="/user-verification?api_key=demo&user_id=demo-user" 
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded font-medium text-sm hover:bg-blue-700 transition-colors mr-3"
                    target="_blank"
                  >
                    Try Live Demo →
                  </a>
                  <a 
                    href="#ready-made-integration" 
                    className="inline-block bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded font-medium text-sm hover:bg-blue-50 transition-colors"
                  >
                    View Integration Guide →
                  </a>
                </div>
              </div>
            </div>

            {/* API Integration */}
            <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="text-2xl">⚙️</div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">Custom API Integration</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    Full control over the verification flow. Build your own UI using our comprehensive REST API.
                  </p>
                  <div className="space-y-2 text-xs text-gray-600 mb-4">
                    <div>✅ Complete API control</div>
                    <div>✅ Custom UI/UX design</div>
                    <div>✅ Advanced configuration options</div>
                    <div>✅ Webhook integrations</div>
                    <div>✅ SDK support (JS, Python)</div>
                    <div>✅ Enterprise features</div>
                  </div>
                  <a 
                    href="#complete-verification-flow" 
                    className="inline-block bg-gray-600 text-white px-4 py-2 rounded font-medium text-sm hover:bg-gray-700 transition-colors mr-3"
                  >
                    View API Docs →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ready-Made Integration Guide */}
        <section id="ready-made-integration" className="mb-8 sm:mb-10 scroll-mt-4">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-4 sm:mb-6 flex items-center">
            <div className="text-2xl mr-3">🚀</div>
            Ready-Made Integration Guide
          </h2>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-lg mb-6 border border-blue-200">
            <h3 className="font-bold text-lg text-blue-900 mb-2">Get Started in Under 5 Minutes</h3>
            <p className="text-blue-800 text-sm">
              Skip the complex API integration. Our ready-made verification page handles the entire flow - 
              from document upload to live capture to results display.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            {/* URL Method */}
            <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">1</span>
                URL Redirect Method
              </h3>
              <p className="text-gray-600 text-sm mb-4">Simply redirect users to our verification page with URL parameters.</p>
              
              <h4 className="font-medium mb-2 text-sm">Example URL:</h4>
              <div className="bg-gray-900 text-green-400 p-3 rounded text-xs mb-4 overflow-x-auto">
                <pre>
{`https://yourapp.com/user-verification?api_key=your-api-key&user_id=user-123&redirect_url=https://yourapp.com/success&theme=light`}
                </pre>
              </div>

              <h4 className="font-medium mb-2 text-sm">JavaScript Example:</h4>
              <div className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                <pre>
{`// Redirect user to verification
const verifyUrl = \`/user-verification?\${new URLSearchParams({
  api_key: 'your-api-key',
  user_id: currentUser.id,
  redirect_url: '/dashboard',
  theme: 'light'
}).toString()}\`;

window.location.href = verifyUrl;`}
                </pre>
              </div>
            </div>

            {/* Popup Method */}
            <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">2</span>
                Popup Window Method
              </h3>
              <p className="text-gray-600 text-sm mb-4">Open verification in a popup window for seamless user experience.</p>
              
              <h4 className="font-medium mb-2 text-sm">JavaScript Example:</h4>
              <div className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                <pre>
{`function openVerification() {
  const verifyUrl = \`/user-verification?\${new URLSearchParams({
    api_key: 'your-api-key',
    user_id: 'user-123'
  }).toString()}\`;
  
  const popup = window.open(
    verifyUrl,
    'verification',
    'width=500,height=700,scrollbars=yes'
  );
  
  // Listen for completion message
  window.addEventListener('message', (event) => {
    if (event.data.type === 'VERIFICATION_COMPLETE') {
      console.log('Result:', event.data.result);
      popup.close();
    }
  });
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Parameters Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold">URL Parameters</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Parameter</th>
                    <th className="px-4 py-2 text-left font-medium">Required</th>
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                    <th className="px-4 py-2 text-left font-medium">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2 font-mono text-xs">api_key</td>
                    <td className="px-4 py-2 text-red-600 font-medium">Required</td>
                    <td className="px-4 py-2">Your Idswyft API key</td>
                    <td className="px-4 py-2 font-mono text-xs">sk_test_123...</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-xs">user_id</td>
                    <td className="px-4 py-2 text-red-600 font-medium">Required</td>
                    <td className="px-4 py-2">Unique user identifier</td>
                    <td className="px-4 py-2 font-mono text-xs">user-123</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-xs">redirect_url</td>
                    <td className="px-4 py-2 text-gray-500">Optional</td>
                    <td className="px-4 py-2">Where to redirect after completion</td>
                    <td className="px-4 py-2 font-mono text-xs">https://yourapp.com/success</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-xs">theme</td>
                    <td className="px-4 py-2 text-gray-500">Optional</td>
                    <td className="px-4 py-2">UI theme (light or dark)</td>
                    <td className="px-4 py-2 font-mono text-xs">light</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Flow Steps */}
          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">What Happens During Verification:</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white p-3 rounded border">
                <div className="text-2xl mb-2">📄</div>
                <div className="font-medium text-sm">1. Document Upload</div>
                <div className="text-xs text-gray-600">User uploads ID document</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-2xl mb-2">⚙️</div>
                <div className="font-medium text-sm">2. AI Processing</div>
                <div className="text-xs text-gray-600">OCR extraction & quality analysis</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-2xl mb-2">📸</div>
                <div className="font-medium text-sm">3. Live Capture</div>
                <div className="text-xs text-gray-600">Camera selfie with liveness detection</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-2xl mb-2">✅</div>
                <div className="font-medium text-sm">4. Results</div>
                <div className="text-xs text-gray-600">Verification status & redirect</div>
              </div>
            </div>
          </div>
        </section>

        {/* SDKs Section */}
        <section className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-4 sm:mb-6 flex items-center">
            <CodeBracketIcon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500 mr-2" />
            Official SDKs
          </h2>
          
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-4 sm:mb-6">
            <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold text-base sm:text-lg mb-3">JavaScript/Node.js SDK</h3>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">Full TypeScript support with comprehensive type definitions</p>
              <div className="space-y-2 text-xs sm:text-sm">
                <div>📦 <code>npm install idswyft-sdk</code></div>
                <div>✅ Browser & Node.js compatible</div>
                <div>✅ Full TypeScript definitions</div>
                <div>✅ Comprehensive error handling</div>
                <div>✅ Webhook signature verification</div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold text-base sm:text-lg mb-3">Python SDK</h3>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">Python 3.8+ with full type hints and async support</p>
              <div className="space-y-2 text-xs sm:text-sm">
                <div>📦 <code>pip install idswyft</code></div>
                <div>✅ Python 3.8+ compatible</div>
                <div>✅ Full type hints</div>
                <div>✅ Context manager support</div>
                <div>✅ Framework examples (Django, FastAPI)</div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-3 sm:p-4 rounded-lg">
            <p className="text-indigo-800 text-sm sm:text-base">
              <strong>Both SDKs provide:</strong> Complete access to AI analysis results, automatic retry logic, 
              comprehensive error handling, and detailed documentation with real-world examples.
            </p>
          </div>
        </section>

        {/* AI Analysis Details */}
        <section className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-4 sm:mb-6 flex items-center">
            <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 mr-2" />
            AI Analysis Features
          </h2>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold text-base sm:text-lg mb-3 text-blue-600">OCR Extraction</h3>
              <ul className="text-xs sm:text-sm space-y-1 text-gray-600">
                <li>• Name extraction with confidence scores</li>
                <li>• Date of birth parsing</li>
                <li>• Document number recognition</li>
                <li>• Expiration date detection</li>
                <li>• Issuing authority identification</li>
                <li>• Address extraction (where applicable)</li>
                <li>• Per-field confidence scoring</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold text-base sm:text-lg mb-3 text-green-600">Quality Analysis</h3>
              <ul className="text-xs sm:text-sm space-y-1 text-gray-600">
                <li>• Blur detection and scoring</li>
                <li>• Brightness and contrast analysis</li>
                <li>• Resolution assessment</li>
                <li>• File size validation</li>
                <li>• Overall quality rating</li>
                <li>• Issue identification</li>
                <li>• Improvement recommendations</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold text-base sm:text-lg mb-3 text-purple-600">Face Matching & Live Capture</h3>
              <ul className="text-xs sm:text-sm space-y-1 text-gray-600">
                <li>• Facial similarity scoring (0-1)</li>
                <li>• Real-time camera capture</li>
                <li>• Advanced liveness detection</li>
                <li>• Challenge-response verification</li>
                <li>• Anti-spoofing measures</li>
                <li>• Photo quality assessment</li>
                <li>• Multiple face detection</li>
                <li>• Manual review triggers</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Verification Statuses */}
        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4">Verification Statuses</h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center flex-wrap">
              <span className="inline-flex px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full mr-2 sm:mr-3 mb-1 sm:mb-0">pending</span>
              <span className="text-gray-600 text-sm sm:text-base">Verification is being processed by our AI systems</span>
            </div>
            <div className="flex items-center flex-wrap">
              <span className="inline-flex px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-green-100 text-green-800 rounded-full mr-2 sm:mr-3 mb-1 sm:mb-0">verified</span>
              <span className="text-gray-600 text-sm sm:text-base">Identity successfully verified with high confidence</span>
            </div>
            <div className="flex items-center flex-wrap">
              <span className="inline-flex px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-red-100 text-red-800 rounded-full mr-2 sm:mr-3 mb-1 sm:mb-0">failed</span>
              <span className="text-gray-600 text-sm sm:text-base">Verification failed due to quality or authenticity issues</span>
            </div>
            <div className="flex items-center flex-wrap">
              <span className="inline-flex px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 rounded-full mr-2 sm:mr-3 mb-1 sm:mb-0">manual_review</span>
              <span className="text-gray-600 text-sm sm:text-base">Requires human review due to edge cases or low confidence</span>
            </div>
          </div>
        </section>

        {/* Rate Limits & Error Codes */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-8 sm:mb-10">
          <section>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4">Rate Limits</h2>
            <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
              <div className="text-xs sm:text-sm space-y-2">
                <div><strong>Sandbox:</strong> 100 requests/hour</div>
                <div><strong>Production:</strong> 1000 requests/hour</div>
                <div><strong>Enterprise:</strong> Custom limits available</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4">Status Codes</h2>
            <div className="space-y-2 text-xs sm:text-sm">
              <div><code className="text-green-600">200</code> - Success</div>
              <div><code className="text-yellow-600">400</code> - Bad Request (validation error)</div>
              <div><code className="text-red-600">401</code> - Unauthorized (invalid API key)</div>
              <div><code className="text-red-600">429</code> - Rate limit exceeded</div>
              <div><code className="text-red-600">500</code> - Server error</div>
            </div>
          </section>
        </div>

        {/* Support */}
        <section>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4">Support & Resources</h2>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Developer Portal</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-2">Get your API keys, view usage stats</p>
              <a href="/developer" className="text-blue-600 text-xs sm:text-sm underline">Access Portal →</a>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">GitHub Repository</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-2">Open source code, examples, issues</p>
              <a href="https://github.com/doobee46/idswyft" className="text-green-600 text-xs sm:text-sm underline" target="_blank" rel="noopener noreferrer">View on GitHub →</a>
            </div>
            <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Email Support</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-2">Technical support and questions</p>
              <a href="mailto:support@idswyft.com" className="text-purple-600 text-xs sm:text-sm underline">support@idswyft.com →</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};