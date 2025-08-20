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

async function testDocumentVerification(apiKey) {
  console.log('\n=== Testing Document Verification ===');
  try {
    // Update client with real API key if available
    if (apiKey && apiKey !== TEST_API_KEY) {
      client.config.apiKey = apiKey;
      client.client.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const testImageBuffer = createTestImageBuffer();
    
    const result = await client.verifyDocument({
      document_type: 'passport',
      document_file: testImageBuffer,
      user_id: 'test-user-123',
      metadata: {
        test: true,
        source: 'integration-test'
      }
    });
    
    console.log('✓ Document verification initiated');
    console.log('  Verification ID:', result.id);
    console.log('  Status:', result.status);
    console.log('  Type:', result.type);
    
    // Check for AI analysis results
    if (result.ocr_data) {
      console.log('✓ OCR data received');
      if (result.ocr_data.confidence_scores) {
        console.log('  OCR confidence scores:', result.ocr_data.confidence_scores);
      }
    }
    
    if (result.quality_analysis) {
      console.log('✓ Quality analysis received');
      console.log('  Overall quality:', result.quality_analysis.overallQuality);
    }
    
    return result;
    
  } catch (error) {
    console.error('✗ Document verification failed:', error.message);
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
  console.log('🧪 Starting Idswyft JavaScript SDK Integration Tests');
  console.log('================================================');
  
  const results = {
    healthCheck: false,
    developerRegistration: false,
    documentVerification: false,
    verificationStatus: false,
    listVerifications: false,
    usageStats: false,
    webhookVerification: false
  };
  
  let apiKey = TEST_API_KEY;
  let verificationId = null;
  
  try {
    // Test health check
    results.healthCheck = await testHealthCheck();
    
    // Test developer registration
    const registeredApiKey = await testDeveloperRegistration();
    if (registeredApiKey) {
      results.developerRegistration = true;
      apiKey = registeredApiKey;
    }
    
    // Test document verification
    const verification = await testDocumentVerification(apiKey);
    if (verification) {
      results.documentVerification = true;
      verificationId = verification.id;
    }
    
    // Test verification status check
    if (verificationId) {
      const statusResult = await testVerificationStatus(verificationId);
      if (statusResult) {
        results.verificationStatus = true;
      }
    }
    
    // Test list verifications
    const listResult = await testListVerifications();
    if (listResult) {
      results.listVerifications = true;
    }
    
    // Test usage stats
    const statsResult = await testUsageStats();
    if (statsResult) {
      results.usageStats = true;
    }
    
    // Test webhook signature verification
    results.webhookVerification = testWebhookSignatureVerification();
    
  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
  }
  
  // Print summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const testNames = {
    healthCheck: 'Health Check',
    developerRegistration: 'Developer Registration',
    documentVerification: 'Document Verification',
    verificationStatus: 'Verification Status',
    listVerifications: 'List Verifications',
    usageStats: 'Usage Statistics',
    webhookVerification: 'Webhook Verification'
  };
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testNames[test]}`);
  });
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All tests passed! SDK is working correctly.');
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