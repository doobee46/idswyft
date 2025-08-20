#!/usr/bin/env python3
"""
Unit tests for the Idswyft Python SDK client
"""

import pytest
import hashlib
import hmac
from unittest.mock import Mock, patch

import idswyft
from idswyft import IdswyftClient, IdswyftError, IdswyftAuthenticationError


class TestIdswyftClient:
    """Test cases for IdswyftClient"""

    def test_client_initialization(self):
        """Test client initialization with various configurations"""
        client = IdswyftClient(api_key="test-key")
        assert client.api_key == "test-key"
        assert client.base_url == "https://api.idswyft.com"
        assert client.timeout == 30
        assert client.sandbox == False

        # Test with custom configuration
        client = IdswyftClient(
            api_key="test-key",
            base_url="http://localhost:3001",
            timeout=60,
            sandbox=True
        )
        assert client.base_url == "http://localhost:3001"
        assert client.timeout == 60
        assert client.sandbox == True

    def test_client_requires_api_key(self):
        """Test that client raises error without API key"""
        with pytest.raises(ValueError, match="API key is required"):
            IdswyftClient(api_key="")

    def test_webhook_signature_verification(self):
        """Test webhook signature verification"""
        payload = '{"test": "data"}'
        secret = "webhook-secret"
        
        # Create valid signature
        signature = "sha256=" + hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Test valid signature
        assert IdswyftClient.verify_webhook_signature(payload, signature, secret) == True
        
        # Test invalid signature
        assert IdswyftClient.verify_webhook_signature(payload, "invalid", secret) == False
        
        # Test empty inputs
        assert IdswyftClient.verify_webhook_signature("", "", "") == False

    def test_context_manager(self):
        """Test client as context manager"""
        with IdswyftClient(api_key="test-key") as client:
            assert isinstance(client, IdswyftClient)
        # Session should be closed after context

    @patch('idswyft.client.requests.Session.request')
    def test_successful_request(self, mock_request):
        """Test successful API request"""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"verification": {"id": "test-123", "status": "pending"}}
        mock_request.return_value = mock_response

        client = IdswyftClient(api_key="test-key")
        result = client._make_request("GET", "/test")
        
        assert result == {"verification": {"id": "test-123", "status": "pending"}}
        mock_request.assert_called_once()

    @patch('idswyft.client.requests.Session.request')
    def test_authentication_error(self, mock_request):
        """Test authentication error handling"""
        # Mock 401 response
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.json.return_value = {"message": "Invalid API key"}
        mock_request.return_value = mock_response

        client = IdswyftClient(api_key="invalid-key")
        
        with pytest.raises(IdswyftAuthenticationError):
            client._make_request("GET", "/test")

    def test_file_preparation(self):
        """Test file preparation for upload"""
        client = IdswyftClient(api_key="test-key")
        
        # Test with bytes
        file_bytes = b"test file content"
        field_name, content, mime_type = client._prepare_file(file_bytes)
        assert field_name == "file"
        assert content == file_bytes
        assert mime_type == "application/octet-stream"

    def test_invalid_file_type(self):
        """Test invalid file type handling"""
        client = IdswyftClient(api_key="test-key")
        
        with pytest.raises(ValueError, match="Invalid file data type"):
            client._prepare_file(123)  # Invalid type


if __name__ == "__main__":
    pytest.main([__file__])