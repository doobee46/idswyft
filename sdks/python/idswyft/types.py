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
VerificationType = Literal["document", "selfie", "combined", "live_capture"]
Environment = Literal["sandbox", "production"]
ChallengeType = Literal["blink", "smile", "turn_head", "random"]
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


class BarcodeData(TypedDict, total=False):
    """Barcode/QR code scanning results"""
    qr_code: Optional[str]
    parsed_data: Optional[Dict[str, Any]]
    verification_codes: Optional[list[str]]
    security_features: Optional[list[str]]


class CrossValidationResults(TypedDict):
    """Cross-validation results between front and back of ID"""
    match_score: float
    validation_results: Dict[str, bool]
    discrepancies: list[str]


class LivenessDetails(TypedDict, total=False):
    """Detailed liveness detection analysis"""
    blink_detection: Optional[float]
    head_movement: Optional[float]
    texture_analysis: Optional[float]
    challenge_passed: Optional[bool]


class VerificationResult(TypedDict, total=False):
    """Result of a verification request"""
    id: str
    verification_id: Optional[str]
    status: VerificationStatus
    type: VerificationType
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
    # Enhanced Verification Features
    document_uploaded: Optional[bool]
    document_type: Optional[str]
    back_of_id_uploaded: Optional[bool]
    live_capture_completed: Optional[bool]
    barcode_data: Optional[BarcodeData]
    cross_validation_results: Optional[CrossValidationResults]
    cross_validation_score: Optional[float]
    enhanced_verification_completed: Optional[bool]
    liveness_details: Optional[LivenessDetails]
    next_steps: Optional[list[str]]


class StartVerificationRequest(TypedDict):
    """Request parameters for starting verification"""
    user_id: str
    sandbox: Optional[bool]


class StartVerificationResponse(TypedDict):
    """Response from start verification endpoint"""
    verification_id: str
    status: str
    user_id: str
    next_steps: list[str]
    created_at: str


class DocumentVerificationRequest(TypedDict, total=False):
    """Request parameters for document verification"""
    verification_id: Optional[str]  # For existing verification session
    document_type: DocumentType
    document_file: FileData
    user_id: Optional[str]
    webhook_url: Optional[str]
    metadata: Optional[Dict[str, Any]]


class BackOfIdRequest(TypedDict):
    """Request parameters for back-of-ID verification"""
    verification_id: str
    document_type: DocumentType
    back_of_id_file: FileData
    metadata: Optional[Dict[str, Any]]


class LiveCaptureRequest(TypedDict):
    """Request parameters for live capture"""
    verification_id: str
    live_image_data: str  # base64 encoded
    challenge_response: Optional[str]
    metadata: Optional[Dict[str, Any]]


class LiveTokenRequest(TypedDict):
    """Request parameters for live token generation"""
    verification_id: str
    challenge_type: Optional[ChallengeType]


class LiveTokenResponse(TypedDict):
    """Response from live token generation"""
    token: str
    challenge: str
    expires_at: str
    instructions: str


class SelfieVerificationRequest(TypedDict, total=False):
    """Request parameters for selfie verification"""
    verification_id: Optional[str]  # For existing verification session
    selfie_file: FileData
    reference_document_id: Optional[str]
    user_id: Optional[str]
    webhook_url: Optional[str]
    metadata: Optional[Dict[str, Any]]


class ApiKey(TypedDict):
    """API key information"""
    id: str
    name: str
    key_prefix: str
    environment: Environment
    is_active: bool
    created_at: str
    last_used_at: Optional[str]
    monthly_requests: Optional[int]


class CreateApiKeyRequest(TypedDict):
    """Request parameters for creating API key"""
    name: str
    environment: Environment


class Webhook(TypedDict):
    """Webhook information"""
    id: str
    url: str
    events: list[str]
    is_active: bool
    created_at: str
    last_delivery_at: Optional[str]
    secret: Optional[str]


class CreateWebhookRequest(TypedDict, total=False):
    """Request parameters for creating webhook"""
    url: str
    events: Optional[list[str]]
    secret: Optional[str]


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