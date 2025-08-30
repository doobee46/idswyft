#!/usr/bin/env python3
"""
Integration tests for Idswyft Python SDK
Tests against actual running API server
"""

import os
import sys
import base64
import asyncio
from typing import Dict, Any, Optional

# Add parent directory to path so we can import the SDK
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import idswyft
from idswyft import IdswyftClient
from idswyft.exceptions import IdswyftError, IdswyftAPIError

# Test configuration
API_BASE_URL = 'http://localhost:3001'
TEST_API_KEY = 'test-api-key-12345'
TEST_DEVELOPER_EMAIL = 'test@example.com'

def create_test_image_bytes():
    """Create a simple test image as bytes"""
    # Create minimal PNG file (1x1 pixel transparent PNG)
    png_data = base64.b64decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    )
    return png_data

def test_health_check():
    """Test API health check"""
    print('\n=== Testing Health Check ===')
    
    client = IdswyftClient(
        api_key=TEST_API_KEY,
        base_url=API_BASE_URL,
        sandbox=True
    )
    
    try:
        result = client.health_check()
        print('✓ Health check passed:', result)
        return True
    except Exception as error:
        print('✗ Health check failed:', str(error))
        return False

def test_enhanced_verification_flow():
    """Test the complete enhanced verification flow"""
    print('\n=== Testing Enhanced Verification Flow ===')
    
    client = IdswyftClient(
        api_key=TEST_API_KEY,
        base_url=API_BASE_URL,
        sandbox=True
    )
    
    try:
        # Step 1: Start verification session
        print('Step 1: Starting verification session...')
        session = client.start_verification(
            user_id='test-user-123',
            sandbox=True
        )
        
        print('✓ Verification session started')
        print('  Verification ID:', session['verification_id'])
        print('  Status:', session['status'])
        print('  Next Steps:', session['next_steps'])
        
        verification_id = session['verification_id']
        
        # Step 2: Upload front document
        print('\nStep 2: Uploading front document...')
        test_image = create_test_image_bytes()
        
        document_result = client.verify_document(
            verification_id=verification_id,
            document_type='drivers_license',
            document_file=test_image,
            metadata={
                'test': True,
                'source': 'python-integration-test'
            }
        )
        
        print('✓ Front document uploaded')
        print('  Status:', document_result['status'])
        
        # Check for AI analysis results
        if document_result.get('ocr_data'):
            print('✓ OCR data received')
            if document_result['ocr_data'].get('confidence_scores'):
                print('  OCR confidence scores:', document_result['ocr_data']['confidence_scores'])
        
        if document_result.get('quality_analysis'):
            print('✓ Quality analysis received')
            print('  Overall quality:', document_result['quality_analysis']['overallQuality'])
        
        # Step 3: Upload back of ID (enhanced verification)
        print('\nStep 3: Uploading back of ID for enhanced verification...')
        back_result = client.verify_back_of_id(
            verification_id=verification_id,
            document_type='drivers_license',
            back_of_id_file=test_image  # Using same bytes for test
        )
        
        print('✓ Back of ID uploaded')
        print('  Enhanced verification status:', back_result.get('status'))
        if back_result.get('enhanced_verification'):
            print('  Barcode scanning:', back_result['enhanced_verification'].get('barcode_scanning_enabled'))
            print('  Cross validation:', back_result['enhanced_verification'].get('cross_validation_enabled'))
        
        # Step 4: Generate live token
        print('\nStep 4: Generating live capture token...')
        live_token = client.generate_live_token(
            verification_id=verification_id,
            challenge_type='smile'
        )
        
        print('✓ Live token generated')
        print('  Token:', live_token['token'][:10] + '...')
        print('  Challenge:', live_token['challenge'])
        print('  Instructions:', live_token['instructions'])
        
        # Step 5: Perform live capture
        print('\nStep 5: Performing live capture...')
        # Create base64 encoded test image
        base64_image = base64.b64encode(test_image).decode('utf-8')
        
        live_result = client.live_capture(
            verification_id=verification_id,
            live_image_data=f'data:image/png;base64,{base64_image}',
            challenge_response='smile'
        )
        
        print('✓ Live capture completed')
        print('  Liveness score:', live_result.get('liveness_score'))
        print('  Face match score:', live_result.get('face_match_score'))
        print('  Overall confidence:', live_result.get('confidence_score'))
        
        # Step 6: Get comprehensive results
        print('\nStep 6: Getting comprehensive verification results...')
        final_results = client.get_verification_results(verification_id)
        
        print('✓ Comprehensive results retrieved')
        print('  Final status:', final_results['status'])
        print('  Document uploaded:', final_results.get('document_uploaded'))
        print('  Back of ID uploaded:', final_results.get('back_of_id_uploaded'))
        print('  Live capture completed:', final_results.get('live_capture_completed'))
        print('  Enhanced verification completed:', final_results.get('enhanced_verification_completed'))
        
        if final_results.get('cross_validation_results'):
            print('  Cross validation score:', final_results['cross_validation_results'].get('match_score'))
        
        return {
            'session': session,
            'document_result': document_result,
            'back_result': back_result,
            'live_token': live_token,
            'live_result': live_result,
            'final_results': final_results
        }
        
    except Exception as error:
        print('✗ Enhanced verification flow failed:', str(error))
        if isinstance(error, IdswyftError):
            print(f'  Error details: {error.__class__.__name__}')
        return None

