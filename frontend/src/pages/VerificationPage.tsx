import React, { useState } from 'react';

interface VerificationResult {
  verification_id: string;
  status: string;
  user_id: string;
  message: string;
}

export const VerificationPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [userId, setUserId] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleDocumentVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !userId || !documentFile) {
      alert('Please provide API key, user ID, and document file');
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      formData.append('user_id', userId);
      formData.append('document_type', 'passport');
      
      const response = await fetch('http://localhost:3001/api/verify/document', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
        },
        body: formData,
      });
      
      const data = await response.json();
      setVerificationResult(data);
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult({
        verification_id: 'error',
        status: 'failed',
        user_id: userId,
        message: 'Verification request failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelfieVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !verificationResult?.verification_id || !selfieFile) {
      alert('Please complete document verification first and provide selfie file');
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('selfie', selfieFile);
      formData.append('verification_id', verificationResult.verification_id);
      
      const response = await fetch('http://localhost:3001/api/verify/selfie', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
        },
        body: formData,
      });
      
      const data = await response.json();
      setVerificationResult(data);
    } catch (error) {
      console.error('Selfie verification failed:', error);
      setVerificationResult({
        verification_id: 'error',
        status: 'failed',
        user_id: userId,
        message: 'Selfie verification request failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkVerificationStatus = async () => {
    if (!apiKey || !userId) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/verify/status/${userId}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
      
      const data = await response.json();
      setVerificationResult(data);
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Identity Verification</h1>
        
        {/* API Configuration */}
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h2 className="text-lg font-semibold mb-4">API Configuration</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID (UUID format)"
                  className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setUserId(generateUUID())}
                  className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click "Generate" to create a unique user ID or enter your own UUID
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Document Verification */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Document Verification</h2>
            <form onSubmit={handleDocumentVerification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Document
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported: JPG, PNG, PDF (Passport, Driver's License, National ID)
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading || !apiKey || !userId}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition duration-200"
              >
                {loading ? 'Processing...' : 'Verify Document'}
              </button>
            </form>
          </div>

          {/* Selfie Verification */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Selfie Verification</h2>
            <form onSubmit={handleSelfieVerification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Selfie
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Take a clear selfie for face matching and liveness detection
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading || !apiKey || !userId}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition duration-200"
              >
                {loading ? 'Processing...' : 'Verify Selfie'}
              </button>
            </form>
          </div>
        </div>

        {/* Status Check */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={checkVerificationStatus}
            disabled={!apiKey || !userId}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-400 transition duration-200"
          >
            Check Verification Status
          </button>
        </div>

        {/* Results */}
        {verificationResult && (
          <div className="mt-6 p-4 border rounded-md">
            <h3 className="font-semibold mb-2">Verification Result</h3>
            <div className="bg-gray-50 p-4 rounded text-sm">
              <pre>{JSON.stringify(verificationResult, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 p-4 rounded-md">
          <h3 className="font-semibold text-blue-900 mb-2">How it Works</h3>
          <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
            <li>Enter your API key (get one from the <a href="/developer" className="underline">Developer Portal</a>)</li>
            <li>Generate a unique user ID or enter your own UUID</li>
            <li>Upload a document file and click "Verify Document"</li>
            <li>Upload a selfie file and click "Verify Selfie" (requires completed document verification)</li>
            <li>Check the verification status to see final results</li>
          </ol>
        </div>
      </div>
    </div>
  );
};