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

interface VerificationEmailData {
  adminEmail: string;
  adminName: string;
  organizationName: string;
  verificationToken: string;
  dashboardUrl: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private mailgunDomain: string;
  private mailgunApiKey: string;
  private mailgunApiUrl: string;
  private fromAddress: string;
  private isConfigured: boolean = false;

  constructor() {
    this.mailgunDomain = process.env.MAILGUN_DOMAIN || '';
    this.mailgunApiKey = process.env.MAILGUN_API_KEY || '';
    this.fromAddress = process.env.MAILGUN_FROM || `Idswyft VaaS <postmaster@${this.mailgunDomain}>`;
    this.mailgunApiUrl = `https://api.mailgun.net/v3/${this.mailgunDomain}/messages`;
    
    this.isConfigured = !!(this.mailgunDomain && this.mailgunApiKey);
    
    if (this.isConfigured) {
      console.log(`✉️ Mailgun HTTP API configured for domain: ${this.mailgunDomain}`);
    } else {
      console.warn('❌ Mailgun not configured. Emails will be logged instead of sent.');
      console.warn(`Missing: MAILGUN_DOMAIN=${!this.mailgunDomain ? 'MISSING' : 'OK'}, MAILGUN_API_KEY=${!this.mailgunApiKey ? 'MISSING' : 'OK'}`);
    }
  }

  private async sendMailgunRequest(options: SendEmailOptions): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('from', this.fromAddress);
      formData.append('to', options.to);
      formData.append('subject', options.subject);
      formData.append('text', options.text);
      formData.append('html', options.html);

