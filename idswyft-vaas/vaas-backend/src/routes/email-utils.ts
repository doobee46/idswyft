import { Router } from 'express';
import { vaasSupabase } from '../config/database.js';
import { emailService } from '../services/emailService.js';
import { VaasApiResponse } from '../types/index.js';

const router = Router();

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

    // Generate a verification token (in real app, store this in DB)
    const verificationToken = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail({
      adminEmail: admin.email,
      adminName: `${admin.first_name} ${admin.last_name}`,
      organizationName: admin.vaas_organizations.name,
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
    const testResult = await emailService.testConnection();
    
    res.json({
      success: true,
      data: {
        message: 'Email service test completed',
        result: testResult
      }
    } as VaasApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_TEST_FAILED',
        message: error.message || 'Email service test failed'
      }
    } as VaasApiResponse);
  }
});

export default router;