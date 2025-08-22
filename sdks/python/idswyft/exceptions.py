"""
Exception classes for the Idswyft SDK
"""

from typing import Optional, Any, Dict


class IdswyftError(Exception):
    """Base exception class for all Idswyft SDK errors"""
    
    def __init__(self, message: str, status_code: Optional[int] = None, 
                 error_code: Optional[str] = None, details: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details

    def __str__(self) -> str:
        if self.status_code:
            return f"Idswyft API Error {self.status_code}: {self.message}"
        return f"Idswyft Error: {self.message}"

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"message={self.message!r}, "
            f"status_code={self.status_code}, "
            f"error_code={self.error_code!r})"
        )


class IdswyftAPIError(IdswyftError):
    """Exception raised for API-related errors"""
    pass


class IdswyftAuthenticationError(IdswyftAPIError):
    """Exception raised for authentication failures"""
    
    def __init__(self, message: str = "Authentication failed - check your API key"):
        super().__init__(message, status_code=401, error_code="authentication_failed")


class IdswyftValidationError(IdswyftAPIError):
    """Exception raised for validation failures"""
    
    def __init__(self, message: str, field: Optional[str] = None, 
                 validation_errors: Optional[list] = None):
        super().__init__(message, status_code=400, error_code="validation_failed")
        self.field = field
        self.validation_errors = validation_errors or []


class IdswyftNetworkError(IdswyftError):
    """Exception raised for network-related errors"""
    
    def __init__(self, message: str = "Network error occurred"):
        super().__init__(message, error_code="network_error")


class IdswyftRateLimitError(IdswyftAPIError):
    """Exception raised when rate limit is exceeded"""
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        super().__init__(message, status_code=429, error_code="rate_limit_exceeded")
        self.retry_after = retry_after


class IdswyftNotFoundError(IdswyftAPIError):
    """Exception raised when a resource is not found"""
    
    def __init__(self, resource: str = "Resource"):
        message = f"{resource} not found"
        super().__init__(message, status_code=404, error_code="not_found")
        self.resource = resource


class IdswyftServerError(IdswyftAPIError):
    """Exception raised for server errors"""
    
    def __init__(self, message: str = "Internal server error"):
        super().__init__(message, status_code=500, error_code="server_error")