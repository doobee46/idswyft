#!/usr/bin/env python3
"""
Pytest configuration and fixtures for Idswyft SDK tests
"""

import pytest
import tempfile
import os
from unittest.mock import Mock

import idswyft


@pytest.fixture
def client():
    """Create a test client instance"""
    return idswyft.IdswyftClient(
        api_key="test-api-key",
        base_url="https://api.test.idswyft.com",
        sandbox=True
    )


@pytest.fixture
def mock_image_bytes():
    """Create mock image data for testing"""
    # Minimal valid PNG
    return bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41, 0x54,
        0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
        0x73, 0x75, 0x01, 0x18, 0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])


@pytest.fixture
def temp_image_file(mock_image_bytes):
    """Create a temporary image file for testing"""
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        f.write(mock_image_bytes)
        temp_path = f.name
    
    yield temp_path
    
    # Cleanup
    try:
        os.unlink(temp_path)
    except OSError:
        pass


@pytest.fixture
def mock_verification_result():
    """Create a mock verification result"""
    return {
        "id": "verif_test123",
        "status": "verified",
        "type": "document",
        "confidence_score": 0.95,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:01:00Z",
        "developer_id": "dev_123",
        "user_id": "user_456",
        "ocr_data": {
            "name": "John Doe",
            "date_of_birth": "1990-01-01",
            "document_number": "D1234567890",
            "confidence_scores": {
                "name": 0.98,
                "date_of_birth": 0.95
            }
        },
        "quality_analysis": {
            "overallQuality": "excellent",
            "isBlurry": False,
            "brightness": 128,
            "resolution": {
                "width": 1920,
                "height": 1080,
                "isHighRes": True
            }
        }
    }


@pytest.fixture
def mock_successful_response(mock_verification_result):
    """Create a mock successful HTTP response"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"verification": mock_verification_result}
    return mock_response


@pytest.fixture
def mock_error_response():
    """Create a mock error HTTP response"""
    mock_response = Mock()
    mock_response.status_code = 400
    mock_response.json.return_value = {
        "message": "Validation failed",
        "code": "validation_error"
    }
    return mock_response