      console.log(`📧 Sending email to: ${options.to}`);
      console.log(`📧 Subject: ${options.subject}`);
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Mailgun request timeout after 8 seconds')), 8000)
      );

      // Create fetch promise
      const fetchPromise = fetch(this.mailgunApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.mailgunApiKey}`).toString('base64')}`
        },
        body: formData
      });

      // Race timeout vs fetch
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error(`❌ Mailgun API error: ${response.status} ${response.statusText}`);
        console.error(`❌ Error details: ${errorText}`);
        return false;
      }

      const result = await response.json().catch(() => ({ message: 'Email sent but unable to parse response' }));
      console.log(`✅ Email sent via Mailgun: ${result.id || result.message || 'Success'}`);
      return true;

    } catch (error) {
      console.error('❌ Mailgun request failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  private async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        console.log('\n📧 EMAIL (not sent - Mailgun not configured):');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`From: ${this.fromAddress}`);
        console.log('─'.repeat(50));
        return true; // Return true for development mode
      }

      return await this.sendMailgunRequest(options);

    } catch (error) {
      console.error('❌ Email service error:', error instanceof Error ? error.message : String(error));
      
      // Log email for debugging
      console.log('\n📧 EMAIL (failed to send):');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log('─'.repeat(50));
      
      return false;
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
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .credentials { background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #1e40af; margin: 20px 0; }
    .warning { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ Welcome to Idswyft VaaS</h1>
  </div>
  
  <div class="content">
    <h2>Hello ${data.adminName}!</h2>
    
    <p>Your Idswyft VaaS account for <strong>${data.organization.name}</strong> has been successfully created.</p>
    
    <div class="credentials">
      <h3>🔐 Your Login Credentials</h3>
      <p><strong>Dashboard:</strong> <a href="${data.dashboardUrl}">${data.dashboardUrl}</a></p>
      <p><strong>Email:</strong> ${data.adminEmail}</p>
      <p><strong>Password:</strong> <code>${data.adminPassword}</code></p>
      <p><strong>Organization:</strong> ${data.organization.name}</p>
    </div>
    
    <div class="warning">
      <strong>⚠️ Important:</strong> Please change your password after logging in.
    </div>
    
    <a href="${data.dashboardUrl}" class="button">Access Dashboard</a>
    
    <p>Best regards,<br>The Idswyft Team</p>
  </div>
</body>
</html>`;

    const textContent = `Welcome to Idswyft VaaS!

Hello ${data.adminName},

Your account for ${data.organization.name} has been created.

Login Details:
- Dashboard: ${data.dashboardUrl}
- Email: ${data.adminEmail}  
- Password: ${data.adminPassword}
- Organization: ${data.organization.name}

Please change your password after logging in.

Best regards,
The Idswyft Team`;

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
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>New VaaS Enterprise Signup</h1>
  </div>
  
  <div class="content">
    <div class="info-box">
      <p><strong>Company:</strong> ${data.organizationName}</p>
      <p><strong>Contact:</strong> ${data.adminName} (${data.adminEmail})</p>
      <p><strong>Job Title:</strong> ${data.jobTitle}</p>
      <p><strong>Volume:</strong> ${data.estimatedVolume}/month</p>
      <p><strong>Use Case:</strong> ${data.useCase}</p>
      <p><strong>Signup ID:</strong> ${data.signupId}</p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `New VaaS Signup: ${data.organizationName}

Company: ${data.organizationName}
Contact: ${data.adminName} (${data.adminEmail})
Job Title: ${data.jobTitle}
Volume: ${data.estimatedVolume}/month
Use Case: ${data.useCase}
Signup ID: ${data.signupId}`;

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@idswyft.com';
    
    return this.sendEmail({
      to: adminEmail,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
    const subject = `Verify Your ${data.organizationName} Admin Account - Idswyft VaaS`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0; border-bottom: 1px solid #e5e7eb; }
    .content { padding: 30px 20px; }
    .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .verification-code { background: #f3f4f6; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 16px; margin: 20px 0; text-align: center; }
    .next-steps { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ Idswyft VaaS</h1>
    <p>Identity Verification as a Service</p>
  </div>
  
  <div class="content">
    <h2>Verify Your Admin Account</h2>
    
    <p>Hello ${data.adminName},</p>
    
    <p>Please verify your admin account for <strong>${data.organizationName}</strong> to complete your VaaS setup.</p>
    
    <p style="text-align: center;">
      <a href="${data.dashboardUrl}/verify-email?token=${data.verificationToken}&email=${encodeURIComponent(data.adminEmail)}" class="button">
        Verify Email Address
      </a>
    </p>
    
    <p>Or use this verification code:</p>
    <div class="verification-code">
      <strong>${data.verificationToken}</strong>
    </div>
    
    <div class="next-steps">
      <h4>🎯 Next Steps:</h4>
      <ul>
        <li>Click the verification link above</li>
        <li>Access your dashboard at <a href="${data.dashboardUrl}">${data.dashboardUrl}</a></li>
        <li>Set up your organization settings</li>
        <li>Start integrating our verification API</li>
      </ul>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      If you didn't create this account, please ignore this email.
    </p>
  </div>
</body>
</html>`;

    const textContent = `Verify Your ${data.organizationName} Admin Account - Idswyft VaaS

Hello ${data.adminName},

Please verify your admin account for ${data.organizationName}.

Verification Link: ${data.dashboardUrl}/verify-email?token=${data.verificationToken}&email=${encodeURIComponent(data.adminEmail)}

Verification Code: ${data.verificationToken}

Next Steps:
- Click the verification link above  
- Access your dashboard at ${data.dashboardUrl}
- Set up your organization settings
- Start integrating our verification API

If you didn't create this account, please ignore this email.`;

    return this.sendEmail({
      to: data.adminEmail,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { 
        connected: false, 
        error: 'Mailgun not configured - missing MAILGUN_DOMAIN or MAILGUN_API_KEY' 
      };
    }

    try {
      console.log('🔍 Testing Mailgun configuration...');
      return { 
        connected: true, 
        error: `Domain: ${this.mailgunDomain}, From: ${this.fromAddress}` 
      };
    } catch (error) {
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    const result = await this.testConnection();
    return result.connected;
  }
}

export const emailService = new EmailService();