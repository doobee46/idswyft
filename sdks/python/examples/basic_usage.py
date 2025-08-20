#!/usr/bin/env python3
"""
Basic usage examples for the Idswyft Python SDK
"""

import os
import sys
import time
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import idswyft
from idswyft import IdswyftError, IdswyftAuthenticationError


def basic_document_verification():
    """Example 1: Basic document verification"""
    print("=== Example 1: Basic Document Verification ===")
    
    client = idswyft.IdswyftClient(
        api_key=os.getenv("IDSWYFT_API_KEY", "your-api-key"),
        sandbox=True
    )
    
    try:
        # Using file path
        result = client.verify_document(
            document_type="passport",
            document_file="examples/sample-passport.jpg",  # Sample file
            user_id="user-12345",
            metadata={
                "session_id": "sess_abc123",
                "source": "python_example"
            }
        )
        
        print(f"✓ Document verification initiated")
        print(f"  ID: {result['id']}")
        print(f"  Status: {result['status']}")
        print(f"  Type: {result['type']}")
        print(f"  Created: {result['created_at']}")
        
        if result.get('confidence_score'):
            print(f"  Confidence: {result['confidence_score']:.2f}")
        
        # Display AI analysis results
        if result.get('ocr_data'):
            ocr = result['ocr_data']
            print("  OCR Analysis:")
            if ocr.get('name'): print(f"    Name: {ocr['name']}")
            if ocr.get('date_of_birth'): print(f"    DOB: {ocr['date_of_birth']}")
            if ocr.get('document_number'): print(f"    Doc Number: {ocr['document_number']}")
            if ocr.get('confidence_scores'):
                print(f"    Confidence Scores: {ocr['confidence_scores']}")
        
        if result.get('quality_analysis'):
            quality = result['quality_analysis']
            print("  Quality Analysis:")
            print(f"    Overall Quality: {quality['overallQuality']}")
            print(f"    Is Blurry: {quality['isBlurry']}")
            if quality.get('resolution'):
                res = quality['resolution']
                print(f"    Resolution: {res['width']}x{res['height']}")
            if quality.get('issues'):
                print(f"    Issues: {quality['issues']}")
            if quality.get('recommendations'):
                print(f"    Recommendations: {quality['recommendations']}")
        
        return result
        
    except IdswyftError as e:
        print(f"✗ Verification failed: {e.message}")
        if hasattr(e, 'details'):
            print(f"  Details: {e.details}")
        return None


def selfie_verification_example():
    """Example 2: Selfie verification with document matching"""
    print("\n=== Example 2: Selfie Verification ===")
    
    client = idswyft.IdswyftClient(
        api_key=os.getenv("IDSWYFT_API_KEY", "your-api-key"),
        sandbox=True
    )
    
    try:
        # First verify a document
        print("Step 1: Verifying document...")
        doc_result = client.verify_document(
            document_type="drivers_license",
            document_file="examples/sample-license.jpg",
            user_id="user-67890"
        )
        
        print(f"✓ Document verified with ID: {doc_result['id']}")
        
        # Then verify selfie against the document
        print("Step 2: Verifying selfie...")
        selfie_result = client.verify_selfie(
            selfie_file="examples/sample-selfie.jpg",
            reference_document_id=doc_result['id'],
            user_id="user-67890",
            webhook_url="https://yourapp.com/webhook"
        )
        
        print(f"✓ Selfie verification initiated")
        print(f"  ID: {selfie_result['id']}")
        print(f"  Status: {selfie_result['status']}")
        
        # Display face matching and liveness results
        if selfie_result.get('face_match_score') is not None:
            print(f"  Face Match Score: {selfie_result['face_match_score']:.3f}")
        if selfie_result.get('liveness_score') is not None:
            print(f"  Liveness Score: {selfie_result['liveness_score']:.3f}")
        if selfie_result.get('manual_review_reason'):
            print(f"  Manual Review Reason: {selfie_result['manual_review_reason']}")
        
        return {"document": doc_result, "selfie": selfie_result}
        
    except IdswyftError as e:
        print(f"✗ Selfie verification failed: {e.message}")
        return None


def monitor_verification_status(verification_id):
    """Example 3: Monitor verification status until completion"""
    print(f"\n=== Example 3: Monitoring Status for {verification_id} ===")
    
    client = idswyft.IdswyftClient(
        api_key=os.getenv("IDSWYFT_API_KEY", "your-api-key"),
        sandbox=True
    )
    
    max_attempts = 10
    poll_interval = 3  # seconds
    
    for attempt in range(1, max_attempts + 1):
        try:
            verification = client.get_verification_status(verification_id)
            status = verification["status"]
            
            print(f"  Attempt {attempt}: Status = {status}")
            
            if status in ["verified", "failed", "manual_review"]:
                print("✓ Verification completed!")
                print(f"  Final Status: {status}")
                if verification.get('confidence_score'):
                    print(f"  Confidence Score: {verification['confidence_score']:.2f}")
                return verification
            
            if attempt < max_attempts:
                print(f"  Waiting {poll_interval} seconds...")
                time.sleep(poll_interval)
                
        except IdswyftError as e:
            print(f"✗ Status check failed: {e.message}")
            if attempt == max_attempts:
                raise
    
    print("⚠️ Monitoring timed out")
    return None


