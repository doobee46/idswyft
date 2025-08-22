/**
 * Examples demonstrating how to use the Idswyft SDK
 */

import { IdswyftSDK, IdswyftError } from './index';
import * as fs from 'fs';
import * as path from 'path';

// Initialize SDK
const idswyft = new IdswyftSDK({
  apiKey: process.env.IDSWYFT_API_KEY || 'your-api-key',
  sandbox: true // Use sandbox for testing
});

/**
 * Example 1: Basic document verification
 */
export async function basicDocumentVerification() {
  try {
    // Read document file
    const documentPath = path.join(__dirname, '../examples/sample-passport.jpg');
    const documentBuffer = fs.readFileSync(documentPath);

    const result = await idswyft.verifyDocument({
      document_type: 'passport',
      document_file: documentBuffer,
      user_id: 'user-12345',
      metadata: {
        session_id: 'sess_abc123',
        source: 'web_app'
      }
    });

    console.log('Document verification result:');
    console.log(`ID: ${result.id}`);
    console.log(`Status: ${result.status}`);
    console.log(`Confidence: ${result.confidence_score}`);
    console.log(`Created: ${result.created_at}`);
    
    // Display AI analysis results
    if (result.ocr_data) {
      console.log('OCR Analysis:');
      console.log(`  Name: ${result.ocr_data.name}`);
      console.log(`  DOB: ${result.ocr_data.date_of_birth}`);
      console.log(`  Document Number: ${result.ocr_data.document_number}`);
      if (result.ocr_data.confidence_scores) {
        console.log('  Confidence Scores:', result.ocr_data.confidence_scores);
      }
    }
    
    if (result.quality_analysis) {
      console.log('Quality Analysis:');
      console.log(`  Overall Quality: ${result.quality_analysis.overallQuality}`);
      console.log(`  Is Blurry: ${result.quality_analysis.isBlurry}`);
      console.log(`  Resolution: ${result.quality_analysis.resolution.width}x${result.quality_analysis.resolution.height}`);
      if (result.quality_analysis.issues.length > 0) {
        console.log('  Issues:', result.quality_analysis.issues);
      }
      if (result.quality_analysis.recommendations.length > 0) {
        console.log('  Recommendations:', result.quality_analysis.recommendations);
      }
    }

    return result;
  } catch (error) {
    if (error instanceof IdswyftError) {
      console.error(`Verification failed: ${error.message} (${error.statusCode})`);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

/**
 * Example 2: Selfie verification with document matching
 */
export async function selfieWithDocumentMatching() {
  try {
    // First, verify a document
    const documentBuffer = fs.readFileSync(path.join(__dirname, '../examples/sample-id.jpg'));
    const docResult = await idswyft.verifyDocument({
      document_type: 'drivers_license',
      document_file: documentBuffer,
      user_id: 'user-67890'
    });

    if (docResult.status !== 'verified') {
      throw new Error('Document verification failed, cannot proceed with selfie matching');
    }

    // Then verify selfie against the document
    const selfieBuffer = fs.readFileSync(path.join(__dirname, '../examples/sample-selfie.jpg'));
    const selfieResult = await idswyft.verifySelfie({
      selfie_file: selfieBuffer,
      reference_document_id: docResult.id,
      user_id: 'user-67890',
      webhook_url: 'https://yourapp.com/webhook'
    });

    console.log('Selfie verification result:');
    console.log(`Match status: ${selfieResult.status}`);
    console.log(`Confidence: ${selfieResult.confidence_score}`);
    if (selfieResult.face_match_score !== undefined) {
      console.log(`Face Match Score: ${selfieResult.face_match_score}`);
    }
    if (selfieResult.liveness_score !== undefined) {
      console.log(`Liveness Score: ${selfieResult.liveness_score}`);
    }

    return { document: docResult, selfie: selfieResult };
  } catch (error) {
    console.error('Selfie verification failed:', error);
    throw error;
  }
}

/**
 * Example 3: Monitoring verification status
 */
export async function monitorVerificationStatus(verificationId: string) {
  const maxAttempts = 30;
  const pollInterval = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const verification = await idswyft.getVerificationStatus(verificationId);
      console.log(`Attempt ${attempt}: Status is ${verification.status}`);

      // Check if verification is complete
      if (['verified', 'failed', 'manual_review'].includes(verification.status)) {
        console.log('Verification completed!');
        console.log('Final result:', verification);
        return verification;
      }

      // Wait before next poll
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      console.error(`Status check failed on attempt ${attempt}:`, error);
      if (attempt === maxAttempts) throw error;
    }
  }

  throw new Error('Verification status monitoring timed out');
}

/**
 * Example 4: Batch processing multiple documents
 */
export async function batchDocumentProcessing() {
  const documentsDir = path.join(__dirname, '../examples/batch');
  const documentFiles = fs.readdirSync(documentsDir)
    .filter(file => file.match(/\.(jpg|jpeg|png)$/i));

  const results = [];

  for (const filename of documentFiles) {
    try {
      const filePath = path.join(documentsDir, filename);
      const buffer = fs.readFileSync(filePath);
      
      // Determine document type from filename
      const documentType = filename.toLowerCase().includes('passport') ? 'passport' : 
                          filename.toLowerCase().includes('license') ? 'drivers_license' : 
                          'national_id';

      console.log(`Processing ${filename}...`);

      const result = await idswyft.verifyDocument({
        document_type: documentType,
        document_file: buffer,
        user_id: `batch-user-${Date.now()}`,
        metadata: {
          filename,
          batch_id: 'batch_001',
          processed_at: new Date().toISOString()
        }
      });

      results.push({
        filename,
        verification_id: result.id,
        status: result.status,
        confidence: result.confidence_score
      });

      console.log(`✓ ${filename}: ${result.status} (confidence: ${result.confidence_score})`);
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`✗ ${filename}: Failed -`, error.message);
      results.push({
        filename,
        verification_id: null,
        status: 'error',
        error: error.message
      });
    }
  }

  console.log('\nBatch processing summary:');
  console.table(results);
  return results;
}

