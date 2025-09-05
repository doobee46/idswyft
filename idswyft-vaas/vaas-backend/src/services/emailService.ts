import nodemailer from 'nodemailer';
import config from '../config/index.js';
import { VaasOrganization, VaasAdmin } from '../types/index.js';

interface WelcomeEmailData {
  organization: VaasOrganization;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
  dashboardUrl: string;
}

interface NotificationEmailData {
  organizationName: string;
  adminName: string;
  adminEmail: string;
  jobTitle: string;
  estimatedVolume: string;
  useCase: string;
  signupId: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Use environment variables for email configuration
      const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        console.warn('Email credentials not configured. Email notifications will be logged instead of sent.');
        return;
      }

      this.transporter = nodemailer.createTransporter(emailConfig);
      console.log('✉️ Email transporter initialized');
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const subject = `Welcome to Idswyft VaaS - Your ${data.organization.name} Account is Ready!`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .credentials { background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #1e40af; margin: 20px 0; }
    .warning { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
    .logo { font-size: 24px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🛡️ Idswyft VaaS</div>
      <h1>Welcome to Identity Verification as a Service</h1>
    </div>
    
    <div class="content">
      <h2>Hello ${data.adminName}!</h2>
      
      <p>Congratulations! Your Idswyft VaaS account for <strong>${data.organization.name}</strong> has been successfully created.</p>
      
      <div class="credentials">
        <h3>🔐 Your Login Credentials</h3>
        <p><strong>Dashboard URL:</strong> <a href="${data.dashboardUrl}">${data.dashboardUrl}</a></p>
        <p><strong>Email:</strong> ${data.adminEmail}</p>
        <p><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${data.adminPassword}</code></p>
        <p><strong>Organization:</strong> ${data.organization.name}</p>
        <p><strong>Subscription:</strong> ${data.organization.subscription_tier.toUpperCase()}</p>
      </div>
      
      <div class="warning">
        <strong>⚠️ Important Security Notice</strong><br>
        Please change your password immediately after logging in for security purposes.
      </div>
      
      <a href="${data.dashboardUrl}" class="button">Access Your Dashboard</a>
      
      <h3>🚀 What's Next?</h3>
      <ul>
        <li><strong>Step 1:</strong> Log into your dashboard using the credentials above</li>
        <li><strong>Step 2:</strong> Update your password and profile information</li>
        <li><strong>Step 3:</strong> Generate API keys for your applications</li>
        <li><strong>Step 4:</strong> Configure webhook endpoints (optional)</li>
        <li><strong>Step 5:</strong> Start verifying identities!</li>
      </ul>
      
      <h3>📚 Resources</h3>
      <ul>
        <li><a href="https://docs.idswyft.com/vaas">VaaS Documentation</a></li>
        <li><a href="https://docs.idswyft.com/api">API Reference</a></li>
        <li><a href="https://github.com/idswyft/javascript-sdk">JavaScript SDK</a></li>
        <li><a href="mailto:support@idswyft.com">Contact Support</a></li>
      </ul>
      
      <h3>🎁 Your Free Trial</h3>
      <p>Your account comes with <strong>1,000 free identity verifications</strong> to get you started. No credit card required!</p>
    </div>
    
    <div class="footer">
      <p>Need help? Reply to this email or contact us at <a href="mailto:support@idswyft.com">support@idswyft.com</a></p>
      <p>Idswyft - Secure Identity Verification Platform</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Welcome to Idswyft VaaS!

Hello ${data.adminName},

Your Idswyft VaaS account for ${data.organization.name} has been successfully created.

Login Credentials:
- Dashboard URL: ${data.dashboardUrl}
- Email: ${data.adminEmail}
- Temporary Password: ${data.adminPassword}
- Organization: ${data.organization.name}
- Subscription: ${data.organization.subscription_tier.toUpperCase()}

IMPORTANT: Please change your password immediately after logging in.

What's Next:
1. Log into your dashboard
2. Update your password and profile
3. Generate API keys for your applications
4. Configure webhook endpoints (optional)
5. Start verifying identities!

Your account includes 1,000 free identity verifications to get started.

Resources:
- Documentation: https://docs.idswyft.com/vaas
- API Reference: https://docs.idswyft.com/api
- JavaScript SDK: https://github.com/idswyft/javascript-sdk

Need help? Contact support@idswyft.com

Best regards,
The Idswyft Team
    `;

    return this.sendEmail({
      to: data.adminEmail,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  async sendNotificationToAdmin(data: NotificationEmailData): Promise<boolean> {
    const subject = `🚀 New VaaS Signup: ${data.organizationName}`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #059669; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New VaaS Enterprise Signup</h1>
    </div>
    
    <div class="content">
      <h2>📋 Signup Details</h2>
      
      <div class="info-box">
        <p><strong>Company:</strong> ${data.organizationName}</p>
        <p><strong>Contact:</strong> ${data.adminName} (${data.adminEmail})</p>
        <p><strong>Job Title:</strong> ${data.jobTitle}</p>
        <p><strong>Expected Volume:</strong> ${data.estimatedVolume} verifications/month</p>
        <p><strong>Use Case:</strong></p>
        <p style="background: #f3f4f6; padding: 10px; border-radius: 4px;">${data.useCase}</p>
        <p><strong>Signup ID:</strong> ${data.signupId}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      </div>
      
      <h3>✅ Actions Completed</h3>
      <ul>
        <li>Organization account created</li>
        <li>Admin user provisioned with owner permissions</li>
        <li>Subscription tier automatically assigned based on volume</li>
        <li>Welcome email sent to customer</li>
      </ul>
      
      <h3>📞 Follow-up Recommended</h3>
      <ul>
        <li>Contact customer within 24 hours to discuss onboarding</li>
        <li>Schedule demo/training session if needed</li>
        <li>Verify subscription tier matches their needs</li>
        <li>Discuss integration support requirements</li>
      </ul>
    </div>
    
    <div class="footer">
      <p>VaaS Admin Notification System</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send to admin/support team
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@idswyft.com';
    
    return this.sendEmail({
      to: adminEmail,
      subject,
      html: htmlContent,
      text: `New VaaS Signup: ${data.organizationName} (${data.adminName} - ${data.adminEmail})\nVolume: ${data.estimatedVolume}\nUse Case: ${data.useCase}\nSignup ID: ${data.signupId}`
    });
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<boolean> {
    try {
      if (!this.transporter) {
        // Log email instead of sending if transporter not configured
        console.log('\n📧 EMAIL (not sent - no transporter configured):');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Text Content:\n${options.text}`);
        console.log('─'.repeat(80));
        return true;
      }

      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Idswyft VaaS" <noreply@idswyft.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });

      console.log(`✅ Email sent to ${options.to}:`, info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      
      // Log email content for debugging
      console.log('\n📧 EMAIL (failed to send):');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Error: ${error}`);
      console.log('─'.repeat(80));
      
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.log('Email transporter not configured - emails will be logged only');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();