def test_verification_history():
    """Test verification history retrieval"""
    print('\n=== Testing Verification History ===')
    
    client = IdswyftClient(
        api_key=TEST_API_KEY,
        base_url=API_BASE_URL,
        sandbox=True
    )
    
    try:
        history_result = client.get_verification_history(
            user_id='test-user-123',
            limit=5
        )
        
        print('✓ Verification history retrieved')
        print('  Total verifications:', history_result['total'])
        print('  Recent verifications:', len(history_result['verifications']))
        
        return history_result
        
    except Exception as error:
        print('✗ Verification history failed:', str(error))
        return None

def test_developer_management():
    """Test developer management features"""
    print('\n=== Testing Developer Management ===')
    
    client = IdswyftClient(
        api_key=TEST_API_KEY,
        base_url=API_BASE_URL,
        sandbox=True
    )
    
    try:
        # Test creating API key
        print('Creating new API key...')
        api_key_result = client.create_api_key(
            name='Python Test SDK Key',
            environment='sandbox'
        )
        
        print('✓ API key created')
        print('  Key ID:', api_key_result['key_id'])
        print('  Key preview:', api_key_result['api_key'][:10] + '...')
        
        # Test listing API keys
        print('\nListing API keys...')
        api_keys_list = client.list_api_keys()
        
        print('✓ API keys listed')
        print('  Total keys:', len(api_keys_list['api_keys']))
        for i, key in enumerate(api_keys_list['api_keys'], 1):
            status = 'Active' if key['is_active'] else 'Inactive'
            print(f'  {i}. {key["name"]} ({key["environment"]}) - {status}')
        
        # Test getting API activity
        print('\nGetting API activity...')
        activity_result = client.get_api_activity(limit=5)
        
        print('✓ API activity retrieved')
        print('  Total activities:', activity_result['total'])
        print('  Recent activities:', len(activity_result['activities']))
        
        return {
            'api_key_result': api_key_result,
            'api_keys_list': api_keys_list,
            'activity_result': activity_result
        }
        
    except Exception as error:
        print('✗ Developer management failed:', str(error))
        return None

def test_webhook_management():
    """Test webhook management features"""
    print('\n=== Testing Webhook Management ===')
    
    client = IdswyftClient(
        api_key=TEST_API_KEY,
        base_url=API_BASE_URL,
        sandbox=True
    )
    
    try:
        # Test registering webhook
        print('Registering webhook...')
        webhook_result = client.register_webhook(
            url='https://example.com/webhook',
            events=['verification.completed', 'verification.failed'],
            secret='test-webhook-secret'
        )
        
        print('✓ Webhook registered')
        webhook_data = webhook_result['webhook']
        print('  Webhook ID:', webhook_data['id'])
        print('  URL:', webhook_data['url'])
        print('  Events:', webhook_data['events'])
        
        webhook_id = webhook_data['id']
        
        # Test listing webhooks
        print('\nListing webhooks...')
        webhooks_list = client.list_webhooks()
        
        print('✓ Webhooks listed')
        print('  Total webhooks:', len(webhooks_list['webhooks']))
        for i, webhook in enumerate(webhooks_list['webhooks'], 1):
            status = 'Active' if webhook['is_active'] else 'Inactive'
            print(f'  {i}. {webhook["url"]} - {status}')
        
        # Test webhook delivery
        print('\nTesting webhook delivery...')
        test_result = client.test_webhook(webhook_id)
        
        print('✓ Webhook test initiated')
        print('  Delivery ID:', test_result['delivery_id'])
        print('  Success:', test_result['success'])
        
        # Test updating webhook
        print('\nUpdating webhook...')
        update_result = client.update_webhook(
            webhook_id,
            events=['verification.completed']  # Reduce to one event
        )
        
        print('✓ Webhook updated')
        print('  Updated events:', update_result['webhook']['events'])
        
        return {
            'webhook_result': webhook_result,
            'webhooks_list': webhooks_list,
            'test_result': test_result,
            'update_result': update_result
        }
        
    except Exception as error:
        print('✗ Webhook management failed:', str(error))
        return None

