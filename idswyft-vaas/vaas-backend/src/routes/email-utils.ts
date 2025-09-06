import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { vaasSupabase } from '../config/database.js';
import config from '../config/index.js';

console.log('📧 Importing email service...');
import { emailService } from '../services/emailService.js';
console.log('✅ Email service imported:', !!emailService);

import { VaasApiResponse } from '../types/index.js';

const router = Router();

console.log('📧 Email routes module loaded');

// Send password reset/verification email
router.post('/send-verification/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    // Find admin user
    const { data: admin, error: adminError } = await vaasSupabase
      .from('vaas_admins')
      .select(`
        id,
        first_name,
        last_name,
        email,
        organization_id,
        vaas_organizations!inner(
          id,
          name,
          slug
        )
      `)
      .eq('email', email)
      .single();
      
    if (adminError || !admin) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: 'Admin user not found'
        }
      } as VaasApiResponse);
    }

    // Generate a JWT verification token
    const verificationToken = jwt.sign(
      { 
        admin_id: admin.id, 
        email: admin.email,
        type: 'email_verification'
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail({
      adminEmail: admin.email,
      adminName: `${admin.first_name} ${admin.last_name}`,
      organizationName: (admin.vaas_organizations as any).name,
      verificationToken,
      dashboardUrl: process.env.VAAS_ADMIN_URL || 'https://app.idswyft.app'
    });

    if (emailSent) {
      // Mark email as verified (for testing purposes)
      await vaasSupabase
        .from('vaas_admins')
        .update({ 
          email_verified: true,
          status: 'active' 
        })
        .eq('id', admin.id);
    }

    const response: VaasApiResponse = {
      success: true,
      data: {
        message: emailSent 
          ? 'Verification email sent successfully' 
          : 'Email logged (SMTP not configured)',
        email: admin.email,
        emailSent
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_SEND_FAILED',
        message: 'Failed to send verification email'
      }
    } as VaasApiResponse);
  }
});

// Test email service configuration
router.get('/test-email', async (req, res) => {
  try {
    console.log('📧 Testing email service configuration...');
    
    // Add a timeout wrapper for the email service test
    const testPromise = emailService.testConnection();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email test timeout after 5 seconds')), 5000)
    );
    
    const testResult = await Promise.race([testPromise, timeoutPromise]);
    
    console.log('📧 Email service test result:', testResult);
    
    res.json({
      success: true,
      data: {
        message: 'Email service test completed',
        result: testResult
      }
    } as VaasApiResponse);
  } catch (error) {
    console.error('📧 Email test error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_TEST_FAILED',
        message: (error as Error).message || 'Email service test failed'
      }
    } as VaasApiResponse);
  }
});

// Simple health check for email routes
router.get('/health', async (req, res) => {
  console.log('📧 Email routes health check');
  res.json({
    success: true,
    data: {
      message: 'Email routes are working',
      timestamp: new Date().toISOString()
    }
  } as VaasApiResponse);
});

export default router;