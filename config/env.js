const { z } = require('zod');
const fs = require('fs');
const path = require('path');

// Define environment schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).refine(n => n > 0 && n < 65536, 'Port must be between 1-65535').default('4000'),
  
  // MongoDB
  MONGODB_URI: z.string().url('Invalid MongoDB URI').optional(),
  
  // Firebase
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_WEB_API_KEY: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Security
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('1000'), // More lenient for development
  
  // CORS - Centralized configuration
  CORS_ORIGIN: z.string().optional(),
  
  // Health check
  HEALTH_CHECK_PATH: z.string().default('/api/v1/health'),
});

// Centralized CORS configuration
function getCorsConfig(env) {
  const isDevelopment = env.NODE_ENV === 'development';
  
  // Define allowed origins for both development and production
  const allowedOrigins = [
    'https://extrahand.in',
    'https://www.extrahand.in',
    'http://localhost:3000',
    'https://extrahandbackend.llp.trizenventures.com/',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
    'http://127.0.0.1:8080'
  ];
  
  // Add custom origins from environment if provided
  if (env.CORS_ORIGIN) {
    const customOrigins = env.CORS_ORIGIN.split(',').map(origin => origin.trim());
    allowedOrigins.push(...customOrigins);
  }
  
  console.log(`🌐 CORS Configuration - Environment: ${env.NODE_ENV}`);
  console.log(`🌐 CORS Allowed Origins:`, allowedOrigins);
  
  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        console.log('🔓 CORS: Allowing request with no origin');
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        console.log(`🔓 CORS: Allowing origin: ${origin}`);
        callback(null, true);
      } else {
        console.log(`🔒 CORS: Blocking origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials: true,
    optionsSuccessStatus: 204,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
      'X-API-Key'
    ],
    preflightContinue: false,
    // Add explicit CORS headers for better compatibility
    exposedHeaders: ['Content-Length', 'X-Foo'],
    maxAge: 86400 // 24 hours
  };
}

function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    
    // Check for Firebase credentials - either environment variables or service account file
    const hasFirebaseEnvVars = env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY;
    const hasFirebaseServiceAccountPath = env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const hasGoogleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    // Check if serviceAccountKey.json exists in the current directory
    const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
    const hasServiceAccountFile = fs.existsSync(serviceAccountPath);
    
    const hasFirebaseCredentials = hasFirebaseEnvVars || hasFirebaseServiceAccountPath || hasGoogleCredentials || hasServiceAccountFile;
    
    if (!hasFirebaseCredentials && env.NODE_ENV === 'production') {
      throw new Error('Firebase credentials must be provided in production. Either set environment variables or ensure serviceAccountKey.json exists.');
    }
    
    if (hasServiceAccountFile) {
      console.log('✅ Firebase service account file found: serviceAccountKey.json');
    } else if (hasFirebaseEnvVars) {
      console.log('✅ Firebase credentials found in environment variables');
    } else if (hasFirebaseServiceAccountPath) {
      console.log('✅ Firebase service account path specified:', env.FIREBASE_SERVICE_ACCOUNT_PATH);
    } else if (hasGoogleCredentials) {
      console.log('✅ Google Application Credentials found');
    }
    
    return env;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error(`  - ${error.message}`);
    }
    process.exit(1);
  }
}

module.exports = { validateEnv, envSchema, getCorsConfig };
