# Idswyft SDKs

This directory contains the official SDKs for the [Idswyft](https://idswyft.com) identity verification platform.

## Available SDKs

### JavaScript/Node.js SDK
**Location**: `./javascript/`  
**Package**: `@idswyft/sdk`  
**Language**: TypeScript/JavaScript  
**Node.js**: 16+  

**Installation:**
```bash
npm install @idswyft/sdk
```

**Quick Start:**
```javascript
import { IdswyftSDK } from '@idswyft/sdk';

const client = new IdswyftSDK({
  apiKey: process.env.IDSWYFT_API_KEY,
  sandbox: true
});

const result = await client.verifyDocument({
  document_type: 'passport',
  document_file: fileBuffer,
  user_id: 'user-123'
});

console.log('Verification result:', result);
// Access AI analysis results
console.log('OCR data:', result.ocr_data);
console.log('Quality analysis:', result.quality_analysis);
```

### Python SDK  
**Location**: `./python/`  
**Package**: `idswyft`  
**Language**: Python  
**Version**: 3.8+  

**Installation:**
```bash
pip install idswyft
```

**Quick Start:**
```python
import idswyft

client = idswyft.IdswyftClient(
    api_key="your-api-key",
    sandbox=True
)

result = client.verify_document(
    document_type="passport",
    document_file="passport.jpg",
    user_id="user-123"
)

print(f"Status: {result['status']}")
# Access AI analysis results
if result.get('ocr_data'):
    print(f"Name: {result['ocr_data']['name']}")
if result.get('quality_analysis'):
    print(f"Quality: {result['quality_analysis']['overallQuality']}")
```

## Features

Both SDKs provide complete access to the Idswyft API:

### ✅ **Document Verification**
- Support for passports, driver's licenses, national IDs
- Real-time OCR text extraction with confidence scores
- Document quality analysis (blur, brightness, resolution)
- Tamper detection and authenticity checks

### ✅ **Selfie Verification** 
- Liveness detection
- Face matching against document photos
- Anti-spoofing measures

### ✅ **AI Analysis Results**
- **OCR Data**: Extracted text fields with confidence scores
- **Quality Analysis**: Image quality metrics and recommendations  
- **Face Matching**: Similarity scores for selfie verification
- **Liveness Scores**: Real person detection confidence

### ✅ **Developer Tools**
- Usage statistics and quota monitoring
- Webhook signature verification for security
- Comprehensive error handling with specific error types
- Full TypeScript definitions (JavaScript SDK)
- Complete type hints (Python SDK)

### ✅ **Enterprise Features**
- API key management with expiration
- Rate limiting and abuse protection
- Sandbox environment for testing
- GDPR/CCPA compliant data handling

## API Response Structure

Both SDKs return comprehensive verification results:

```json
{
  "id": "verif_abc123",
  "status": "verified",
  "type": "document",
  "confidence_score": 0.95,
  "user_id": "user-123",
  "ocr_data": {
    "name": "John Doe",
    "date_of_birth": "1990-01-01",
    "document_number": "D1234567890",
    "confidence_scores": {
      "name": 0.98,
      "date_of_birth": 0.95,
      "document_number": 0.92
    }
  },
  "quality_analysis": {
    "overallQuality": "excellent", 
    "isBlurry": false,
    "brightness": 128,
    "resolution": {
      "width": 1920,
      "height": 1080,
      "isHighRes": true
    },
    "issues": [],
    "recommendations": []
  },
  "face_match_score": 0.91,
  "created_at": "2024-01-01T00:00:00Z"
}
```

## Authentication

Both SDKs use API keys for authentication:

1. Register at [Idswyft Developer Portal](https://idswyft.com/developer)
2. Get your API key
3. Store securely as environment variable:

```bash
export IDSWYFT_API_KEY="your-api-key"
```

## Testing

Both SDKs include comprehensive test suites:

**JavaScript:**
```bash
cd javascript/
npm test
```

**Python:**
```bash  
cd python/
python -m pytest
```

## Documentation

- **JavaScript SDK**: [`./javascript/README.md`](./javascript/README.md)
- **Python SDK**: [`./python/README.md`](./python/README.md)
- **API Documentation**: [https://docs.idswyft.com](https://docs.idswyft.com)

## Support

- 📖 [Full Documentation](https://docs.idswyft.com)
- 🐛 [Issue Tracker](https://github.com/doobee46/idswyft/issues) 
- 💬 [Support Email](mailto:support@idswyft.com)
- 💼 [Enterprise Sales](mailto:sales@idswyft.com)

## License

Both SDKs are released under the MIT License. See individual LICENSE files in each SDK directory.