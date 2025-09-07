#!/bin/bash

# Production Deployment Script for ExtraHand Backend
# This script ensures proper CORS configuration and environment setup

echo "🚀 Starting ExtraHand Backend Production Deployment..."

# Set production environment
export NODE_ENV=production

# Ensure CORS origins are set
export CORS_ORIGIN="https://extrahand.in,https://www.extrahand.in"

# Log the configuration
echo "📋 Deployment Configuration:"
echo "   NODE_ENV: $NODE_ENV"
echo "   CORS_ORIGIN: $CORS_ORIGIN"
echo "   PORT: ${PORT:-4000}"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Run CORS test
echo "🧪 Testing CORS configuration..."
node test-cors.js

# Start the server
echo "🎯 Starting production server..."
npm start
