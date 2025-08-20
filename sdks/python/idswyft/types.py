"""
Type definitions for the Idswyft SDK
"""

from typing import Dict, Any, Optional, Literal, Union, BinaryIO
from datetime import datetime
import sys

if sys.version_info >= (3, 8):
    from typing import TypedDict
else:
    from typing_extensions import TypedDict

# Type aliases
VerificationStatus = Literal["pending", "verified", "failed", "manual_review"]
DocumentType = Literal["passport", "drivers_license", "national_id", "other"]
FileData = Union[str, bytes, BinaryIO]


class OCRData(TypedDict, total=False):
    """OCR extraction results from document analysis"""
    name: Optional[str]
    date_of_birth: Optional[str]
    document_number: Optional[str]
    expiration_date: Optional[str]
    issuing_authority: Optional[str]
    nationality: Optional[str]
    address: Optional[str]
    raw_text: Optional[str]
    confidence_scores: Optional[Dict[str, float]]


class QualityAnalysisResolution(TypedDict):
    """Resolution information from quality analysis"""
    width: int
    height: int
    isHighRes: bool


class QualityAnalysisFileSize(TypedDict):
    """File size information from quality analysis"""
    bytes: int
    isReasonableSize: bool


class QualityAnalysis(TypedDict, total=False):
    """Document quality analysis results"""
    isBlurry: bool
    blurScore: float
    brightness: float
    contrast: float
    resolution: QualityAnalysisResolution
    fileSize: QualityAnalysisFileSize
    overallQuality: Literal["excellent", "good", "fair", "poor"]
    issues: list[str]
    recommendations: list[str]


class VerificationResult(TypedDict, total=False):
    """Result of a verification request"""
    id: str
    status: VerificationStatus
    type: Literal["document", "selfie", "combined"]
    confidence_score: Optional[float]
    created_at: str
    updated_at: str
    developer_id: str
    user_id: Optional[str]
    metadata: Optional[Dict[str, Any]]
    webhook_url: Optional[str]
    error_message: Optional[str]
    error_code: Optional[str]
    # AI Analysis Results
    ocr_data: Optional[OCRData]
    quality_analysis: Optional[QualityAnalysis]
    face_match_score: Optional[float]
    liveness_score: Optional[float]
    manual_review_reason: Optional[str]


class DocumentVerificationRequest(TypedDict, total=False):
    """Request parameters for document verification"""
    document_type: DocumentType
    document_file: FileData
    user_id: Optional[str]
    webhook_url: Optional[str]
    metadata: Optional[Dict[str, Any]]


class SelfieVerificationRequest(TypedDict, total=False):
    """Request parameters for selfie verification"""
    selfie_file: FileData
    reference_document_id: Optional[str]
    user_id: Optional[str]
    webhook_url: Optional[str]
    metadata: Optional[Dict[str, Any]]


class UsageStats(TypedDict):
    """Developer usage statistics"""
    period: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    pending_requests: int
    manual_review_requests: int
    success_rate: str
    monthly_limit: int
    monthly_usage: int
    remaining_quota: int
    quota_reset_date: str


class ListVerificationsResponse(TypedDict):
    """Response from list verifications endpoint"""
    verifications: list[VerificationResult]
    total: int
    limit: int
    offset: int


class ApiKeyInfo(TypedDict, total=False):
    """API key information"""
    id: str
    name: str
    key_preview: str
    is_sandbox: bool
    is_active: bool
    last_used_at: Optional[str]
    created_at: str
    expires_at: Optional[str]
    status: Literal["active", "expired", "revoked"]


class WebhookEvent(TypedDict, total=False):
    """Webhook event payload"""
    event_type: str
    verification_id: str
    status: VerificationStatus
    confidence_score: Optional[float]
    user_id: Optional[str]
    timestamp: str
    metadata: Optional[Dict[str, Any]]