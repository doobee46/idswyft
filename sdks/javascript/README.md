# Idswyft JavaScript/Node.js SDK

Official JavaScript/Node.js SDK for the [Idswyft](https://idswyft.com) identity verification platform.

## Installation

```bash
npm install @idswyft/sdk
# or
yarn add @idswyft/sdk
```

## Quick Start

```javascript
import { IdswyftSDK } from '@idswyft/sdk';

// Initialize the SDK
const idswyft = new IdswyftSDK({
  apiKey: 'your-api-key-here',
  sandbox: true // Use sandbox for testing
});

// Verify a document
const result = await idswyft.verifyDocument({
  document_type: 'passport',
  document_file: documentFile, // File object or Buffer
  user_id: 'user-123'
});

console.log('Verification result:', result);

// Access AI analysis results
if (result.ocr_data) {
  console.log('Extracted name:', result.ocr_data.name);
  console.log('OCR confidence scores:', result.ocr_data.confidence_scores);
}

if (result.quality_analysis) {
  console.log('Document quality:', result.quality_analysis.overallQuality);
  console.log('Quality issues:', result.quality_analysis.issues);
}
```

## Authentication

Get your API key from the [Idswyft Developer Portal](https://idswyft.com/developer). Store it securely as an environment variable:

```bash
export IDSWYFT_API_KEY="your-api-key"
```

```javascript
const idswyft = new IdswyftSDK({
  apiKey: process.env.IDSWYFT_API_KEY
});
```

## API Reference

### Configuration

```javascript
const config = {
  apiKey: 'your-api-key',           // Required: Your Idswyft API key
  baseURL: 'https://api.idswyft.com', // Optional: API base URL
  timeout: 30000,                   // Optional: Request timeout in ms
  sandbox: false                    // Optional: Use sandbox environment
};

const idswyft = new IdswyftSDK(config);
```

### Document Verification

Verify government-issued documents like passports, driver's licenses, and national IDs:

```javascript
const result = await idswyft.verifyDocument({
  document_type: 'passport', // 'passport' | 'drivers_license' | 'national_id' | 'other'
  document_file: file,       // File object (browser) or Buffer (Node.js)
  user_id: 'user-123',      // Optional: Your internal user ID
  webhook_url: 'https://yourapp.com/webhook', // Optional: Webhook URL
  metadata: {               // Optional: Custom metadata
    session_id: 'abc123'
  }
});
```

### Selfie Verification

Verify selfies, optionally against a reference document:

```javascript
const result = await idswyft.verifySelfie({
  selfie_file: selfieFile,           // File object or Buffer
  reference_document_id: 'doc-123',  // Optional: Document to match against
  user_id: 'user-123',              // Optional: Your internal user ID
  webhook_url: 'https://yourapp.com/webhook',
  metadata: { session_id: 'abc123' }
});
```

### Check Verification Status

```javascript
const verification = await idswyft.getVerificationStatus('verification-id');
console.log(verification.status); // 'pending' | 'verified' | 'failed' | 'manual_review'
```

### List Verifications

```javascript
const response = await idswyft.listVerifications({
  status: 'verified',    // Optional: Filter by status
  limit: 50,            // Optional: Limit results (default: 100)
  offset: 0,            // Optional: Pagination offset
  user_id: 'user-123'   // Optional: Filter by user ID
});

console.log(response.verifications);
console.log(`Total: ${response.total}`);
```

### Usage Statistics

```javascript
const stats = await idswyft.getUsageStats();
console.log(`Success rate: ${stats.success_rate}`);
console.log(`Remaining quota: ${stats.remaining_quota}`);
```

## Webhook Verification

Secure your webhook endpoints by verifying the signature:

```javascript
import { IdswyftSDK } from '@idswyft/sdk';

// In your webhook handler
app.post('/webhook', (req, res) => {
  const payload = JSON.stringify(req.body);
  const signature = req.headers['x-idswyft-signature'];
  const secret = 'your-webhook-secret';

  if (IdswyftSDK.verifyWebhookSignature(payload, signature, secret)) {
    // Webhook is authentic
    console.log('Verification update:', req.body);
    res.sendStatus(200);
  } else {
    // Invalid signature
    res.sendStatus(401);
  }
});
```

## Error Handling

The SDK throws `IdswyftError` for API-related errors:

```javascript
import { IdswyftError } from '@idswyft/sdk';

try {
  const result = await idswyft.verifyDocument({
    document_type: 'passport',
    document_file: file
  });
} catch (error) {
  if (error instanceof IdswyftError) {
    console.error('API Error:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Error Code:', error.code);
    console.error('Details:', error.details);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Examples

### Node.js with Express

```javascript
import express from 'express';
import multer from 'multer';
import { IdswyftSDK } from '@idswyft/sdk';

const app = express();
const upload = multer();
const idswyft = new IdswyftSDK({ apiKey: process.env.IDSWYFT_API_KEY });

app.post('/verify', upload.single('document'), async (req, res) => {
  try {
    const result = await idswyft.verifyDocument({
      document_type: req.body.document_type,
      document_file: req.file.buffer,
      user_id: req.body.user_id
    });
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>Idswyft Verification</title>
</head>
<body>
    <input type="file" id="documentInput" accept="image/*">
    <button onclick="verifyDocument()">Verify Document</button>

    <script type="module">
        import { IdswyftSDK } from 'https://unpkg.com/@idswyft/sdk/dist/index.esm.js';
        
        const idswyft = new IdswyftSDK({
            apiKey: 'your-api-key',
            sandbox: true
        });

        window.verifyDocument = async () => {
            const fileInput = document.getElementById('documentInput');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('Please select a document');
                return;
            }

            try {
                const result = await idswyft.verifyDocument({
                    document_type: 'passport',
                    document_file: file
                });
                
                console.log('Verification result:', result);
            } catch (error) {
                console.error('Verification failed:', error.message);
            }
        };
    </script>
</body>
</html>
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import { IdswyftSDK, VerificationResult, IdswyftError } from '@idswyft/sdk';

const idswyft = new IdswyftSDK({ apiKey: 'your-key' });

// TypeScript will provide full intellisense and type checking
const result: VerificationResult = await idswyft.verifyDocument({
  document_type: 'passport',
  document_file: file
});
```

## Support

- 📖 [Documentation](https://docs.idswyft.com)
- 🐛 [Issue Tracker](https://github.com/doobee46/idswyft/issues)
- 💬 [Support](mailto:support@idswyft.com)

## License

MIT License - see [LICENSE](LICENSE) file for details.