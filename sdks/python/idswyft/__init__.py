"""
Idswyft Python SDK

Official Python SDK for the Idswyft identity verification platform.
"""

from .client import IdswyftClient
from .exceptions import (
    IdswyftError,
    IdswyftAPIError,
    IdswyftAuthenticationError,
    IdswyftValidationError,
    IdswyftNetworkError,
    IdswyftRateLimitError,
)
from .types import (
    VerificationResult,
    DocumentVerificationRequest,
    SelfieVerificationRequest,
    UsageStats,
    VerificationStatus,
    DocumentType,
    OCRData,
    QualityAnalysis,
    QualityAnalysisResolution,
    QualityAnalysisFileSize,
)

# Convenience imports
Idswyft = IdswyftClient

__version__ = "1.0.0"
__author__ = "Idswyft Team"
__email__ = "support@idswyft.com"

__all__ = [
    "IdswyftClient",
    "Idswyft",
    "IdswyftError",
    "IdswyftAPIError", 
    "IdswyftAuthenticationError",
    "IdswyftValidationError",
    "IdswyftNetworkError",
    "IdswyftRateLimitError",
    "VerificationResult",
    "DocumentVerificationRequest",
    "SelfieVerificationRequest",
    "UsageStats",
    "VerificationStatus",
    "DocumentType",
    "OCRData",
    "QualityAnalysis",
    "QualityAnalysisResolution",
    "QualityAnalysisFileSize",
]