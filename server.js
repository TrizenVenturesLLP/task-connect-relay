// Load environment variables
require('dotenv').config();

// Load production environment if it exists and we're in production
if (process.env.NODE_ENV === 'production' || process.env.FORCE_PRODUCTION === 'true') {
  require('dotenv').config({ path: './env.production' });
}

// Force production mode for deployed servers
console.log('🔍 Environment Detection - Current values:', {
  NODE_ENV: process.env.NODE_ENV,
  HOSTNAME: process.env.HOSTNAME,
  PORT: process.env.PORT,
  CAPROVER: process.env.CAPROVER,
  DOCKER: process.env.DOCKER,
  PLATFORM: process.platform,
  FORCE_PRODUCTION: process.env.FORCE_PRODUCTION
});

// Check if we're running on a production server
const isProductionServer = process.env.FORCE_PRODUCTION === 'true' ||
                          (process.env.HOSTNAME && 
                           !process.env.HOSTNAME.includes('localhost') && 
                           !process.env.HOSTNAME.includes('127.0.0.1') &&
                           (process.env.HOSTNAME.includes('trizenventures.com') || 
                            process.env.HOSTNAME.includes('extrahand') ||
                            process.env.CAPROVER === 'true' ||
                            process.env.DOCKER === 'true'));

if (isProductionServer) {
  process.env.NODE_ENV = 'production';
  console.log('🚀 FORCING production mode for deployed server');
  console.log('🔍 Production indicators detected:', {
    HOSTNAME: process.env.HOSTNAME,
    PORT: process.env.PORT,
    CAPROVER: process.env.CAPROVER,
    DOCKER: process.env.DOCKER,
    FORCE_PRODUCTION: process.env.FORCE_PRODUCTION
  });
} else if (!process.env.NODE_ENV) {
  // Only set development mode if NODE_ENV is not already set
  process.env.NODE_ENV = 'development';
  console.log('🔧 Setting development mode for local environment');
} else {
  console.log('🔍 NODE_ENV already set to:', process.env.NODE_ENV);
}

console.log('🎯 Final NODE_ENV:', process.env.NODE_ENV);

const app = require('./app');
const { connectMongo } = require('./mongo');
const logger = require('./config/logger');
const { validateEnv } = require('./config/env');

// Validate environment on startup
const env = validateEnv();
const PORT = env.PORT;

let server;
let isShuttingDown = false;

async function start() {
  try {
    // Connect to MongoDB if configured
    if (env.MONGODB_URI) {
      await connectMongo(env.MONGODB_URI);
      logger.info('Connected to MongoDB');
    } else {
      logger.warn('MONGODB_URI not set; running without MongoDB');
    }

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`🚀 Extrahand Backend API listening on port ${PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/api/v1/health`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
      } else {
        logger.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  logger.info(`📴 Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('✅ HTTP server closed');
    });
  }

  try {
    // Close database connections
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('✅ MongoDB connection closed');
    }

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
start().catch((error) => {
  logger.error('💥 Failed to start application:', error);
  process.exit(1);
});
