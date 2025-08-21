import { 
  DocumentCheckIcon, 
  CameraIcon,
  CodeBracketIcon,
  BoltIcon,
  ChartBarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { getDocumentationApiUrl } from '../config/api';

export const DocsPage: React.FC = () => {
  const apiUrl = getDocumentationApiUrl();
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">API Documentation</h1>
          <p className="text-xl text-gray-600">
            Complete guide to the Idswyft Identity Verification API with AI-powered analysis
          </p>
        </div>
        
        {/* Quick Start */}
        <section className="mb-10">
          <h2 className="text-3xl font-semibold mb-6 flex items-center">
            <BoltIcon className="h-8 w-8 text-yellow-500 mr-2" />
            Quick Start
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">JavaScript/TypeScript</h3>
              <pre className="text-sm bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`npm install @idswyft/sdk

import { IdswyftSDK } from '@idswyft/sdk';

const client = new IdswyftSDK({
  apiKey: 'your-api-key',
  sandbox: true
});

const result = await client.verifyDocument({
  document_type: 'passport',
  document_file: file,
  user_id: 'user-123'
});

console.log(result.ocr_data); // AI analysis
console.log(result.quality_analysis);`}
              </pre>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Python</h3>
              <pre className="text-sm bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`pip install idswyft

import idswyft

client = idswyft.IdswyftClient(
    api_key='your-api-key',
    sandbox=True
)

result = client.verify_document(
    document_type='passport',
    document_file='passport.jpg',
    user_id='user-123'
)

print(result['ocr_data'])  # AI analysis
print(result['quality_analysis'])`}
              </pre>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-10">
          <h2 className="text-3xl font-semibold mb-6 flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-blue-500 mr-2" />
            Authentication
          </h2>
          <div className="bg-blue-50 p-6 rounded-lg mb-4">
            <p className="text-blue-800 mb-3">
              <strong>Base URL:</strong> <code className="bg-blue-100 px-2 py-1 rounded">{apiUrl}</code>
            </p>
            <p className="text-blue-800">
              <strong>Authentication:</strong> Include <code className="bg-blue-100 px-2 py-1 rounded">X-API-Key</code> header with your API key
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="text-sm">
{`Headers:
X-API-Key: your-api-key-here
Content-Type: multipart/form-data (for file uploads)
Content-Type: application/json (for other requests)`}
            </pre>
          </div>
        </section>

        {/* Core Endpoints */}
        <section className="mb-10">
          <h2 className="text-3xl font-semibold mb-6 flex items-center">
            <DocumentCheckIcon className="h-8 w-8 text-green-500 mr-2" />
            Complete Verification Flow
          </h2>
          
          <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">🔄 New Cohesive API Flow</h4>
            <p className="text-blue-800 text-sm">
              Our verification API now follows a session-based approach where you start a verification, 
              upload documents, perform live capture, and get unified results.
            </p>
          </div>

          {/* Start Verification */}
          <div className="mb-8 border border-gray-200 rounded-lg">
            <div className="bg-blue-50 p-4 border-b">
              <h3 className="font-semibold text-lg">1. Start Verification Session</h3>
              <code className="text-sm text-blue-700">POST /api/verify/start</code>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Initialize a new verification session for a user. This creates a unique verification ID 
                that will be used for all subsequent operations.
              </p>
              
              <h4 className="font-medium mb-2">Request Parameters:</h4>
              <div className="bg-gray-50 p-4 rounded text-sm mb-4">
                <pre>
{`user_id: string (UUID - unique identifier for the user)
sandbox: boolean (optional - defaults to false)`}
                </pre>
              </div>

              <h4 className="font-medium mb-2">Example Request:</h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded text-sm mb-4">
                <pre>
{`curl -X POST ${apiUrl}/api/verify/start \\
  -H "X-API-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user_123"
  }'`}
                </pre>
              </div>

              <h4 className="font-medium mb-2">Response:</h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded text-sm">
                <pre>
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
          <div className="mb-8 border border-gray-200 rounded-lg">
            <div className="bg-green-50 p-4 border-b">
              <h3 className="font-semibold text-lg">2. Upload Document to Verification</h3>
              <code className="text-sm text-green-700">POST /api/verify/document</code>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Upload an identity document to an existing verification session. This performs OCR extraction, 
                quality assessment, and authenticity checks.
              </p>
              
              <h4 className="font-medium mb-2">Request Parameters:</h4>
              <div className="bg-gray-50 p-4 rounded text-sm mb-4">
                <pre>
{`verification_id: string (UUID from step 1)
document_type: 'passport' | 'drivers_license' | 'national_id' | 'other'
document: File (image/jpeg, image/png, image/webp, application/pdf)
metadata: object (optional)`}
                </pre>
              </div>

              <h4 className="font-medium mb-2">Example Request:</h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded text-sm mb-4">
                <pre>
{`curl -X POST ${apiUrl}/api/verify/document \\
  -H "X-API-Key: your-api-key" \\
  -F "verification_id=verif_abc123" \\
  -F "document_type=passport" \\
  -F "document=@passport.jpg"`}
                </pre>
              </div>

              <h4 className="font-medium mb-2">Response with AI Analysis:</h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded text-sm">
                <pre>
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

          {/* Selfie Verification */}
          <div className="mb-8 border border-gray-200 rounded-lg">
            <div className="bg-purple-50 p-4 border-b">
              <h3 className="font-semibold text-lg">Selfie Verification with Face Matching</h3>
              <code className="text-sm text-purple-700">POST /api/verify/selfie</code>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Upload a selfie for face matching against document photos and liveness detection.
              </p>
              
              <h4 className="font-medium mb-2">Request Parameters:</h4>
              <div className="bg-gray-50 p-4 rounded text-sm mb-4">
                <pre>
{`selfie: File (image/jpeg, image/png, image/webp)
reference_document_id: string (optional - document to match against)
user_id: string (optional)
webhook_url: string (optional)
metadata: object (optional)`}
                </pre>
              </div>

              <h4 className="font-medium mb-2">Response with Face Matching:</h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded text-sm">
                <pre>
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
          <div className="mb-8 border border-gray-200 rounded-lg">
            <div className="bg-orange-50 p-4 border-b">
              <h3 className="font-semibold text-lg">3. Live Camera Capture with Liveness Detection</h3>
              <code className="text-sm text-orange-700">POST /api/verify/live-capture</code>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Perform real-time camera capture for an existing verification session. This includes advanced 
                liveness detection, challenge-response verification, and instant face matching against the uploaded document.
              </p>
              
              <h4 className="font-medium mb-2">Request Parameters:</h4>
              <div className="bg-gray-50 p-4 rounded text-sm mb-4">
                <pre>
{`verification_id: string (existing verification with document)
live_image_data: string (base64 encoded image)
challenge_response: string (optional - for challenge-based liveness)
metadata: object (optional)`}
                </pre>
              </div>

              <h4 className="font-medium mb-2">Example Request:</h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded text-sm mb-4">
                <pre>
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

              <h4 className="font-medium mb-2">Response with Liveness Analysis:</h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded text-sm">
                <pre>
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
                <pre>
{`verification_id: string (existing verification with document)
challenge_type: 'blink' | 'smile' | 'turn_head' | 'random' (optional)`}
                </pre>
              </div>

              <h4 className="font-medium mb-2">Response:</h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded text-sm">
                <pre>
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
          <div className="mb-8 border border-gray-200 rounded-lg">
            <div className="bg-purple-50 p-4 border-b">
              <h3 className="font-semibold text-lg">4. Get Complete Verification Results</h3>
              <code className="text-sm text-purple-700">GET /api/verify/results/:verification_id</code>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Get comprehensive verification results including document analysis, live capture results, 
                and overall verification status. This is your one-stop endpoint for all verification data.
              </p>
              
              <h4 className="font-medium mb-2">Example Request:</h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded text-sm mb-4">
                <pre>
{`curl -X GET ${apiUrl}/api/verify/results/verif_abc123 \\
  -H "X-API-Key: your-api-key"`}
                </pre>
              </div>

              <h4 className="font-medium mb-2">Complete Response:</h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded text-sm">
                <pre>
{`{
  "verification_id": "verif_abc123",
  "user_id": "user_123",
  "status": "verified",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:05:30Z",
  
  // Document Results
  "document_uploaded": true,
  "document_type": "passport",
  "ocr_data": {
    "name": "John Doe",
    "date_of_birth": "1990-01-01",
    "document_number": "P123456789",
    "expiration_date": "2030-01-01",
    "nationality": "US"
  },
  "quality_analysis": {
    "overallQuality": "excellent",
    "isBlurry": false,
    "blurScore": 342.5,
    "brightness": 128,
    "resolution": {"width": 1920, "height": 1080}
  },
  
  // Live Capture Results
  "live_capture_completed": true,
  "liveness_score": 0.94,
  "face_match_score": 0.92,
  
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

        {/* SDKs Section */}
        <section className="mb-10">
          <h2 className="text-3xl font-semibent mb-6 flex items-center">
            <CodeBracketIcon className="h-8 w-8 text-indigo-500 mr-2" />
            Official SDKs
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3">JavaScript/Node.js SDK</h3>
              <p className="text-gray-600 mb-4">Full TypeScript support with comprehensive type definitions</p>
              <div className="space-y-2 text-sm">
                <div>📦 <code>npm install @idswyft/sdk</code></div>
                <div>✅ Browser & Node.js compatible</div>
                <div>✅ Full TypeScript definitions</div>
                <div>✅ Comprehensive error handling</div>
                <div>✅ Webhook signature verification</div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3">Python SDK</h3>
              <p className="text-gray-600 mb-4">Python 3.8+ with full type hints and async support</p>
              <div className="space-y-2 text-sm">
                <div>📦 <code>pip install idswyft</code></div>
                <div>✅ Python 3.8+ compatible</div>
                <div>✅ Full type hints</div>
                <div>✅ Context manager support</div>
                <div>✅ Framework examples (Django, FastAPI)</div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-indigo-800">
              <strong>Both SDKs provide:</strong> Complete access to AI analysis results, automatic retry logic, 
              comprehensive error handling, and detailed documentation with real-world examples.
            </p>
          </div>
        </section>

        {/* AI Analysis Details */}
        <section className="mb-10">
          <h2 className="text-3xl font-semibold mb-6 flex items-center">
            <ChartBarIcon className="h-8 w-8 text-orange-500 mr-2" />
            AI Analysis Features
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3 text-blue-600">OCR Extraction</h3>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Name extraction with confidence scores</li>
                <li>• Date of birth parsing</li>
                <li>• Document number recognition</li>
                <li>• Expiration date detection</li>
                <li>• Issuing authority identification</li>
                <li>• Address extraction (where applicable)</li>
                <li>• Per-field confidence scoring</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3 text-green-600">Quality Analysis</h3>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Blur detection and scoring</li>
                <li>• Brightness and contrast analysis</li>
                <li>• Resolution assessment</li>
                <li>• File size validation</li>
                <li>• Overall quality rating</li>
                <li>• Issue identification</li>
                <li>• Improvement recommendations</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3 text-purple-600">Face Matching & Live Capture</h3>
              <ul className="text-sm space-y-1 text-gray-600">
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
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Verification Statuses</h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="inline-flex px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full mr-3">pending</span>
              <span className="text-gray-600">Verification is being processed by our AI systems</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full mr-3">verified</span>
              <span className="text-gray-600">Identity successfully verified with high confidence</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full mr-3">failed</span>
              <span className="text-gray-600">Verification failed due to quality or authenticity issues</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full mr-3">manual_review</span>
              <span className="text-gray-600">Requires human review due to edge cases or low confidence</span>
            </div>
          </div>
        </section>

        {/* Rate Limits & Error Codes */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Rate Limits</h2>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm space-y-2">
                <div><strong>Sandbox:</strong> 100 requests/hour</div>
                <div><strong>Production:</strong> 1000 requests/hour</div>
                <div><strong>Enterprise:</strong> Custom limits available</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibent mb-4">Status Codes</h2>
            <div className="space-y-2 text-sm">
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
          <h2 className="text-2xl font-semibold mb-4">Support & Resources</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Developer Portal</h3>
              <p className="text-sm text-gray-600 mb-2">Get your API keys, view usage stats</p>
              <a href="/developer" className="text-blue-600 text-sm underline">Access Portal →</a>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">GitHub Repository</h3>
              <p className="text-sm text-gray-600 mb-2">Open source code, examples, issues</p>
              <a href="https://github.com/doobee46/idswyft" className="text-green-600 text-sm underline" target="_blank" rel="noopener noreferrer">View on GitHub →</a>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibent mb-2">Email Support</h3>
              <p className="text-sm text-gray-600 mb-2">Technical support and questions</p>
              <a href="mailto:support@idswyft.com" className="text-purple-600 text-sm underline">support@idswyft.com →</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};