"""
Main client class for the Idswyft SDK
"""

import json
import hashlib
import hmac
import requests
from typing import Dict, Any, Optional, BinaryIO, Union
from urllib.parse import urljoin, urlencode

from .types import (
    VerificationResult,
    DocumentVerificationRequest,
    SelfieVerificationRequest,
    StartVerificationRequest,
    StartVerificationResponse,
    BackOfIdRequest,
    LiveCaptureRequest,
    LiveTokenRequest,
    LiveTokenResponse,
    CreateApiKeyRequest,
    CreateWebhookRequest,
    ApiKey,
    Webhook,
    UsageStats,
    ListVerificationsResponse,
    FileData,
)
from .exceptions import (
    IdswyftError,
    IdswyftAPIError,
    IdswyftAuthenticationError,
    IdswyftValidationError,
    IdswyftNetworkError,
    IdswyftRateLimitError,
    IdswyftNotFoundError,
    IdswyftServerError,
)


class IdswyftClient:
    """
    Official Python client for the Idswyft identity verification API
    
    Args:
        api_key: Your Idswyft API key
        base_url: API base URL (default: https://api.idswyft.com)
        timeout: Request timeout in seconds (default: 30)
        sandbox: Whether to use sandbox environment (default: False)
        
    Example:
        >>> import idswyft
        >>> client = idswyft.IdswyftClient(api_key="your-api-key")
        >>> result = client.verify_document(
        ...     document_type="passport",
        ...     document_file=open("passport.jpg", "rb")
        ... )
        >>> print(result["status"])
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.idswyft.com",
        timeout: int = 30,
        sandbox: bool = False,
    ):
        if not api_key:
            raise ValueError("API key is required")
            
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.sandbox = sandbox
        
        # Initialize session with default headers
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-Key": api_key,
            "User-Agent": "idswyft-python/2.0.0",
            "X-SDK-Version": "2.0.0",
            "X-SDK-Language": "python",
        })

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make an HTTP request to the API"""
        url = urljoin(self.base_url, endpoint.lstrip("/"))
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                data=data,
                files=files,
                params=params,
                timeout=self.timeout,
            )
            
            # Handle different response status codes
            if response.status_code == 200 or response.status_code == 201:
                try:
                    return response.json()
                except json.JSONDecodeError:
                    return {"message": "Success"}
                    
            # Handle error responses
            try:
                error_data = response.json()
            except json.JSONDecodeError:
                error_data = {"error": "Unknown error", "message": response.text}
            
            self._raise_for_status(response.status_code, error_data)
            
        except requests.exceptions.Timeout:
            raise IdswyftNetworkError(f"Request timed out after {self.timeout} seconds")
        except requests.exceptions.ConnectionError:
            raise IdswyftNetworkError("Failed to connect to Idswyft API")
        except requests.exceptions.RequestException as e:
            raise IdswyftNetworkError(f"Network error: {str(e)}")

    def _raise_for_status(self, status_code: int, error_data: Dict[str, Any]) -> None:
        """Raise appropriate exception based on status code"""
        message = error_data.get("message", "API request failed")
        error_code = error_data.get("code")
        details = error_data.get("details")
        
        if status_code == 400:
            raise IdswyftValidationError(
                message, 
                field=error_data.get("field"),
                validation_errors=details if isinstance(details, list) else None
            )
        elif status_code == 401:
            raise IdswyftAuthenticationError(message)
        elif status_code == 404:
            resource = error_data.get("resource", "Resource")
            raise IdswyftNotFoundError(resource)
        elif status_code == 429:
            retry_after = error_data.get("retry_after")
            raise IdswyftRateLimitError(message, retry_after)
        elif 500 <= status_code < 600:
            raise IdswyftServerError(message)
        else:
            raise IdswyftAPIError(message, status_code, error_code, details)

    def _prepare_file(self, file_data: FileData, field_name: str = "file") -> tuple:
        """Prepare file data for upload"""
        if isinstance(file_data, str):
            # File path
            with open(file_data, "rb") as f:
                return (field_name, f.read(), "application/octet-stream")
        elif isinstance(file_data, bytes):
            # Raw bytes
            return (field_name, file_data, "application/octet-stream")
        elif hasattr(file_data, "read"):
            # File-like object
            return (field_name, file_data.read(), "application/octet-stream")
        else:
            raise ValueError(f"Invalid file data type: {type(file_data)}")

    def start_verification(
        self,
        user_id: str,
        sandbox: Optional[bool] = None,
    ) -> StartVerificationResponse:
        """
        Start a new verification session
        
        Args:
            user_id: Unique identifier for the user
            sandbox: Whether to use sandbox environment
            
        Returns:
            StartVerificationResponse dictionary containing verification_id and next steps
        """
        data = {"user_id": user_id}
        if sandbox is not None:
            data["sandbox"] = sandbox
        
        response = self._make_request("POST", "/api/verify/start", data=data)
        return response

    def verify_document(
        self,
        document_type: str,
        document_file: FileData,
        verification_id: Optional[str] = None,
        user_id: Optional[str] = None,
        webhook_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> VerificationResult:
        """
        Verify a government-issued document
        
        Args:
            document_type: Type of document ('passport', 'drivers_license', 'national_id', 'other')
            document_file: Document file (path, bytes, or file-like object)
            verification_id: Optional verification session ID (from start_verification)
            user_id: Optional user identifier
            webhook_url: Optional webhook URL for status updates
            metadata: Optional custom metadata
            
        Returns:
            VerificationResult dictionary containing verification details
            
        Example:
            >>> result = client.verify_document(
            ...     document_type="passport",
            ...     document_file="passport.jpg",
            ...     verification_id="verif_123",
            ...     user_id="user123"
            ... )
            >>> print(result["status"])  # 'pending', 'verified', 'failed', or 'manual_review'
        """
        # Prepare form data
        data = {"document_type": document_type}
        
        if verification_id:
            data["verification_id"] = verification_id
        if user_id:
            data["user_id"] = user_id
        if webhook_url:
            data["webhook_url"] = webhook_url
        if metadata:
            data["metadata"] = json.dumps(metadata)
        
        # Prepare file
        file_tuple = self._prepare_file(document_file, "document")
        files = {"document": file_tuple}
        
        response = self._make_request("POST", "/api/verify/document", data=data, files=files)
        return response.get("verification", response)

    def verify_back_of_id(
        self,
        verification_id: str,
        document_type: str,
        back_of_id_file: FileData,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> VerificationResult:
        """
        Upload back-of-ID for enhanced verification with barcode scanning
        
        Args:
            verification_id: Existing verification session ID
            document_type: Type of document
            back_of_id_file: Back of ID file (path, bytes, or file-like object)
            metadata: Optional custom metadata
            
        Returns:
            VerificationResult dictionary with enhanced verification details
        """
        data = {
            "verification_id": verification_id,
            "document_type": document_type,
        }
        
        if metadata:
            data["metadata"] = json.dumps(metadata)
        
        # Prepare file
        file_tuple = self._prepare_file(back_of_id_file, "back_of_id")
        files = {"back_of_id": file_tuple}
        
        response = self._make_request("POST", "/api/verify/back-of-id", data=data, files=files)
        return response

    def live_capture(
        self,
        verification_id: str,
        live_image_data: str,
        challenge_response: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> VerificationResult:
        """
        Perform live capture with AI liveness detection
        
        Args:
            verification_id: Existing verification session ID
            live_image_data: Base64 encoded live image data
            challenge_response: Optional challenge response (blink, smile, etc.)
            metadata: Optional custom metadata
            
        Returns:
            VerificationResult dictionary with liveness detection results
        """
        data = {
            "verification_id": verification_id,
            "live_image_data": live_image_data,
        }
        
        if challenge_response:
            data["challenge_response"] = challenge_response
        if metadata:
            data["metadata"] = json.dumps(metadata)
        
        response = self._make_request("POST", "/api/verify/live-capture", data=data)
        return response

    def generate_live_token(
        self,
        verification_id: str,
        challenge_type: Optional[str] = None,
    ) -> LiveTokenResponse:
        """
        Generate a secure token for live capture sessions
        
        Args:
            verification_id: Existing verification session ID
            challenge_type: Optional challenge type ('blink', 'smile', 'turn_head', 'random')
            
        Returns:
            LiveTokenResponse dictionary with token and challenge details
        """
        data = {"verification_id": verification_id}
        
        if challenge_type:
            data["challenge_type"] = challenge_type
        
        response = self._make_request("POST", "/api/verify/generate-live-token", data=data)
        return response

    def get_verification_results(self, verification_id: str) -> VerificationResult:
        """
        Get complete verification results including all enhancements
        
        Args:
            verification_id: ID of the verification session
            
        Returns:
            VerificationResult dictionary with comprehensive verification data
        """
        response = self._make_request("GET", f"/api/verify/results/{verification_id}")
        return response

    def get_verification_history(
        self,
        user_id: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Get verification history for a user
        
        Args:
            user_id: User identifier
            limit: Optional limit (default: 100, max: 1000)
            offset: Optional offset for pagination
            
        Returns:
            Dictionary containing list of verifications and pagination info
        """
        params = {}
        if limit:
            params["limit"] = str(limit)
        if offset:
            params["offset"] = str(offset)
        
        return self._make_request("GET", f"/api/verify/history/{user_id}", params=params)

    def verify_selfie(
        self,
        selfie_file: FileData,
        verification_id: Optional[str] = None,
        reference_document_id: Optional[str] = None,
        user_id: Optional[str] = None,
        webhook_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> VerificationResult:
        """
        Verify a selfie, optionally against a reference document
        
        Args:
            selfie_file: Selfie file (path, bytes, or file-like object)
            verification_id: Optional verification session ID (from start_verification)
            reference_document_id: Optional document ID to match against
            user_id: Optional user identifier
            webhook_url: Optional webhook URL for status updates
            metadata: Optional custom metadata
            
        Returns:
            VerificationResult dictionary containing verification details
        """
        # Prepare form data
        data = {}
        
        if verification_id:
            data["verification_id"] = verification_id
        if reference_document_id:
            data["reference_document_id"] = reference_document_id
        if user_id:
            data["user_id"] = user_id
        if webhook_url:
            data["webhook_url"] = webhook_url
        if metadata:
            data["metadata"] = json.dumps(metadata)
        
        # Prepare file
        file_tuple = self._prepare_file(selfie_file, "selfie")
        files = {"selfie": file_tuple}
        
        response = self._make_request("POST", "/api/verify/selfie", data=data, files=files)
        return response.get("verification", response)

    def get_verification_status(self, verification_id: str) -> VerificationResult:
        """
        Get the current status of a verification request
        
        Args:
            verification_id: ID of the verification request
            
        Returns:
            VerificationResult dictionary with current status
        """
        response = self._make_request("GET", f"/api/verify/status/{verification_id}")
        return response["verification"]

    def list_verifications(
        self,
        status: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        user_id: Optional[str] = None,
    ) -> ListVerificationsResponse:
        """
        List verification requests
        
        Args:
            status: Optional status filter
            limit: Optional limit (default: 100, max: 1000)
            offset: Optional offset for pagination
            user_id: Optional user ID filter
            
        Returns:
            Dictionary containing list of verifications and pagination info
        """
        params = {}
        if status:
            params["status"] = status
        if limit:
            params["limit"] = str(limit)
        if offset:
            params["offset"] = str(offset)
        if user_id:
            params["user_id"] = user_id
        
        return self._make_request("GET", "/api/verify/list", params=params)

    def update_webhook(self, verification_id: str, webhook_url: str) -> Dict[str, bool]:
        """
        Update webhook URL for a verification
        
        Args:
            verification_id: ID of the verification request
            webhook_url: New webhook URL
            
        Returns:
            Dictionary with success status
        """
        data = {"webhook_url": webhook_url}
        return self._make_request("PATCH", f"/api/verify/{verification_id}/webhook", data=data)

    def register_developer(self, email: str, name: str) -> Dict[str, str]:
        """
        Register as a new developer
        
        Args:
            email: Developer email address
            name: Developer name
            
        Returns:
            Dictionary with developer_id and message
        """
        data = {"email": email, "name": name}
        return self._make_request("POST", "/api/developer/register", data=data)

    def create_api_key(self, name: str, environment: str) -> Dict[str, str]:
        """
        Create a new API key
        
        Args:
            name: API key name/description
            environment: Environment ('sandbox' or 'production')
            
        Returns:
            Dictionary with api_key and key_id
        """
        data = {"name": name, "environment": environment}
        return self._make_request("POST", "/api/developer/api-key", data=data)

    def list_api_keys(self) -> Dict[str, list]:
        """
        List all API keys
        
        Returns:
            Dictionary with api_keys list
        """
        return self._make_request("GET", "/api/developer/api-keys")

    def revoke_api_key(self, key_id: str) -> Dict[str, Any]:
        """
        Revoke/delete an API key
        
        Args:
            key_id: API key ID to revoke
            
        Returns:
            Dictionary with success status and message
        """
        return self._make_request("DELETE", f"/api/developer/api-key/{key_id}")

    def get_api_activity(
        self,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get API activity logs
        
        Args:
            limit: Optional limit (default: 100, max: 1000)
            offset: Optional offset for pagination
            start_date: Optional start date filter (ISO format)
            end_date: Optional end date filter (ISO format)
            
        Returns:
            Dictionary containing activities and pagination info
        """
        params = {}
        if limit:
            params["limit"] = str(limit)
        if offset:
            params["offset"] = str(offset)
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        
        return self._make_request("GET", "/api/developer/activity", params=params)

    def register_webhook(
        self,
        url: str,
        events: Optional[list] = None,
        secret: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Register a webhook URL
        
        Args:
            url: Webhook URL
            events: Optional list of events to subscribe to
            secret: Optional webhook secret for signature verification
            
        Returns:
            Dictionary with webhook information
        """
        data = {"url": url}
        if events:
            data["events"] = events
        if secret:
            data["secret"] = secret
        
        return self._make_request("POST", "/api/webhooks/register", data=data)

    def list_webhooks(self) -> Dict[str, list]:
        """
        List all webhooks
        
        Returns:
            Dictionary with webhooks list
        """
        return self._make_request("GET", "/api/webhooks")

    def update_webhook(
        self,
        webhook_id: str,
        url: Optional[str] = None,
        events: Optional[list] = None,
        secret: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Update a webhook
        
        Args:
            webhook_id: Webhook ID to update
            url: Optional new webhook URL
            events: Optional new events list
            secret: Optional new webhook secret
            
        Returns:
            Dictionary with updated webhook information
        """
        data = {}
        if url:
            data["url"] = url
        if events is not None:
            data["events"] = events
        if secret is not None:
            data["secret"] = secret
        
        return self._make_request("PUT", f"/api/webhooks/{webhook_id}", data=data)

    def delete_webhook(self, webhook_id: str) -> Dict[str, Any]:
        """
        Delete a webhook
        
        Args:
            webhook_id: Webhook ID to delete
            
        Returns:
            Dictionary with success status and message
        """
        return self._make_request("DELETE", f"/api/webhooks/{webhook_id}")

    def test_webhook(self, webhook_id: str) -> Dict[str, Any]:
        """
        Test webhook delivery
        
        Args:
            webhook_id: Webhook ID to test
            
        Returns:
            Dictionary with success status and delivery_id
        """
        return self._make_request("POST", f"/api/webhooks/{webhook_id}/test")

    def get_webhook_deliveries(
        self,
        webhook_id: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Get webhook delivery history
        
        Args:
            webhook_id: Webhook ID
            limit: Optional limit (default: 100, max: 1000)
            offset: Optional offset for pagination
            
        Returns:
            Dictionary containing deliveries and pagination info
        """
        params = {}
        if limit:
            params["limit"] = str(limit)
        if offset:
            params["offset"] = str(offset)
        
        return self._make_request("GET", f"/api/webhooks/{webhook_id}/deliveries", params=params)

    def get_usage_stats(self) -> UsageStats:
        """
        Get developer usage statistics
        
        Returns:
            UsageStats dictionary with usage information
        """
        return self._make_request("GET", "/api/developer/stats")

    def health_check(self) -> Dict[str, str]:
        """
        Check API health status
        
        Returns:
            Dictionary with status and timestamp
        """
        try:
            return self._make_request("GET", "/api/health")
        except IdswyftNotFoundError:
            # Fallback for basic connectivity test
            return {"status": "ok", "timestamp": ""}

    @staticmethod
    def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
        """
        Verify webhook signature for security
        
        Args:
            payload: Raw webhook payload string
            signature: Signature from X-Idswyft-Signature header
            secret: Your webhook secret
            
        Returns:
            True if signature is valid, False otherwise
            
        Example:
            >>> payload = request.get_data(as_text=True)
            >>> signature = request.headers.get("X-Idswyft-Signature")
            >>> if IdswyftClient.verify_webhook_signature(payload, signature, secret):
            ...     # Process webhook
            ...     pass
        """
        if not all([payload, signature, secret]):
            return False
        
        try:
            # Remove 'sha256=' prefix if present
            signature = signature.replace("sha256=", "")
            
            # Calculate expected signature
            expected = hmac.new(
                secret.encode("utf-8"),
                payload.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            
            # Use hmac.compare_digest for timing-safe comparison
            return hmac.compare_digest(expected, signature)
        except Exception:
            return False

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.session.close()

    def close(self):
        """Close the HTTP session"""
        self.session.close()