/**
 * Example 5: Usage statistics and quota monitoring
 */
export async function checkUsageStats() {
  try {
    const stats = await idswyft.getUsageStats();
    
    console.log('Usage Statistics:');
    console.log(`Total requests this month: ${stats.total_requests}`);
    console.log(`Success rate: ${stats.success_rate}`);
    console.log(`Remaining quota: ${stats.remaining_quota}/${stats.monthly_limit}`);
    console.log(`Quota resets: ${new Date(stats.quota_reset_date).toLocaleDateString()}`);
    
    // Warn if quota is running low
    const usagePercentage = (stats.monthly_usage / stats.monthly_limit) * 100;
    if (usagePercentage > 80) {
      console.warn(`⚠️  Warning: ${usagePercentage.toFixed(1)}% of monthly quota used`);
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to get usage stats:', error);
    throw error;
  }
}

/**
 * Example 6: Webhook signature verification
 */
export function webhookHandler(req: any, res: any) {
  try {
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-idswyft-signature'];
    const webhookSecret = process.env.IDSWYFT_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const isValid = IdswyftSDK.verifyWebhookSignature(payload, signature, webhookSecret);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook payload
    const webhookData = req.body;
    console.log('Received webhook:', {
      verification_id: webhookData.verification_id,
      status: webhookData.status,
      type: webhookData.type
    });

    // Handle different webhook events
    switch (webhookData.status) {
      case 'verified':
        console.log(`✓ Verification ${webhookData.verification_id} completed successfully`);
        // Update your database, send notification, etc.
        break;
      case 'failed':
        console.log(`✗ Verification ${webhookData.verification_id} failed`);
        // Handle failure case
        break;
      case 'manual_review':
        console.log(`👥 Verification ${webhookData.verification_id} requires manual review`);
        // Notify admin team
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Example 7: Error handling patterns
 */
export async function errorHandlingExamples() {
  try {
    // This will fail - invalid file
    await idswyft.verifyDocument({
      document_type: 'passport',
      document_file: Buffer.from('invalid file data'),
      user_id: 'test-user'
    });
  } catch (error) {
    if (error instanceof IdswyftError) {
      // Handle specific API errors
      switch (error.statusCode) {
        case 400:
          console.error('Bad Request:', error.message);
          if (error.code === 'invalid_file_format') {
            console.error('Please check file format and try again');
          }
          break;
        case 401:
          console.error('Authentication failed - check your API key');
          break;
        case 429:
          console.error('Rate limit exceeded - please wait before retrying');
          break;
        case 500:
          console.error('Server error - please try again later');
          break;
        default:
          console.error(`API Error ${error.statusCode}: ${error.message}`);
      }
    } else {
      // Handle network or other errors
      console.error('Unexpected error:', error);
    }
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  async function runExamples() {
    try {
      console.log('Running Idswyft SDK examples...\n');
      
      // Check usage stats first
      await checkUsageStats();
      console.log('\n---\n');
      
      // Basic document verification
      await basicDocumentVerification();
      console.log('\n---\n');
      
      // Error handling demonstration
      await errorHandlingExamples();
      
    } catch (error) {
      console.error('Example execution failed:', error);
    }
  }
  
  runExamples();
}