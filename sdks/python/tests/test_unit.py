#!/usr/bin/env python3
"""
Unit tests for Idswyft Python SDK
"""

import os
import sys
import pytest
import json
from unittest.mock import Mock, patch, MagicMock
import hmac
import hashlib

# Add parent directory to path so we can import the SDK
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import idswyft
from idswyft import IdswyftClient
from idswyft.exceptions import (
    IdswyftError, IdswyftAPIError, IdswyftAuthenticationError,
    IdswyftValidationError, IdswyftNotFoundError, IdswyftRateLimitError,
    IdswyftServerError, IdswyftNetworkError
)

class TestIdswyftClient:
    """Test cases for IdswyftClient class"""
    
    def setup_method(self):
        """Setup test client"""
        self.client = IdswyftClient(
            api_key='test-api-key',
            base_url='https://api.test.idswyft.com',
            sandbox=True
        )
    
    def test_client_initialization(self):
        """Test client initialization with provided config"""
        assert self.client.api_key == 'test-api-key'
        assert self.client.base_url == 'https://api.test.idswyft.com'
        assert self.client.sandbox == True
        assert self.client.timeout == 30
        
        # Test default values
        default_client = IdswyftClient(api_key='test-key')
        assert default_client.base_url == 'https://api.idswyft.com'
        assert default_client.timeout == 30
        assert default_client.sandbox == False
    
    def test_client_initialization_requires_api_key(self):
        """Test that client initialization requires API key"""
        with pytest.raises(ValueError, match="API key is required"):
            IdswyftClient(api_key='')
    
    @patch('idswyft.client.requests.Session')
    def test_start_verification(self, mock_session_class):
        """Test start verification method"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'verification_id': 'verif_123',
            'status': 'started',
            'user_id': 'user-123',
            'next_steps': ['Upload document'],
            'created_at': '2024-01-01T12:00:00Z'
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        # Reinitialize client to use mocked session
        client = IdswyftClient(api_key='test-key')
        
        result = client.start_verification(
            user_id='user-123',
            sandbox=True
        )
        
        # Verify the API call
        mock_session.request.assert_called_once_with(
            method='POST',
            url='https://api.idswyft.com/api/verify/start',
            data={'user_id': 'user-123', 'sandbox': True},
            files=None,
            params=None,
            timeout=30
        )
        
        assert result['verification_id'] == 'verif_123'
        assert result['status'] == 'started'
        assert result['user_id'] == 'user-123'
    
    @patch('idswyft.client.requests.Session')
    def test_verify_document_with_verification_id(self, mock_session_class):
        """Test document verification with verification session ID"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 'verif_123',
            'status': 'processing',
            'type': 'document',
            'ocr_data': {
                'name': 'John Doe',
                'confidence_scores': {'name': 0.95}
            },
            'quality_analysis': {
                'overallQuality': 'good'
            }
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        client = IdswyftClient(api_key='test-key')
        
        test_bytes = b'fake image data'
        result = client.verify_document(
            verification_id='verif_123',
            document_type='passport',
            document_file=test_bytes,
            user_id='user-123'
        )
        
        assert result['id'] == 'verif_123'
        assert result['status'] == 'processing'
        assert result['ocr_data']['name'] == 'John Doe'
    
    @patch('idswyft.client.requests.Session')
    def test_verify_back_of_id(self, mock_session_class):
        """Test back-of-ID verification"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'verification_id': 'verif_123',
            'status': 'processing',
            'enhanced_verification': {
                'barcode_scanning_enabled': True,
                'cross_validation_enabled': True,
                'ai_powered': True
            },
            'barcode_data': {
                'parsed_data': {'license_number': 'D12345678'}
            }
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        client = IdswyftClient(api_key='test-key')
        
        test_bytes = b'fake back image data'
        result = client.verify_back_of_id(
            verification_id='verif_123',
            document_type='drivers_license',
            back_of_id_file=test_bytes
        )
        
        assert result['verification_id'] == 'verif_123'
        assert result['enhanced_verification']['barcode_scanning_enabled'] == True
        assert result['barcode_data']['parsed_data']['license_number'] == 'D12345678'
    
    @patch('idswyft.client.requests.Session')
    def test_live_capture(self, mock_session_class):
        """Test live capture with AI liveness detection"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 'verif_live123',
            'status': 'verified',
            'type': 'live_capture',
            'liveness_score': 0.94,
            'face_match_score': 0.92,
            'confidence_score': 0.93,
            'liveness_details': {
                'blink_detection': 0.95,
                'challenge_passed': True
            }
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        client = IdswyftClient(api_key='test-key')
        
        result = client.live_capture(
            verification_id='verif_123',
            live_image_data='data:image/jpeg;base64,/9j/4AAQSkZJRgABA...',
            challenge_response='smile'
        )
        
        assert result['liveness_score'] == 0.94
        assert result['face_match_score'] == 0.92
        assert result['liveness_details']['challenge_passed'] == True
    
    @patch('idswyft.client.requests.Session')
    def test_generate_live_token(self, mock_session_class):
        """Test live token generation"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'token': 'live_token_xyz789',
            'challenge': 'smile',
            'expires_at': '2024-01-01T12:05:00Z',
            'instructions': 'Please smile naturally for the camera'
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        client = IdswyftClient(api_key='test-key')
        
        result = client.generate_live_token(
            verification_id='verif_123',
            challenge_type='smile'
        )
        
        assert result['token'] == 'live_token_xyz789'
        assert result['challenge'] == 'smile'
        assert result['instructions'] == 'Please smile naturally for the camera'
    
    @patch('idswyft.client.requests.Session')
    def test_create_api_key(self, mock_session_class):
        """Test API key creation"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'api_key': 'sk_test_123456789abcdef',
            'key_id': 'key_abc123'
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        client = IdswyftClient(api_key='test-key')
        
        result = client.create_api_key(
            name='Test Key',
            environment='sandbox'
        )
        
        assert result['api_key'] == 'sk_test_123456789abcdef'
        assert result['key_id'] == 'key_abc123'
    
    @patch('idswyft.client.requests.Session')
    def test_register_webhook(self, mock_session_class):
        """Test webhook registration"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'webhook': {
                'id': 'hook_123',
                'url': 'https://example.com/webhook',
                'events': ['verification.completed'],
                'is_active': True,
                'secret': 'webhook_secret'
            }
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        client = IdswyftClient(api_key='test-key')
        
        result = client.register_webhook(
            url='https://example.com/webhook',
            events=['verification.completed'],
            secret='webhook_secret'
        )
        
        webhook = result['webhook']
        assert webhook['id'] == 'hook_123'
        assert webhook['url'] == 'https://example.com/webhook'
        assert webhook['events'] == ['verification.completed']
        assert webhook['is_active'] == True
    
    def test_webhook_signature_verification(self):
        """Test webhook signature verification"""
        payload = '{"verification_id":"test","status":"verified"}'
        secret = 'webhook-secret'
        
        # Create valid signature
        valid_signature = 'sha256=' + hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Test valid signature
        is_valid = IdswyftClient.verify_webhook_signature(payload, valid_signature, secret)
        assert is_valid == True
        
        # Test invalid signature
        is_invalid = IdswyftClient.verify_webhook_signature(payload, 'invalid-signature', secret)
        assert is_invalid == False
        
        # Test empty inputs
        is_empty = IdswyftClient.verify_webhook_signature('', '', '')
        assert is_empty == False
    
    @patch('idswyft.client.requests.Session')
    def test_error_handling_400(self, mock_session_class):
        """Test handling of 400 validation errors"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            'message': 'Validation failed',
            'field': 'document_type',
            'details': ['Invalid document type']
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        client = IdswyftClient(api_key='test-key')
        
        with pytest.raises(IdswyftValidationError) as exc_info:
            client.verify_document(
                document_type='invalid',
                document_file=b'test'
            )
        
        assert 'Validation failed' in str(exc_info.value)
    
    @patch('idswyft.client.requests.Session')
    def test_error_handling_401(self, mock_session_class):
        """Test handling of 401 authentication errors"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.json.return_value = {
            'message': 'Invalid API key'
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        client = IdswyftClient(api_key='invalid-key')
        
        with pytest.raises(IdswyftAuthenticationError) as exc_info:
            client.health_check()
        
        assert 'Invalid API key' in str(exc_info.value)
    
    @patch('idswyft.client.requests.Session')
    def test_error_handling_404(self, mock_session_class):
        """Test handling of 404 not found errors"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.json.return_value = {
            'message': 'Verification not found',
            'resource': 'Verification'
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        client = IdswyftClient(api_key='test-key')
        
        with pytest.raises(IdswyftNotFoundError) as exc_info:
            client.get_verification_results('invalid-id')
        
        assert 'Verification' in str(exc_info.value)
    
    @patch('idswyft.client.requests.Session')
    def test_error_handling_429(self, mock_session_class):
        """Test handling of 429 rate limit errors"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.json.return_value = {
            'message': 'Rate limit exceeded',
            'retry_after': 60
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        client = IdswyftClient(api_key='test-key')
        
        with pytest.raises(IdswyftRateLimitError) as exc_info:
            client.verify_document(
                document_type='passport',
                document_file=b'test'
            )
        
        assert 'Rate limit exceeded' in str(exc_info.value)
        assert exc_info.value.retry_after == 60
    
    @patch('idswyft.client.requests.Session')
    def test_error_handling_500(self, mock_session_class):
        """Test handling of 500 server errors"""
        mock_session = Mock()
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.json.return_value = {
            'message': 'Internal server error'
        }
        
        mock_session.request.return_value = mock_response
        mock_session_class.return_value = mock_session
        
        client = IdswyftClient(api_key='test-key')
        
        with pytest.raises(IdswyftServerError) as exc_info:
            client.health_check()
        
        assert 'Internal server error' in str(exc_info.value)
    
    def test_file_preparation_bytes(self):
        """Test file preparation with bytes"""
        test_bytes = b'test image data'
        result = self.client._prepare_file(test_bytes, 'test_field')
        
        assert result[0] == 'test_field'
        assert result[1] == test_bytes
        assert result[2] == 'application/octet-stream'
    
    def test_file_preparation_string_path(self):
        """Test file preparation with file path"""
        # Create a temporary file for testing
        import tempfile
        
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            tmp_file.write(b'test file content')
            tmp_file_path = tmp_file.name
        
        try:
            result = self.client._prepare_file(tmp_file_path, 'test_field')
            
            assert result[0] == 'test_field'
            assert result[1] == b'test file content'
            assert result[2] == 'application/octet-stream'
        finally:
            os.unlink(tmp_file_path)
    
    def test_file_preparation_invalid_type(self):
        """Test file preparation with invalid type"""
        with pytest.raises(ValueError, match="Invalid file data type"):
            self.client._prepare_file(12345, 'test_field')
    
    def test_context_manager(self):
        """Test client as context manager"""
        with IdswyftClient(api_key='test-key') as client:
            assert client.api_key == 'test-key'
            # Session should be accessible
            assert client.session is not None

if __name__ == '__main__':
    pytest.main([__file__, '-v'])