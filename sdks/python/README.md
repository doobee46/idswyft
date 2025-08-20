# Idswyft Python SDK

Official Python SDK for the [Idswyft](https://idswyft.com) identity verification platform.

## Installation

```bash
pip install idswyft
```

## Quick Start

```python
import idswyft

# Initialize the client
client = idswyft.IdswyftClient(
    api_key="your-api-key-here",
    sandbox=True  # Use sandbox for testing
)

# Verify a document
with open("passport.jpg", "rb") as f:
    result = client.verify_document(
        document_type="passport",
        document_file=f,
        user_id="user-123"
    )

print(f"Verification status: {result['status']}")
```

## Authentication

Get your API key from the [Idswyft Developer Portal](https://idswyft.com/developer). Store it securely as an environment variable:

```bash
export IDSWYFT_API_KEY="your-api-key"
```

```python
import os
import idswyft

client = idswyft.IdswyftClient(api_key=os.getenv("IDSWYFT_API_KEY"))
```

## API Reference

### Client Configuration

```python
client = idswyft.IdswyftClient(
    api_key="your-api-key",           # Required: Your Idswyft API key
    base_url="https://api.idswyft.com",  # Optional: API base URL
    timeout=30,                       # Optional: Request timeout in seconds
    sandbox=False                     # Optional: Use sandbox environment
)
```

### Document Verification

Verify government-issued documents like passports, driver's licenses, and national IDs:

```python
# Using file path
result = client.verify_document(
    document_type="passport",  # 'passport' | 'drivers_license' | 'national_id' | 'other'
    document_file="passport.jpg",
    user_id="user-123",       # Optional: Your internal user ID
    webhook_url="https://yourapp.com/webhook",  # Optional: Webhook URL
    metadata={"session_id": "abc123"}  # Optional: Custom metadata
)

# Using file object
with open("drivers_license.jpg", "rb") as f:
    result = client.verify_document(
        document_type="drivers_license",
        document_file=f,
        user_id="user-456"
    )

# Using bytes
with open("national_id.jpg", "rb") as f:
    file_data = f.read()
    
result = client.verify_document(
    document_type="national_id",
    document_file=file_data,
    user_id="user-789"
)
```

### Selfie Verification

Verify selfies, optionally against a reference document:

```python
# Basic selfie verification
result = client.verify_selfie(
    selfie_file="selfie.jpg",
    user_id="user-123"
)

# Selfie verification with document matching
result = client.verify_selfie(
    selfie_file="selfie.jpg",
    reference_document_id="doc-123",  # Document to match against
    user_id="user-123",
    webhook_url="https://yourapp.com/webhook",
    metadata={"session_id": "abc123"}
)
```

### Check Verification Status

```python
verification = client.get_verification_status("verification-id")
print(verification["status"])  # 'pending' | 'verified' | 'failed' | 'manual_review'
print(verification["confidence_score"])  # Confidence score if available
```

### List Verifications

```python
# List all verifications
response = client.list_verifications()
print(f"Total verifications: {response['total']}")

# List with filters
response = client.list_verifications(
    status="verified",     # Optional: Filter by status
    limit=50,             # Optional: Limit results (default: 100)
    offset=0,             # Optional: Pagination offset
    user_id="user-123"    # Optional: Filter by user ID
)

for verification in response["verifications"]:
    print(f"ID: {verification['id']}, Status: {verification['status']}")
```

### Usage Statistics

```python
stats = client.get_usage_stats()
print(f"Success rate: {stats['success_rate']}")
print(f"Monthly usage: {stats['monthly_usage']}/{stats['monthly_limit']}")
print(f"Remaining quota: {stats['remaining_quota']}")
```

## Webhook Verification

Secure your webhook endpoints by verifying the signature:

```python
from flask import Flask, request
import idswyft

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.get_data(as_text=True)
    signature = request.headers.get('X-Idswyft-Signature')
    webhook_secret = 'your-webhook-secret'

    if idswyft.IdswyftClient.verify_webhook_signature(payload, signature, webhook_secret):
        # Webhook is authentic
        data = request.get_json()
        print(f"Verification update: {data['verification_id']} -> {data['status']}")
        return 'OK', 200
    else:
        # Invalid signature
        return 'Unauthorized', 401
```

## Error Handling

The SDK raises specific exceptions for different error types:

```python
import idswyft
from idswyft import (
    IdswyftError,
    IdswyftAPIError,
    IdswyftAuthenticationError,
    IdswyftValidationError,
    IdswyftNetworkError,
    IdswyftRateLimitError
)

try:
    result = client.verify_document(
        document_type="passport",
        document_file="passport.jpg"
    )
except IdswyftAuthenticationError:
    print("Authentication failed - check your API key")
except IdswyftValidationError as e:
    print(f"Validation error: {e.message}")
    if hasattr(e, 'validation_errors'):
        for error in e.validation_errors:
            print(f"  - {error}")
except IdswyftRateLimitError as e:
    print(f"Rate limit exceeded. Retry after: {e.retry_after} seconds")
except IdswyftNetworkError:
    print("Network error - check your connection")
except IdswyftError as e:
    print(f"API Error {e.status_code}: {e.message}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Examples

### Django Integration

```python
# views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import idswyft

client = idswyft.IdswyftClient(api_key=settings.IDSWYFT_API_KEY)

@csrf_exempt
@require_http_methods(["POST"])
def verify_document(request):
    try:
        document_file = request.FILES['document']
        document_type = request.POST.get('document_type', 'passport')
        user_id = request.user.id if request.user.is_authenticated else None
        
        result = client.verify_document(
            document_type=document_type,
            document_file=document_file,
            user_id=str(user_id) if user_id else None
        )
        
        return JsonResponse(result)
        
    except idswyft.IdswyftError as e:
        return JsonResponse({'error': e.message}, status=400)
```

### FastAPI Integration

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
import idswyft

app = FastAPI()
client = idswyft.IdswyftClient(api_key="your-api-key")

@app.post("/verify-document")
async def verify_document(
    document: UploadFile = File(...),
    document_type: str = "passport",
    user_id: str = None
):
    try:
        file_content = await document.read()
        
        result = client.verify_document(
            document_type=document_type,
            document_file=file_content,
            user_id=user_id
        )
        
        return result
        
    except idswyft.IdswyftError as e:
        raise HTTPException(status_code=400, detail=e.message)
```

### Batch Processing

```python
import os
import idswyft
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

client = idswyft.IdswyftClient(api_key=os.getenv("IDSWYFT_API_KEY"))

def verify_single_document(file_path):
    """Verify a single document"""
    try:
        filename = os.path.basename(file_path)
        
        # Determine document type from filename
        if 'passport' in filename.lower():
            doc_type = 'passport'
        elif 'license' in filename.lower():
            doc_type = 'drivers_license'
        else:
            doc_type = 'national_id'
        
        result = client.verify_document(
            document_type=doc_type,
            document_file=file_path,
            user_id=f"batch-{int(time.time())}",
            metadata={'filename': filename, 'batch': True}
        )
        
        return {
            'filename': filename,
            'verification_id': result['id'],
            'status': result['status'],
            'confidence': result.get('confidence_score')
        }
        
    except Exception as e:
        return {
            'filename': filename,
            'error': str(e)
        }

def batch_verify_documents(directory_path, max_workers=5):
    """Verify multiple documents concurrently"""
    # Get all image files
    image_extensions = ('.jpg', '.jpeg', '.png', '.pdf')
    files = [
        os.path.join(directory_path, f) 
        for f in os.listdir(directory_path)
        if f.lower().endswith(image_extensions)
    ]
    
    results = []
    
    # Process files concurrently
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_file = {
            executor.submit(verify_single_document, file_path): file_path
            for file_path in files
        }
        
        # Collect results
        for future in as_completed(future_to_file):
            result = future.result()
            results.append(result)
            print(f"Processed: {result['filename']}")
            
            # Small delay to respect rate limits
            time.sleep(0.2)
    
    return results

# Usage
if __name__ == "__main__":
    results = batch_verify_documents("./documents")
    
    # Print summary
    successful = len([r for r in results if 'verification_id' in r])
    total = len(results)
    print(f"\nBatch completed: {successful}/{total} documents processed successfully")
```

### Context Manager Usage

```python
import idswyft

# Using context manager automatically closes the session
with idswyft.IdswyftClient(api_key="your-api-key") as client:
    result = client.verify_document(
        document_type="passport",
        document_file="passport.jpg"
    )
    print(result["status"])
# Session is automatically closed here
```

### Monitoring Verification Status

```python
import time
import idswyft

def wait_for_verification(client, verification_id, max_attempts=30, poll_interval=2):
    """Poll verification status until complete"""
    
    for attempt in range(1, max_attempts + 1):
        try:
            verification = client.get_verification_status(verification_id)
            status = verification["status"]
            
            print(f"Attempt {attempt}: Status is {status}")
            
            # Check if verification is complete
            if status in ["verified", "failed", "manual_review"]:
                print("Verification completed!")
                return verification
            
            # Wait before next poll
            if attempt < max_attempts:
                time.sleep(poll_interval)
                
        except Exception as e:
            print(f"Status check failed on attempt {attempt}: {e}")
            if attempt == max_attempts:
                raise
    
    raise TimeoutError("Verification status monitoring timed out")

# Usage
client = idswyft.IdswyftClient(api_key="your-api-key")

# Start verification
result = client.verify_document(
    document_type="passport",
    document_file="passport.jpg"
)

# Wait for completion
final_result = wait_for_verification(client, result["id"])
print(f"Final status: {final_result['status']}")
```

## TypeScript Support

The Python SDK includes type hints for better IDE support:

```python
from typing import Optional, Dict, Any
import idswyft

client: idswyft.IdswyftClient = idswyft.IdswyftClient(api_key="your-key")

# Type hints provide better IDE completion and error checking
result: idswyft.VerificationResult = client.verify_document(
    document_type="passport",
    document_file="passport.jpg"
)
```

## Support

- 📖 [Documentation](https://docs.idswyft.com)
- 🐛 [Issue Tracker](https://github.com/doobee46/idswyft/issues)
- 💬 [Support](mailto:support@idswyft.com)

## License

MIT License - see [LICENSE](LICENSE) file for details.