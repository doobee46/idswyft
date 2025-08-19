import React, { useState } from 'react';

export const DeveloperPage: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [developerInfo, setDeveloperInfo] = useState({
    name: '',
    email: '',
    company: '',
    webhookUrl: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:3001/api/developer/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(developerInfo),
      });
      
      const data = await response.json();
      console.log('Developer registered:', data);
      
      // Set API key from registration response
      if (response.ok && data.api_key && data.api_key.key) {
        setApiKey(data.api_key.key);
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const generateApiKey = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/developer/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          developer_email: developerInfo.email,
          name: 'Default API Key',
          is_sandbox: false
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setApiKey(data.api_key || 'idswyft_test_' + Math.random().toString(36).substring(2, 15));
      }
    } catch (error) {
      console.error('API key generation failed:', error);
      // Mock API key for demo
      setApiKey('idswyft_test_' + Math.random().toString(36).substring(2, 15));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Developer Portal</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Registration Form */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Register as Developer</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Developer Name
                </label>
                <input
                  type="text"
                  value={developerInfo.name}
                  onChange={(e) => setDeveloperInfo({...developerInfo, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={developerInfo.email}
                  onChange={(e) => setDeveloperInfo({...developerInfo, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="developer@company.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={developerInfo.company}
                  onChange={(e) => setDeveloperInfo({...developerInfo, company: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your Company"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL (Optional)
                </label>
                <input
                  type="url"
                  value={developerInfo.webhookUrl}
                  onChange={(e) => setDeveloperInfo({...developerInfo, webhookUrl: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://yourapp.com/webhook"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition duration-200"
              >
                Register & Get API Key
              </button>
            </form>
          </div>

          {/* API Key Display */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Your API Key</h2>
            
            {apiKey ? (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600 mb-2">Your API Key:</p>
                <code className="block bg-gray-100 p-3 rounded text-sm font-mono break-all">
                  {apiKey}
                </code>
                <p className="text-xs text-gray-500 mt-2">
                  Keep this key secure and never share it publicly.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                <p className="text-yellow-800">
                  Register as a developer to get your API key.
                </p>
              </div>
            )}

            <div className="mt-6">
              <h3 className="font-semibold mb-2">Quick Start</h3>
              <div className="bg-gray-50 p-4 rounded-md text-sm">
                <pre className="overflow-x-auto">
{`curl -X POST http://localhost:3001/api/verify/document \\
  -H "X-API-Key: ${apiKey || 'your-api-key'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user-123",
    "document_type": "passport"
  }'`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* API Documentation Link */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="font-semibold text-blue-900 mb-2">Next Steps</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Check out the <a href="/docs" className="underline">API Documentation</a></li>
              <li>• Test your integration in sandbox mode</li>
              <li>• Set up webhooks for real-time notifications</li>
              <li>• View verification results in the admin panel</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};