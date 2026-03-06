import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import validator from 'validator';
import { supabase } from '@/config/database.js';
import { generateAdminToken, generateDeveloperToken, authenticateJWT } from '@/middleware/auth.js';
import { catchAsync, ValidationError, AuthenticationError } from '@/middleware/errorHandler.js';
import { TotpService } from '@/services/totpService.js';
import { logger } from '@/utils/logger.js';
import { generateToken } from '@/middleware/csrf.js';

const router = express.Router();

// GET /api/auth/csrf-token — frontend calls this before any admin mutation
router.get('/csrf-token', (req: Request, res: Response) => {
  const token = generateToken(req, res);
  res.json({ csrfToken: token });
});

// Admin login
router.post('/admin/login',
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    
    const { email, password } = req.body;
    
    // Get admin user
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !adminUser) {
      logger.warn('Admin login attempt with invalid email', { email });
      throw new AuthenticationError('Invalid credentials');
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, adminUser.password_hash);
    if (!isValidPassword) {
      logger.warn('Admin login attempt with invalid password', { 
        email,
        adminId: adminUser.id 
      });
      throw new AuthenticationError('Invalid credentials');
    }
    
    // If TOTP is enabled, require a TOTP token in the same request
    if (adminUser.totp_enabled) {
      const { totp_token } = req.body;
      if (!totp_token) {
        // Return 401 so the client knows to prompt for a TOTP code.
        // Using 401 (not 200) avoids leaking that the password was correct
        // before the second factor is verified.
        return res.status(401).json({ requires_totp: true });
      }
      const totp = new TotpService();
      if (!totp.verifyToken(totp_token, adminUser.totp_secret)) {
        throw new AuthenticationError('Invalid 2FA token');
      }
    }

    // Generate token
    const token = generateAdminToken(adminUser);

    logger.info('Admin user logged in', {
      adminId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    });

    res.json({
      token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      }
    });
  })
);

// Exported so tests can import and run validators directly without booting Express.
export const developerLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
];

// Developer login — passwordless, email-only (API keys are the real credentials)
router.post('/developer/login',
  developerLoginValidation,
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }

    const { email } = req.body;

    // Get developer user
    const { data: developer, error } = await supabase
      .from('developers')
      .select('*')
      .eq('email', email)
      .eq('is_verified', true)
      .single();

    if (error || !developer) {
      logger.warn('Developer login attempt with unknown email', { email });
      throw new AuthenticationError('No developer account found for this email');
    }

    // Generate token
    const token = generateDeveloperToken(developer);
    
    logger.info('Developer user logged in', {
      developerId: developer.id,
      email: developer.email,
      company: developer.company
    });
    
    res.json({
      token,
      developer: {
        id: developer.id,
        email: developer.email,
        name: developer.name,
        company: developer.company,
        is_verified: developer.is_verified,
        created_at: developer.created_at
      }
    });
  })
);

// POST /api/auth/totp/setup — generate and store TOTP secret, return QR code
router.post('/totp/setup',
  authenticateJWT,
  catchAsync(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const totp = new TotpService();
    const secret = totp.generateSecret();
    const qrCode = await totp.generateQrCode(user.email, secret);

    // Store the unverified secret; totp_enabled stays false until /totp/verify succeeds
    await supabase.from('admin_users')
      .update({ totp_secret: secret, totp_enabled: false })
      .eq('id', user.id);

    res.json({ qrCode, secret });
  })
);

// POST /api/auth/totp/verify — verify first token, enable TOTP for this account
router.post('/totp/verify',
  authenticateJWT,
  catchAsync(async (req: Request, res: Response) => {
    const { token } = req.body;
    const user = (req as any).user;

    const { data: admin } = await supabase.from('admin_users')
      .select('totp_secret')
      .eq('id', user.id)
      .single();

    if (!admin?.totp_secret) {
      throw new ValidationError('TOTP setup not started', 'token', token);
    }

    const totp = new TotpService();
    if (!totp.verifyToken(token, admin.totp_secret)) {
      throw new ValidationError('Invalid TOTP token', 'token', token);
    }

    await supabase.from('admin_users')
      .update({ totp_enabled: true, totp_verified_at: new Date().toISOString() })
      .eq('id', user.id);

    res.json({ message: '2FA enabled successfully' });
  })
);

export default router;