def test_usage_stats():
    """Test usage statistics retrieval"""
    print('\n=== Testing Usage Statistics ===')
    
    client = IdswyftClient(
        api_key=TEST_API_KEY,
        base_url=API_BASE_URL,
        sandbox=True
    )
    
    try:
        result = client.get_usage_stats()
        
        print('✓ Usage stats retrieved')
        print('  Total requests:', result['total_requests'])
        print('  Success rate:', result['success_rate'])
        print('  Remaining quota:', result['remaining_quota'])
        
        return result
        
    except Exception as error:
        print('✗ Usage stats failed:', str(error))
        return None

def test_webhook_signature_verification():
    """Test webhook signature verification"""
    print('\n=== Testing Webhook Signature Verification ===')
    
    payload = '{"verification_id":"test-123","status":"verified"}'
    secret = 'test-webhook-secret'
    
    # Test with valid signature
    import hmac
    import hashlib
    
    valid_signature = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    is_valid = IdswyftClient.verify_webhook_signature(payload, valid_signature, secret)
    
    if is_valid:
        print('✓ Webhook signature verification works correctly')
    else:
        print('✗ Webhook signature verification failed')
    
    # Test with invalid signature
    is_invalid = IdswyftClient.verify_webhook_signature(payload, 'invalid-signature', secret)
    
    if not is_invalid:
        print('✓ Webhook signature correctly rejects invalid signatures')
    else:
        print('✗ Webhook signature incorrectly accepts invalid signatures')
    
    return is_valid and not is_invalid

def run_all_tests():
    """Run all integration tests"""
    print('🧪 Starting Idswyft Python SDK Integration Tests (Enhanced)')
    print('============================================================')
    
    results = {
        'health_check': False,
        'enhanced_verification_flow': False,
        'verification_history': False,
        'developer_management': False,
        'webhook_management': False,
        'usage_stats': False,
        'webhook_verification': False
    }
    
    verification_session = None
    
    try:
        # Test health check
        results['health_check'] = test_health_check()
        
        # Test enhanced verification flow
        verification_flow = test_enhanced_verification_flow()
        if verification_flow and verification_flow['final_results']:
            results['enhanced_verification_flow'] = True
            verification_session = verification_flow['session']
        
        # Test verification history
        if verification_session:
            history_result = test_verification_history()
            if history_result:
                results['verification_history'] = True
        
        # Test developer management features
        dev_management_result = test_developer_management()
        if dev_management_result:
            results['developer_management'] = True
        
        # Test webhook management features
        webhook_result = test_webhook_management()
        if webhook_result:
            results['webhook_management'] = True
        
        # Test usage stats
        stats_result = test_usage_stats()
        if stats_result:
            results['usage_stats'] = True
        
        # Test webhook signature verification
        results['webhook_verification'] = test_webhook_signature_verification()
        
    except Exception as error:
        print('💥 Unexpected error during testing:', str(error))
    
    # Print summary
    print('\n📊 Test Results Summary')
    print('========================')
    
    test_names = {
        'health_check': 'Health Check',
        'enhanced_verification_flow': 'Enhanced Verification Flow (6 steps)',
        'verification_history': 'Verification History',
        'developer_management': 'Developer Management (API Keys, Activity)',
        'webhook_management': 'Webhook Management (CRUD, Testing)',
        'usage_stats': 'Usage Statistics',
        'webhook_verification': 'Webhook Signature Verification'
    }
    
    for test, passed in results.items():
        status = '✅' if passed else '❌'
        print(f'{status} {test_names[test]}')
    
    passed_count = sum(results.values())
    total_count = len(results)
    
    print(f'\n🎯 Overall: {passed_count}/{total_count} tests passed')
    
    if passed_count == total_count:
        print('🎉 All tests passed! Enhanced Python SDK is working correctly.')
        print('✨ Ready for production deployment!')
        return True
    else:
        print('⚠️  Some tests failed. Check the output above for details.')
        return False

if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)