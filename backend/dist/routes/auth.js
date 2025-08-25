import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/database.js';
import { generateAdminToken, generateDeveloperToken } from '../middleware/auth.js';
import { catchAsync, ValidationError, AuthenticationError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
const router = express.Router();
// Admin login
router.post('/admin/login', [
    body('email')
        .isEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
], catchAsync(async (req, res) => {
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
}));
// Developer login
router.post('/developer/login', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    const { email, password } = req.body;
    // Get developer user
    const { data: developer, error } = await supabase
        .from('developers')
        .select('*')
        .eq('email', email)
        .eq('is_verified', true)
        .single();
    if (error || !developer) {
        logger.warn('Developer login attempt with invalid email', { email });
        throw new AuthenticationError('Invalid credentials or developer account not found');
    }
    // For MVP, we'll implement simple email-based auth
    // In production, you should add password hashing to the developers table
    if (password && developer.password_hash) {
        // If password is provided and developer has a password hash, verify it
        const isValidPassword = await bcrypt.compare(password, developer.password_hash);
        if (!isValidPassword) {
            logger.warn('Developer login attempt with invalid password', {
                email,
                developerId: developer.id
            });
            throw new AuthenticationError('Invalid credentials');
        }
    }
    else if (password && !developer.password_hash) {
        // If password provided but no hash stored, reject
        throw new AuthenticationError('Invalid credentials');
    }
    // If no password provided and no hash stored, allow email-only login for MVP
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
}));
export default router;
