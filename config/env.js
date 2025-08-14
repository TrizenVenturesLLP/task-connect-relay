const { z } = require('zod');

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
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // CORS
  CORS_ORIGIN: z.string().optional(),
  
  // Health check
  HEALTH_CHECK_PATH: z.string().default('/api/v1/health'),
});

function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    
    // Additional validation for Firebase
    const hasFirebaseCredentials = 
      (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) ||
      env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!hasFirebaseCredentials && env.NODE_ENV === 'production') {
      throw new Error('Firebase credentials must be provided in production');
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

module.exports = { validateEnv, envSchema };
