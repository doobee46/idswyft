import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { supabase } from '@/config/database.js';
import { generateAdminToken } from '@/middleware/auth.js';
import { catchAsync, ValidationError, AuthenticationError } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';

const router = express.Router();

// Admin login
router.post('/admin/login',
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  catchAsync(async (req, res) => {
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

export default router;