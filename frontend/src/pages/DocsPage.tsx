import React from 'react';

export const DocsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">API Documentation</h1>
        
        {/* Overview */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <p className="text-gray-700 mb-4">
            The Idswyft Identity Verification API provides secure, fast, and accurate identity verification 
            for your applications. Our API supports document verification, face recognition, and liveness detection.
          </p>
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-blue-800">
              <strong>Base URL:</strong> <code>http://localhost:3001</code>
            </p>
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
          <p className="text-gray-700 mb-4">
            All API requests require authentication using an API key. Include your API key in the request headers.
          </p>
          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="text-sm">
{`Headers:
X-API-Key: your-api-key-here
Content-Type: application/json`}
            </pre>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Endpoints</h2>
          
          {/* Health Check */}
          <div className="mb-6 border border-gray-200 rounded-md">
            <div className="bg-gray-50 p-4 border-b">
              <h3 className="font-semibold">Health Check</h3>
              <code className="text-sm text-green-600">GET /api/health</code>
            </div>
            <div className="p-4">
              <p className="text-gray-700 mb-2">Check if the API is running and healthy.</p>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <pre>
{`curl -X GET http://localhost:3001/api/health

Response:
{
  "status": "healthy",
  "timestamp": "2025-08-19T03:00:00.000Z",
  "version": "1.0.0",
  "environment": "development"
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Document Verification */}
          <div className="mb-6 border border-gray-200 rounded-md">
            <div className="bg-gray-50 p-4 border-b">
              <h3 className="font-semibold">Document Verification</h3>
              <code className="text-sm text-blue-600">POST /api/verify/document</code>
            </div>
            <div className="p-4">
              <p className="text-gray-700 mb-2">Upload and verify an identity document.</p>
              
              <h4 className="font-medium mb-2">Request Body:</h4>
              <div className="bg-gray-50 p-3 rounded text-sm mb-4">
                <pre>
{`{
  "user_id": "string (required)",
  "document_type": "passport|drivers_license|national_id"
}`}
                </pre>
              </div>

              <h4 className="font-medium mb-2">Example:</h4>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <pre>
{`curl -X POST http://localhost:3001/api/verify/document \\
  -H "X-API-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user-123",
    "document_type": "passport"
  }'

Response:
{
  "message": "Document verification initiated",
  "user_id": "user-123",
  "status": "pending",
  "verification_id": "verif-abc123"
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Selfie Verification */}
          <div className="mb-6 border border-gray-200 rounded-md">
            <div className="bg-gray-50 p-4 border-b">
              <h3 className="font-semibold">Selfie Verification</h3>
              <code className="text-sm text-blue-600">POST /api/verify/selfie</code>
            </div>
            <div className="p-4">
              <p className="text-gray-700 mb-2">Upload a selfie for face matching and liveness detection.</p>
              
              <h4 className="font-medium mb-2">Request Body:</h4>
              <div className="bg-gray-50 p-3 rounded text-sm mb-4">
                <pre>
{`{
  "user_id": "string (required)"
}`}
                </pre>
              </div>

              <h4 className="font-medium mb-2">Example:</h4>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <pre>
{`curl -X POST http://localhost:3001/api/verify/selfie \\
  -H "X-API-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user-123"
  }'

Response:
{
  "message": "Selfie verification initiated",
  "user_id": "user-123",
  "status": "pending",
  "verification_id": "selfie-xyz789"
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Status Check */}
          <div className="mb-6 border border-gray-200 rounded-md">
            <div className="bg-gray-50 p-4 border-b">
              <h3 className="font-semibold">Verification Status</h3>
              <code className="text-sm text-green-600">GET /api/verify/status/:user_id</code>
            </div>
            <div className="p-4">
              <p className="text-gray-700 mb-2">Check the verification status for a user.</p>
              
              <h4 className="font-medium mb-2">Example:</h4>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <pre>
{`curl -X GET http://localhost:3001/api/verify/status/user-123 \\
  -H "X-API-Key: your-api-key"

Response:
{
  "user_id": "user-123",
  "status": "verified",
  "verified_at": "2025-08-19T03:00:00.000Z",
  "document_verified": true,
  "selfie_verified": true,
  "confidence_score": 0.95
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Status Codes */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Status Codes</h2>
          <div className="space-y-2">
            <div><code className="text-green-600">200</code> - Success</div>
            <div><code className="text-yellow-600">400</code> - Bad Request</div>
            <div><code className="text-red-600">401</code> - Unauthorized (Invalid API Key)</div>
            <div><code className="text-red-600">404</code> - Not Found</div>
            <div><code className="text-red-600">429</code> - Rate Limit Exceeded</div>
            <div><code className="text-red-600">500</code> - Internal Server Error</div>
          </div>
        </section>

        {/* Verification Statuses */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Verification Statuses</h2>
          <div className="space-y-2">
            <div><code className="text-yellow-600">pending</code> - Verification in progress</div>
            <div><code className="text-green-600">verified</code> - Identity successfully verified</div>
            <div><code className="text-red-600">failed</code> - Verification failed</div>
            <div><code className="text-blue-600">manual_review</code> - Requires manual review</div>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Rate Limits</h2>
          <div className="bg-yellow-50 p-4 rounded-md">
            <p className="text-yellow-800">
              <strong>Default Limits:</strong> 1000 requests per hour per developer. 
              Contact support for higher limits in production.
            </p>
          </div>
        </section>

        {/* SDKs and Libraries */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">SDKs & Libraries</h2>
          <p className="text-gray-700 mb-4">
            Official SDKs and libraries are coming soon for:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>Node.js / JavaScript</li>
            <li>Python</li>
            <li>PHP</li>
            <li>Java</li>
            <li>Go</li>
          </ul>
        </section>

        {/* Support */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Support</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-gray-700">
              Need help? Contact our support team or check out the 
              <a href="/developer" className="text-blue-600 underline ml-1">Developer Portal</a> 
              for more resources.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};