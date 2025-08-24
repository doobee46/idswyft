// Quick test script to verify sandbox API key works
const API_BASE_URL = 'http://localhost:3001';

async function testSandboxKey(apiKey) {
  console.log('Testing API Key:', apiKey.substring(0, 10) + '...');
  
  try {
    // Test 1: Start verification with sandbox mode
    const verifyResponse = await fetch(`${API_BASE_URL}/api/verify/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        user_id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID format
        sandbox: true // Explicitly set sandbox mode
      }),
    });
    
    console.log('Verification start response status:', verifyResponse.status);
    
    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      console.error('Verification start failed:', error);
      return;
    }
    
    const verifyData = await verifyResponse.json();
    console.log('Verification started successfully:', verifyData);
    
    // Test 2: Try live capture with the verification ID
    const liveResponse = await fetch(`${API_BASE_URL}/api/verify/live-capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        verification_id: verifyData.verification_id,
        live_image_data: 'dGVzdA==', // base64 encoded "test"
        challenge_response: 'blink_twice',
        sandbox: true
      }),
    });
    
    console.log('Live capture response status:', liveResponse.status);
    
    if (!liveResponse.ok) {
      const error = await liveResponse.json();
      console.error('Live capture failed:', error);
    } else {
      const liveData = await liveResponse.json();
      console.log('Live capture successful:', liveData);
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Replace with your actual sandbox API key
const SANDBOX_API_KEY = 'ik_3d519d4fc8a75a7b4090c2b58fd49c6f2aee2db9dd0b222ac498582d299b7f51';

testSandboxKey(SANDBOX_API_KEY);