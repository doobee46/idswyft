import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config.js';
import { connectDB, supabase } from './config/database.js';
import { generateAPIKey } from './middleware/auth.js';
import { apiActivityLogger } from './middleware/apiLogger.js';
import verificationRoutes from './routes/verification.js';
import developerRoutes from './routes/developer.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import healthRoutes from './routes/health.js';
import webhookRoutes from './routes/webhooks.js';

const app = express();

// Trust proxy for production deployment (Railway, etc.)
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost origins in development
    if (config.nodeEnv === 'development' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    
    // Check against configured origins
    if (config.corsOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Basic middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.maxRequestsPerDev,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// API activity logging middleware
app.use('/api', apiActivityLogger);

// Mount API routes
app.use('/api/verify', verificationRoutes);
app.use('/api/developer', developerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Idswyft Identity Verification API',
    version: '1.0.0',
    status: 'running',
    environment: config.nodeEnv,
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Idswyft API Documentation',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health - Health check',
      verification: {
        'POST /api/verify/document': 'Upload and verify identity document',
        'POST /api/verify/selfie': 'Upload selfie for face matching',
        'GET /api/verify/status/:user_id': 'Get verification status',
      },
      developer: {
        'POST /api/developer/register': 'Register as developer',
        'POST /api/developer/api-key': 'Create API key',
      },
      webhooks: {
        'POST /api/webhooks/register': 'Register webhook URL',
        'GET /api/webhooks': 'List webhooks',
      }
    },
    authentication: {
      'API Key': 'Include X-API-Key header with your API key',
      'Admin': 'Include Authorization header with Bearer token'
    }
  });
});



// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: '/api/docs'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await connectDB();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`🚀 Idswyft API server running on port ${config.port}`);
      console.log(`📚 API Documentation: http://localhost:${config.port}/api/docs`);
      console.log(`💻 Environment: ${config.nodeEnv}`);
      console.log(`🔒 CORS Origins: ${config.corsOrigins.join(', ')}`);
      
      if (config.sandbox.enabled) {
        console.log('🧪 Sandbox mode enabled');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;