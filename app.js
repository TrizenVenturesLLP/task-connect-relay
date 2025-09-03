const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const authRouter = require('./routes/auth');
const profilesRouter = require('./routes/profiles');
const tasksRouter = require('./routes/tasks');
const devTasksRouter = require('./routes/dev-tasks');
const matchesRouter = require('./routes/matches');
const applicationsRouter = require('./routes/applications');
const { authMiddleware } = require('./middleware/auth');
const logger = require('./config/logger');
const { validateEnv, getCorsConfig } = require('./config/env');

// Validate environment variables
const env = validateEnv();

// Log environment for debugging
console.log('🚀 Backend starting with environment:', {
  NODE_ENV: env.NODE_ENV,
  CORS_ORIGIN: env.CORS_ORIGIN
});

const app = express();

// Trust proxy if behind reverse proxy (like in CapRover)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000 / 60),
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration - Using centralized config
const corsOptions = getCorsConfig(env);
app.use(cors(corsOptions));

// Additional CORS headers for better compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Set CORS headers based on origin
  if (origin) {
    // Check if origin is allowed
    const allowedOrigins = [
      'https://extrahand.in',
      'https://www.extrahand.in',
      'http://localhost:3000',
      'http://localhost:4000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      console.log(`🔓 CORS: Allowing origin: ${origin}`);
    } else {
      console.log(`🔒 CORS: Blocking origin: ${origin}`);
    }
  }
  
  // Set other CORS headers
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, X-API-Key');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling preflight request for:', origin);
    res.status(204).end();
    return;
  }
  
  next();
});

// Error handling for CORS
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    console.error('❌ CORS Error:', err.message);
    console.error('   Origin:', req.headers.origin);
    console.error('   Method:', req.method);
    console.error('   URL:', req.url);
    
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed by CORS policy',
      origin: req.headers.origin,
      allowedOrigins: ['https://extrahand.in', 'https://www.extrahand.in']
    });
  }
  
  next(err);
});

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization
app.use(mongoSanitize());

// Logging middleware
if (env.NODE_ENV === 'production') {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Production logging to file
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
} else {
  // Development logging to console
  app.use(morgan('dev'));
}

// Enhanced health check
app.get('/api/v1/health', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: require('./package.json').version,
    memory: process.memoryUsage(),
    pid: process.pid,
  };

  try {
    // Check MongoDB connection if configured
    if (env.MONGODB_URI) {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        healthCheck.mongodb = 'disconnected';
        healthCheck.status = 'degraded';
      } else {
        healthCheck.mongodb = 'connected';
      }
    }

    // Check Firebase connection
    try {
      const { auth } = require('./firebase');
      await auth.listUsers(1); // Test Firebase connection
      healthCheck.firebase = 'connected';
    } catch (e) {
      healthCheck.firebase = 'error';
      healthCheck.status = 'degraded';
    }

    res.status(healthCheck.status === 'ok' ? 200 : 503).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API routes
app.use('/api/v1/auth', authRouter);

// Development-only unauthenticated routes
if (env.NODE_ENV === 'development') {
  app.use('/api/v1/dev/tasks', devTasksRouter);
  logger.info('🔓 Development mode: Unauthenticated tasks endpoint enabled at /api/v1/dev/tasks');
}

// Protected routes
app.use('/api/v1', authMiddleware);
app.use('/api/v1/profiles', profilesRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/matches', matchesRouter);
app.use('/api/v1/applications', applicationsRouter);

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const isDevelopment = env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