def list_verifications_example():
    """Example 4: List and filter verifications"""
    print("\n=== Example 4: List Verifications ===")
    
    client = idswyft.IdswyftClient(
        api_key=os.getenv("IDSWYFT_API_KEY", "your-api-key"),
        sandbox=True
    )
    
    try:
        # List recent verifications
        response = client.list_verifications(limit=10)
        
        print(f"✓ Found {response['total']} total verifications")
        print(f"  Showing {len(response['verifications'])} results")
        
        for verification in response['verifications']:
            status_emoji = {
                'verified': '✅',
                'failed': '❌', 
                'pending': '⏳',
                'manual_review': '👥'
            }.get(verification['status'], '❓')
            
            print(f"  {status_emoji} {verification['id'][:20]}... | {verification['status']} | {verification['type']}")
        
        # Filter by status
        print("\nFiltering by 'verified' status...")
        verified_response = client.list_verifications(status="verified", limit=5)
        print(f"✓ Found {verified_response['total']} verified verifications")
        
        return response
        
    except IdswyftError as e:
        print(f"✗ Failed to list verifications: {e.message}")
        return None


def usage_statistics_example():
    """Example 5: Get usage statistics"""
    print("\n=== Example 5: Usage Statistics ===")
    
    client = idswyft.IdswyftClient(
        api_key=os.getenv("IDSWYFT_API_KEY", "your-api-key"),
        sandbox=True
    )
    
    try:
        stats = client.get_usage_stats()
        
        print("✓ Usage Statistics:")
        print(f"  Period: {stats['period']}")
        print(f"  Total Requests: {stats['total_requests']}")
        print(f"  Success Rate: {stats['success_rate']}")
        print(f"  Monthly Usage: {stats['monthly_usage']}/{stats['monthly_limit']}")
        print(f"  Remaining Quota: {stats['remaining_quota']}")
        print(f"  Quota Resets: {stats['quota_reset_date']}")
        
        # Calculate usage percentage
        usage_pct = (stats['monthly_usage'] / stats['monthly_limit']) * 100
        if usage_pct > 80:
            print(f"  ⚠️ Warning: {usage_pct:.1f}% of quota used")
        elif usage_pct > 90:
            print(f"  🚨 Alert: {usage_pct:.1f}% of quota used!")
        
        return stats
        
    except IdswyftError as e:
        print(f"✗ Failed to get usage stats: {e.message}")
        return None


def webhook_verification_example():
    """Example 6: Webhook signature verification"""
    print("\n=== Example 6: Webhook Signature Verification ===")
    
    # Simulate webhook payload
    webhook_payload = '''{"verification_id":"verif_123","status":"verified","confidence_score":0.95}'''
    webhook_signature = "sha256=abcd1234..."  # This would come from the webhook header
    webhook_secret = "your-webhook-secret"
    
    # Verify signature
    is_valid = idswyft.IdswyftClient.verify_webhook_signature(
        payload=webhook_payload,
        signature=webhook_signature, 
        secret=webhook_secret
    )
    
    if is_valid:
        print("✓ Webhook signature is valid")
        print("  Safe to process webhook payload")
    else:
        print("✗ Invalid webhook signature")
        print("  Do not trust this payload")
    
    return is_valid


def error_handling_example():
    """Example 7: Comprehensive error handling"""
    print("\n=== Example 7: Error Handling ===")
    
    # Use invalid API key to demonstrate auth error
    client = idswyft.IdswyftClient(
        api_key="invalid-api-key",
        sandbox=True
    )
    
    try:
        # This should fail with authentication error
        client.verify_document(
            document_type="passport",
            document_file="nonexistent.jpg"
        )
        
    except IdswyftAuthenticationError as e:
        print(f"✓ Caught authentication error: {e.message}")
        
    except idswyft.IdswyftValidationError as e:
        print(f"✓ Caught validation error: {e.message}")
        if hasattr(e, 'field') and e.field:
            print(f"  Problem with field: {e.field}")
        if hasattr(e, 'validation_errors'):
            for error in e.validation_errors:
                print(f"  - {error}")
                
    except idswyft.IdswyftNetworkError as e:
        print(f"✓ Caught network error: {e.message}")
        
    except idswyft.IdswyftRateLimitError as e:
        print(f"✓ Caught rate limit error: {e.message}")
        if hasattr(e, 'retry_after'):
            print(f"  Retry after: {e.retry_after} seconds")
            
    except IdswyftError as e:
        print(f"✓ Caught general API error: {e.message}")
        print(f"  Status Code: {e.status_code}")
        print(f"  Error Code: {e.error_code}")
        
    except Exception as e:
        print(f"✗ Unexpected error: {e}")


def main():
    """Run all examples"""
    print("Idswyft Python SDK Examples")
    print("=" * 50)
    
    # Check if API key is set
    if not os.getenv("IDSWYFT_API_KEY"):
        print("⚠️ Set IDSWYFT_API_KEY environment variable to run examples")
        print("export IDSWYFT_API_KEY='your-api-key-here'")
        return
    
    try:
        # Run examples
        doc_result = basic_document_verification()
        selfie_results = selfie_verification_example()
        
        # Monitor status if we have a verification ID
        if doc_result:
            monitor_verification_status(doc_result['id'])
        
        list_verifications_example()
        usage_statistics_example()
        webhook_verification_example()
        error_handling_example()
        
        print(f"\n{'='*50}")
        print("✓ All examples completed!")
        
    except KeyboardInterrupt:
        print("\n⚠️ Examples interrupted by user")
    except Exception as e:
        print(f"\n✗ Example execution failed: {e}")


if __name__ == "__main__":
    main()