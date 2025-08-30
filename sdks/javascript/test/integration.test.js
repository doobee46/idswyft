/**
 * Integration tests for Idswyft JavaScript SDK
 * Tests against actual running API server
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Import the SDK (assuming it's built)
const { IdswyftSDK, IdswyftError } = require('../dist/index.js');

// Test configuration
const API_BASE_URL = 'http://localhost:3001';
const TEST_API_KEY = 'test-api-key-12345';
const TEST_DEVELOPER_EMAIL = 'test@example.com';

// Create test client
const client = new IdswyftSDK({
  apiKey: TEST_API_KEY,
  baseURL: API_BASE_URL,
  sandbox: true
});

// Helper function to create a test image file
function createTestImageBuffer() {
  // Create a simple 100x100 pixel image buffer (PNG format)
  const width = 100;
  const height = 100;
  
  // Simple PNG header + minimal image data
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x0D, // Chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x64, // Width (100)
    0x00, 0x00, 0x00, 0x64, // Height (100) 
    0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
    0x4C, 0x5C, 0x6D, 0x7E  // CRC
  ]);
  
  // Simple IDAT chunk with minimal compressed data
  const idatChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x0C, // Chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x62, 0x00, 0x02, 0x00, 0x00, 0x05, 0x00, 0x01, // Compressed data
    0x0D, 0x0A, 0x2D, 0xB4  // CRC
  ]);
  
  // IEND chunk
  const iendChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x00, // Chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  try {
    const result = await client.healthCheck();
    console.log('✓ Health check passed:', result);
    return true;
  } catch (error) {
    console.error('✗ Health check failed:', error.message);
    return false;
  }
}

async function testDeveloperRegistration() {
  console.log('\n=== Testing Developer Registration ===');
  try {
    // First register a developer using direct API call
    const response = await axios.post(`${API_BASE_URL}/api/developer/register`, {
      email: TEST_DEVELOPER_EMAIL,
      name: 'Test Developer',
      company: 'Test Company'
    });
    
    console.log('✓ Developer registered:', response.data.developer.email);
    
    if (response.data.api_key) {
      console.log('✓ API key received:', response.data.api_key.key.substring(0, 10) + '...');
      return response.data.api_key.key;
    }
    
    return null;
  } catch (error) {
    if (error.response && error.response.status === 400 && 
        error.response.data.message.includes('already exists')) {
      console.log('✓ Developer already exists (expected)');
      // Try to get existing API key or use test key
      return TEST_API_KEY;
    }
    console.error('✗ Developer registration failed:', error.message);
    return null;
  }
}

async function testEnhancedVerificationFlow(apiKey) {
  console.log('\n=== Testing Enhanced Verification Flow ===');
  try {
    // Update client with real API key if available
    if (apiKey && apiKey !== TEST_API_KEY) {
      client.config.apiKey = apiKey;
      client.client.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Step 1: Start verification session
    console.log('Step 1: Starting verification session...');
    const session = await client.startVerification({
      user_id: 'test-user-123',
      sandbox: true
    });
    
    console.log('✓ Verification session started');
    console.log('  Verification ID:', session.verification_id);
    console.log('  Status:', session.status);
    console.log('  Next Steps:', session.next_steps);
    
    // Step 2: Upload front document
    console.log('\nStep 2: Uploading front document...');
    const testImageBuffer = createTestImageBuffer();
    
    const documentResult = await client.verifyDocument({
      verification_id: session.verification_id,
      document_type: 'drivers_license',
      document_file: testImageBuffer,
      metadata: {
        test: true,
        source: 'integration-test'
      }
    });
    
    console.log('✓ Front document uploaded');
    console.log('  Status:', documentResult.status);
    
    // Check for AI analysis results
    if (documentResult.ocr_data) {
      console.log('✓ OCR data received');
      if (documentResult.ocr_data.confidence_scores) {
        console.log('  OCR confidence scores:', documentResult.ocr_data.confidence_scores);
      }
    }
    
    if (documentResult.quality_analysis) {
      console.log('✓ Quality analysis received');
      console.log('  Overall quality:', documentResult.quality_analysis.overallQuality);
    }
    
    // Step 3: Upload back of ID (enhanced verification)
    console.log('\nStep 3: Uploading back of ID for enhanced verification...');
    const backResult = await client.verifyBackOfId({
      verification_id: session.verification_id,
      document_type: 'drivers_license',
      back_of_id_file: testImageBuffer // Using same buffer for test
    });
    
    console.log('✓ Back of ID uploaded');
    console.log('  Enhanced verification status:', backResult.status);
    if (backResult.enhanced_verification) {
      console.log('  Barcode scanning:', backResult.enhanced_verification.barcode_scanning_enabled);
      console.log('  Cross validation:', backResult.enhanced_verification.cross_validation_enabled);
    }
    
    // Step 4: Generate live token and perform live capture
    console.log('\nStep 4: Generating live capture token...');
    const liveToken = await client.generateLiveToken({
      verification_id: session.verification_id,
      challenge_type: 'smile'
    });
    
    console.log('✓ Live token generated');
    console.log('  Token:', liveToken.token.substring(0, 10) + '...');
    console.log('  Challenge:', liveToken.challenge);
    console.log('  Instructions:', liveToken.instructions);
    
    // Step 5: Perform live capture
    console.log('\nStep 5: Performing live capture...');
    // Create a simple base64 test image
    const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRP...'; // Truncated
    
    const liveResult = await client.liveCapture({
      verification_id: session.verification_id,
      live_image_data: base64Image,
      challenge_response: 'smile'
    });
    
    console.log('✓ Live capture completed');
    console.log('  Liveness score:', liveResult.liveness_score);
    console.log('  Face match score:', liveResult.face_match_score);
    console.log('  Overall confidence:', liveResult.confidence_score);
    
    // Step 6: Get comprehensive results
    console.log('\nStep 6: Getting comprehensive verification results...');
    const finalResults = await client.getVerificationResults(session.verification_id);
    
    console.log('✓ Comprehensive results retrieved');
    console.log('  Final status:', finalResults.status);
    console.log('  Document uploaded:', finalResults.document_uploaded);
    console.log('  Back of ID uploaded:', finalResults.back_of_id_uploaded);
    console.log('  Live capture completed:', finalResults.live_capture_completed);
    console.log('  Enhanced verification completed:', finalResults.enhanced_verification_completed);
    
    if (finalResults.cross_validation_results) {
      console.log('  Cross validation score:', finalResults.cross_validation_results.match_score);
    }
    
    return {
      session,
      documentResult,
      backResult,
      liveToken,
      liveResult,
      finalResults
    };
    
  } catch (error) {
    console.error('✗ Enhanced verification flow failed:', error.message);
    if (error instanceof IdswyftError) {
      console.error('  Status Code:', error.statusCode);
      console.error('  Error Code:', error.code);
    }
    return null;
  }
}

async function testVerificationStatus(verificationId) {
  console.log('\n=== Testing Verification Status Check ===');
  try {
    const result = await client.getVerificationStatus(verificationId);
    
    console.log('✓ Status check successful');
    console.log('  Verification ID:', result.id);
    console.log('  Current Status:', result.status);
    
    if (result.confidence_score !== undefined) {
      console.log('  Confidence Score:', result.confidence_score);
    }
    
    return result;
    
  } catch (error) {
    console.error('✗ Status check failed:', error.message);
    return null;
  }
}

async function testListVerifications() {
  console.log('\n=== Testing List Verifications ===');
  try {
    const result = await client.listVerifications({
      limit: 5
    });
    
    console.log('✓ List verifications successful');
    console.log('  Total verifications:', result.total);
    console.log('  Returned:', result.verifications.length);
    
    result.verifications.forEach((verification, index) => {
      console.log(`  ${index + 1}. ${verification.id} - ${verification.status}`);
    });
    
    return result;
    
  } catch (error) {
    console.error('✗ List verifications failed:', error.message);
    return null;
  }
}

async function testDeveloperManagement() {
  console.log('\n=== Testing Developer Management ===');
  try {
    // Test creating API key
    console.log('Creating new API key...');
    const apiKeyResult = await client.createApiKey({
      name: 'Test SDK Key',
      environment: 'sandbox'
    });
    
    console.log('✓ API key created');
    console.log('  Key ID:', apiKeyResult.key_id);
    console.log('  Key preview:', apiKeyResult.api_key.substring(0, 10) + '...');
    
    // Test listing API keys
    console.log('\nListing API keys...');
    const apiKeysList = await client.listApiKeys();
    
    console.log('✓ API keys listed');
    console.log('  Total keys:', apiKeysList.api_keys.length);
    apiKeysList.api_keys.forEach((key, index) => {
      console.log(`  ${index + 1}. ${key.name} (${key.environment}) - ${key.is_active ? 'Active' : 'Inactive'}`);
    });
    
    // Test getting API activity
    console.log('\nGetting API activity...');
    const activityResult = await client.getApiActivity({
      limit: 5
    });
    
    console.log('✓ API activity retrieved');
    console.log('  Total activities:', activityResult.total);
    console.log('  Recent activities:', activityResult.activities.length);
    
    return {
      apiKeyResult,
      apiKeysList,
      activityResult
    };
    
  } catch (error) {
    console.error('✗ Developer management failed:', error.message);
    return null;
  }
}

async function testWebhookManagement() {
  console.log('\n=== Testing Webhook Management ===');
  try {
    // Test registering webhook
    console.log('Registering webhook...');
    const webhookResult = await client.registerWebhook({
      url: 'https://example.com/webhook',
      events: ['verification.completed', 'verification.failed'],
      secret: 'test-webhook-secret'
    });
    
    console.log('✓ Webhook registered');
    console.log('  Webhook ID:', webhookResult.webhook.id);
    console.log('  URL:', webhookResult.webhook.url);
    console.log('  Events:', webhookResult.webhook.events);
    
    const webhookId = webhookResult.webhook.id;
    
    // Test listing webhooks
    console.log('\nListing webhooks...');
    const webhooksList = await client.listWebhooks();
    
    console.log('✓ Webhooks listed');
    console.log('  Total webhooks:', webhooksList.webhooks.length);
    webhooksList.webhooks.forEach((webhook, index) => {
      console.log(`  ${index + 1}. ${webhook.url} - ${webhook.is_active ? 'Active' : 'Inactive'}`);
    });
    
    // Test webhook delivery
    console.log('\nTesting webhook delivery...');
    const testResult = await client.testWebhook(webhookId);
    
    console.log('✓ Webhook test initiated');
    console.log('  Delivery ID:', testResult.delivery_id);
    console.log('  Success:', testResult.success);
    
    // Test updating webhook
    console.log('\nUpdating webhook...');
    const updateResult = await client.updateWebhook(webhookId, {
      events: ['verification.completed'] // Reduce to one event
    });
    
    console.log('✓ Webhook updated');
    console.log('  Updated events:', updateResult.webhook.events);
    
    return {
      webhookResult,
      webhooksList,
      testResult,
      updateResult
    };
    
  } catch (error) {
    console.error('✗ Webhook management failed:', error.message);
    return null;
  }
}

async function testUsageStats() {
  console.log('\n=== Testing Usage Statistics ===');
  try {
    const result = await client.getUsageStats();
    
    console.log('✓ Usage stats retrieved');
    console.log('  Total requests:', result.total_requests);
    console.log('  Success rate:', result.success_rate);
    console.log('  Remaining quota:', result.remaining_quota);
    
    return result;
    
  } catch (error) {
    console.error('✗ Usage stats failed:', error.message);
    return null;
  }
}

async function testWebhookSignatureVerification() {
  console.log('\n=== Testing Webhook Signature Verification ===');
  
  const payload = '{"verification_id":"test-123","status":"verified"}';
  const secret = 'test-webhook-secret';
  
  // Test with valid signature (we'll create one)
  const crypto = require('crypto');
  const validSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  const isValid = client.constructor.verifyWebhookSignature(payload, validSignature, secret);
  
  if (isValid) {
    console.log('✓ Webhook signature verification works correctly');
  } else {
    console.log('✗ Webhook signature verification failed');
  }
  
  // Test with invalid signature
  const isInvalid = client.constructor.verifyWebhookSignature(payload, 'invalid-signature', secret);
  
  if (!isInvalid) {
    console.log('✓ Webhook signature correctly rejects invalid signatures');
  } else {
    console.log('✗ Webhook signature incorrectly accepts invalid signatures');
  }
  
  return isValid && !isInvalid;
}

async function runAllTests() {
  console.log('🧪 Starting Idswyft JavaScript SDK Integration Tests (Enhanced)');
  console.log('===============================================================');
  
  const results = {
    healthCheck: false,
    developerRegistration: false,
    enhancedVerificationFlow: false,
    verificationHistory: false,
    developerManagement: false,
    webhookManagement: false,
    usageStats: false,
    webhookVerification: false
  };
  
  let apiKey = TEST_API_KEY;
  let verificationSession = null;
  
  try {
    // Test health check
    results.healthCheck = await testHealthCheck();
    
    // Test developer registration
    const registeredApiKey = await testDeveloperRegistration();
    if (registeredApiKey) {
      results.developerRegistration = true;
      apiKey = registeredApiKey;
    }
    
    // Test enhanced verification flow (replaces old document verification)
    const verificationFlow = await testEnhancedVerificationFlow(apiKey);
    if (verificationFlow && verificationFlow.finalResults) {
      results.enhancedVerificationFlow = true;
      verificationSession = verificationFlow.session;
    }
    
    // Test verification history
    if (verificationSession) {
      console.log('\n=== Testing Verification History ===');
      try {
        const historyResult = await client.getVerificationHistory(verificationSession.user_id, {
          limit: 5
        });
        
        console.log('✓ Verification history retrieved');
        console.log('  Total verifications:', historyResult.total);
        console.log('  Recent verifications:', historyResult.verifications.length);
        
        results.verificationHistory = true;
      } catch (error) {
        console.error('✗ Verification history failed:', error.message);
      }
    }
    
    // Test developer management features
    const devManagementResult = await testDeveloperManagement();
    if (devManagementResult) {
      results.developerManagement = true;
    }
    
    // Test webhook management features
    const webhookResult = await testWebhookManagement();
    if (webhookResult) {
      results.webhookManagement = true;
    }
    
    // Test usage stats
    const statsResult = await testUsageStats();
    if (statsResult) {
      results.usageStats = true;
    }
    
    // Test webhook signature verification
    results.webhookVerification = await testWebhookSignatureVerification();
    
  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
  }
  
  // Print summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const testNames = {
    healthCheck: 'Health Check',
    developerRegistration: 'Developer Registration',
    enhancedVerificationFlow: 'Enhanced Verification Flow (6 steps)',
    verificationHistory: 'Verification History',
    developerManagement: 'Developer Management (API Keys, Activity)',
    webhookManagement: 'Webhook Management (CRUD, Testing)',
    usageStats: 'Usage Statistics',
    webhookVerification: 'Webhook Signature Verification'
  };
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testNames[test]}`);
  });
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All tests passed! Enhanced SDK is working correctly.');
    console.log('✨ Ready for production deployment!');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testHealthCheck,
  testDocumentVerification,
  testVerificationStatus,
  testListVerifications,
  testUsageStats
};